-- ==============================================================================
-- OurDiary Migration 18: space owner controls
-- Version: 20261014000018
--
-- Fixes three things that let a stranger end up occupying a couple space,
-- and left the owner with no way to get them out.
--
-- 1. Anyone in the space could change the invite code. The couples UPDATE
--    policy is `is_couple_member(id)`, which it has to be — both partners
--    edit the name, theme, dates and photo. RLS can't restrict a single
--    column, so a trigger does: changing invite_code requires being the
--    creator, everything else is unchanged.
--
-- 2. The client rotated the code with a plain UPDATE and never checked the
--    result (supabase-js returns `{ error }` rather than throwing, so the
--    catch block was dead code). It then reported success either way, so a
--    rejected write left the screen showing a code the database had never
--    heard of. regenerate_invite_code() replaces it: it returns the code it
--    actually stored, and raises if it couldn't.
--
-- 3. There was no way to remove a partner. The couple_members DELETE policy
--    is `user_id = auth.uid()` — you can leave, but the owner can't evict.
--    remove_partner() lets the creator reclaim the second seat.
--
--    It rotates the invite code by default, and that default matters: a
--    removed partner still knows the old code, and the seat they were just
--    removed from is now free. Without a new code they can walk straight
--    back in.
-- ==============================================================================

/** Is the caller the person who created this space? */
CREATE OR REPLACE FUNCTION public.is_couple_creator(p_couple_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = p_couple_id
      AND user_id = auth.uid()
      AND role = 'creator'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.is_couple_creator(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_couple_creator(UUID) TO authenticated;


-- 1. Only the creator may change the invite code -------------------------
-- A column-level rule the UPDATE policy can't express. auth.uid() is still
-- the real caller inside the SECURITY DEFINER RPC below, so the creator
-- passes and the partner is refused either way they try.
CREATE OR REPLACE FUNCTION public.guard_invite_code_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS DISTINCT FROM OLD.invite_code THEN
    IF NOT public.is_couple_creator(OLD.id) THEN
      RAISE EXCEPTION 'Only the person who created this space can change its invite code.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_invite_code_owner ON public.couples;
CREATE TRIGGER enforce_invite_code_owner
  BEFORE UPDATE ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.guard_invite_code_change();


-- 2. Rotate the invite code ----------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_invite_code()
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  target public.couples;
  new_code TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.* INTO target
  FROM public.couples c
  JOIN public.couple_members cm ON cm.couple_id = c.id
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in a couple space';
  END IF;

  IF NOT public.is_couple_creator(target.id) THEN
    RAISE EXCEPTION 'Only the person who created this space can change its invite code.';
  END IF;

  -- invite_code is UNIQUE across every couple, so retry until the generated
  -- one is free rather than letting a collision surface as a failed update.
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
  END LOOP;

  UPDATE public.couples SET invite_code = new_code WHERE id = target.id
  RETURNING * INTO target;

  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 3. Remove the partner ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_partner(p_rotate_code BOOLEAN DEFAULT true)
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  target public.couples;
  removed INT;
  new_code TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT c.* INTO target
  FROM public.couples c
  JOIN public.couple_members cm ON cm.couple_id = c.id
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in a couple space';
  END IF;

  IF NOT public.is_couple_creator(target.id) THEN
    RAISE EXCEPTION 'Only the person who created this space can remove a partner.';
  END IF;

  -- Everyone in the space who isn't the caller. Their memories, notes and
  -- gifts stay: those are keyed to the couple, not to the membership, so
  -- this revokes access without destroying shared history.
  DELETE FROM public.couple_members
  WHERE couple_id = target.id AND user_id <> uid;
  GET DIAGNOSTICS removed = ROW_COUNT;

  IF removed = 0 THEN
    RAISE EXCEPTION 'There is nobody else in this space to remove.';
  END IF;

  IF p_rotate_code THEN
    LOOP
      new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
    END LOOP;
    UPDATE public.couples SET invite_code = new_code WHERE id = target.id
    RETURNING * INTO target;
  END IF;

  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


REVOKE ALL ON FUNCTION public.regenerate_invite_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_partner(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_partner(BOOLEAN) TO authenticated;
