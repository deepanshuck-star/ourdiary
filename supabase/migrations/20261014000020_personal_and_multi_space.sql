-- ==============================================================================
-- OurDiary Migration 20: personal diaries, and more than one space per account
-- Version: 20261014000020
--
-- Two product changes need the same schema change:
--
--   * a diary for one person ("Dear Diary"), alongside the couple diary;
--   * one account holding both, plus the ability to start another couple
--     space later.
--
-- Today neither is possible, and not by accident — the schema actively
-- prevents it in three places:
--
--   1. create_couple_space() returns the caller's EXISTING space instead of
--      making a second one ("Never create a second space for a user who
--      already has one").
--   2. join_couple_by_code() refuses with "You already belong to a different
--      couple space".
--   3. Eight functions across migrations 6, 7, 18 and 19 resolve "my couple"
--      as `ORDER BY cm.created_at ASC LIMIT 1` — the caller's OLDEST
--      membership. With one space that is correct. With two it silently
--      operates on the wrong one, which is the dangerous kind of wrong: a
--      game move or an invite-code rotation landing in the other diary with
--      no error anywhere.
--
-- So (3) is the real work here. Every one of those functions is re-created
-- taking an explicit p_couple_id and verifying membership, and the old
-- signatures are dropped rather than left as overloads — an ambiguous call
-- resolving to the implicit-space version is exactly the bug this removes.
--
-- A personal space is an ordinary couples row with kind = 'personal' and one
-- member. That is deliberate: it means every table, index and RLS policy in
-- the app already works for it, there is no parallel schema to keep in step,
-- and "invite your partner into this diary" is a member joining rather than
-- a data migration.
-- ==============================================================================

-- 1. What kind of diary is this? -----------------------------------------
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'couple';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'couples_kind_check'
  ) THEN
    ALTER TABLE public.couples
      ADD CONSTRAINT couples_kind_check CHECK (kind IN ('personal', 'couple'));
  END IF;
END
$$;

COMMENT ON COLUMN public.couples.kind IS
  'personal = a diary for one; couple = a shared space. A personal diary flips to couple when someone joins it, and stays couple afterwards even if they later leave — the invite was the statement of intent.';


-- 2. Membership helper ----------------------------------------------------
/**
 * Raises unless the caller is a member of the given space. Every re-created
 * function below starts with this, which is what replaces the old implicit
 * "whichever space you joined first".
 */
CREATE OR REPLACE FUNCTION public.assert_space_member(p_couple_id UUID)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_couple_id IS NULL THEN
    RAISE EXCEPTION 'No diary was specified';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = p_couple_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'That diary is not yours';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. Every space the caller belongs to ------------------------------------
/**
 * Replaces get_my_couple() as the thing the app calls on sign-in. Ordered
 * oldest first so the default pick is stable between sessions.
 *
 * get_my_couple() is left in place: it still answers correctly for the many
 * accounts that have exactly one space, and dropping it would break any
 * client still deployed against it.
 */
CREATE OR REPLACE FUNCTION public.get_my_spaces()
RETURNS SETOF public.couples AS $$
  SELECT c.*
  FROM public.couples c
  JOIN public.couple_members cm ON cm.couple_id = c.id
  WHERE cm.user_id = auth.uid()
  ORDER BY cm.created_at ASC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;


-- 4. Create a space of either kind ----------------------------------------
/** Guards against an account filling the table with empty diaries. */
CREATE OR REPLACE FUNCTION public.create_space(
  p_name TEXT,
  p_start_date DATE,
  p_theme TEXT DEFAULT 'candy',
  p_kind TEXT DEFAULT 'couple'
)
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  result public.couples;
  new_code TEXT;
  space_count INT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_kind NOT IN ('personal', 'couple') THEN
    RAISE EXCEPTION 'Unknown diary kind';
  END IF;

  -- One personal diary is the whole idea of a personal diary.
  IF p_kind = 'personal' AND EXISTS (
    SELECT 1 FROM public.couples c
    JOIN public.couple_members cm ON cm.couple_id = c.id
    WHERE cm.user_id = uid AND c.kind = 'personal'
  ) THEN
    SELECT c.* INTO result
    FROM public.couples c
    JOIN public.couple_members cm ON cm.couple_id = c.id
    WHERE cm.user_id = uid AND c.kind = 'personal'
    ORDER BY cm.created_at ASC
    LIMIT 1;
    RETURN result;
  END IF;

  SELECT COUNT(*) INTO space_count
  FROM public.couple_members WHERE user_id = uid;

  IF space_count >= 10 THEN
    RAISE EXCEPTION 'That is a lot of diaries. Leave one before starting another.';
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
  END LOOP;

  INSERT INTO public.couples (name, relationship_start_date, anniversary_date, theme, invite_code, kind)
  VALUES (
    COALESCE(NULLIF(trim(p_name), ''), 'My diary'),
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_theme, 'candy'),
    new_code,
    p_kind
  )
  RETURNING * INTO result;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (result.id, uid, 'creator');

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 5. Joining, now that one account may hold several spaces -----------------
/**
 * The "you already belong to a different couple space" refusal is gone: it
 * was the rule that made one account mean one diary.
 *
 * Joining a personal diary converts it — that is how "invite your partner
 * into the diary you already keep" works, with every entry already in it.
 * The two-member cap stays; a space is still for at most two people.
 */
CREATE OR REPLACE FUNCTION public.join_couple_by_code(code TEXT)
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  target public.couples;
  member_count INT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO target
  FROM public.couples
  WHERE upper(invite_code) = upper(trim(code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = target.id AND user_id = uid
  ) THEN
    RETURN target;
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM public.couple_members
  WHERE couple_id = target.id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'A couple space is strictly limited to exactly two partners.';
  END IF;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (target.id, uid, 'partner');

  IF target.kind = 'personal' THEN
    UPDATE public.couples SET kind = 'couple' WHERE id = target.id
    RETURNING * INTO target;
  END IF;

  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. Owner controls, against a named space --------------------------------
DROP FUNCTION IF EXISTS public.regenerate_invite_code();
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(p_couple_id UUID)
RETURNS public.couples AS $$
DECLARE
  target public.couples;
  new_code TEXT;
BEGIN
  PERFORM public.assert_space_member(p_couple_id);

  IF NOT public.is_couple_creator(p_couple_id) THEN
    RAISE EXCEPTION 'Only the person who created this space can change its invite code.';
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
  END LOOP;

  UPDATE public.couples SET invite_code = new_code WHERE id = p_couple_id
  RETURNING * INTO target;

  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


DROP FUNCTION IF EXISTS public.remove_partner(BOOLEAN);
CREATE OR REPLACE FUNCTION public.remove_partner(
  p_couple_id UUID,
  p_rotate_code BOOLEAN DEFAULT true
)
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  target public.couples;
  new_code TEXT;
BEGIN
  PERFORM public.assert_space_member(p_couple_id);

  IF NOT public.is_couple_creator(p_couple_id) THEN
    RAISE EXCEPTION 'Only the person who created this space can remove a partner.';
  END IF;

  DELETE FROM public.couple_members
  WHERE couple_id = p_couple_id AND user_id <> uid;

  IF p_rotate_code THEN
    LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
    END LOOP;
    UPDATE public.couples SET invite_code = new_code WHERE id = p_couple_id;
  END IF;

  -- `kind` is deliberately NOT reverted to 'personal'. Inviting someone was
  -- a decision about what this diary is; a space briefly down to one member
  -- is waiting for a partner, not a personal diary.
  SELECT * INTO target FROM public.couples WHERE id = p_couple_id;
  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


/** Leave a space you did not create, without the creator having to act. */
CREATE OR REPLACE FUNCTION public.leave_space(p_couple_id UUID)
RETURNS VOID AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  PERFORM public.assert_space_member(p_couple_id);

  IF public.is_couple_creator(p_couple_id) THEN
    RAISE EXCEPTION 'You created this diary — remove your partner instead, or delete the space.';
  END IF;

  DELETE FROM public.couple_members
  WHERE couple_id = p_couple_id AND user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 7. Game sessions, against a named space ---------------------------------
-- Same bodies as migration 19, with the implicit "oldest membership" lookup
-- replaced by the caller naming the space. The version and turn checks that
-- migration 19 exists for are untouched.

DROP FUNCTION IF EXISTS public.start_game_session(TEXT, JSONB, UUID);
CREATE OR REPLACE FUNCTION public.start_game_session(
  p_couple_id UUID,
  p_game_key TEXT,
  p_state JSONB,
  p_turn_user_id UUID DEFAULT NULL
)
RETURNS public.game_sessions AS $$
DECLARE
  uid UUID := auth.uid();
  result public.game_sessions;
BEGIN
  PERFORM public.assert_space_member(p_couple_id);

  INSERT INTO public.game_sessions (couple_id, game_key, state, turn_user_id, status, updated_by)
  VALUES (p_couple_id, p_game_key, COALESCE(p_state, '{}'::jsonb), p_turn_user_id, 'active', uid)
  ON CONFLICT (couple_id, game_key) DO UPDATE
    SET state = COALESCE(p_state, '{}'::jsonb),
        turn_user_id = p_turn_user_id,
        status = 'active',
        version = public.game_sessions.version + 1,
        updated_by = uid,
        updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


DROP FUNCTION IF EXISTS public.apply_game_move(TEXT, JSONB, INTEGER, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.apply_game_move(
  p_couple_id UUID,
  p_game_key TEXT,
  p_state JSONB,
  p_expected_version INTEGER,
  p_next_turn_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS public.game_sessions AS $$
DECLARE
  uid UUID := auth.uid();
  current public.game_sessions;
  result public.game_sessions;
BEGIN
  PERFORM public.assert_space_member(p_couple_id);

  IF p_status NOT IN ('active', 'finished') THEN
    RAISE EXCEPTION 'Unknown game status';
  END IF;

  SELECT * INTO current
  FROM public.game_sessions
  WHERE couple_id = p_couple_id AND game_key = p_game_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That game has not been started yet';
  END IF;

  IF current.turn_user_id IS NOT NULL AND current.turn_user_id <> uid THEN
    RAISE EXCEPTION 'It is not your turn';
  END IF;

  IF current.version <> p_expected_version THEN
    RAISE EXCEPTION 'This game moved on while you were deciding — reloading the board';
  END IF;

  UPDATE public.game_sessions
  SET state = COALESCE(p_state, '{}'::jsonb),
      turn_user_id = p_next_turn_user_id,
      status = p_status,
      version = version + 1,
      updated_by = uid,
      updated_at = now()
  WHERE id = current.id
  RETURNING * INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


DROP FUNCTION IF EXISTS public.end_game_session(TEXT);
CREATE OR REPLACE FUNCTION public.end_game_session(p_couple_id UUID, p_game_key TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM public.assert_space_member(p_couple_id);
  DELETE FROM public.game_sessions WHERE couple_id = p_couple_id AND game_key = p_game_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 8. Grants ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.assert_space_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_spaces() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_space(TEXT, DATE, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_space(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_invite_code(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_partner(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_game_session(UUID, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_game_move(UUID, TEXT, JSONB, INTEGER, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_game_session(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assert_space_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_spaces() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_space(TEXT, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_space(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_partner(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_game_session(UUID, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_game_move(UUID, TEXT, JSONB, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_game_session(UUID, TEXT) TO authenticated;
