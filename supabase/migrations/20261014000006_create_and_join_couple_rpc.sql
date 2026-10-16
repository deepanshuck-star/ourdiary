-- ==============================================================================
-- OurDiary Migration 06: Atomic create / join couple RPCs
-- Version: 20261014000006
-- Fixes:
--   * Partner could not join with an invite code (RLS blocked the lookup /
--     membership insert). Joining now goes through a SECURITY DEFINER RPC.
--   * Re-login created duplicate couple spaces. create_couple_space() is
--     idempotent: a user who already belongs to a couple gets that couple back.
--   * Removes the over-permissive "invite_code IS NOT NULL" SELECT policy that
--     exposed every couple row to every authenticated user.
-- ==============================================================================

-- 1. Couples are visible only to their members (no recursion: is_couple_member
--    is SECURITY DEFINER).
DROP POLICY IF EXISTS "Couples view policy" ON public.couples;
CREATE POLICY "Couples view policy"
  ON public.couples
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(id));

-- 2. Membership rows: a user can always read their own row; direct inserts are
--    replaced by the RPCs below.
DROP POLICY IF EXISTS "Couple members view policy" ON public.couple_members;
CREATE POLICY "Couple members view policy"
  ON public.couple_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_couple_member(couple_id));

-- Direct inserts are removed: membership is only created by the SECURITY DEFINER
-- RPCs below, so nobody can attach themselves to a couple by guessing its UUID.
DROP POLICY IF EXISTS "Couple members join policy" ON public.couple_members;

-- 3. Return the caller's existing couple (oldest membership), if any.
CREATE OR REPLACE FUNCTION public.get_my_couple()
RETURNS SETOF public.couples AS $$
  SELECT c.*
  FROM public.couples c
  JOIN public.couple_members cm ON cm.couple_id = c.id
  WHERE cm.user_id = auth.uid()
  ORDER BY cm.created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 4. Create a couple space (idempotent per user).
CREATE OR REPLACE FUNCTION public.create_couple_space(
  p_name TEXT,
  p_start_date DATE,
  p_theme TEXT DEFAULT 'candy'
)
RETURNS public.couples AS $$
DECLARE
  uid UUID := auth.uid();
  result public.couples;
  new_code TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Never create a second space for a user who already has one.
  SELECT c.* INTO result
  FROM public.couples c
  JOIN public.couple_members cm ON cm.couple_id = c.id
  WHERE cm.user_id = uid
  ORDER BY cm.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN result;
  END IF;

  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code);
  END LOOP;

  INSERT INTO public.couples (name, relationship_start_date, anniversary_date, theme, invite_code)
  VALUES (
    COALESCE(NULLIF(trim(p_name), ''), 'Our Couple Space'),
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_start_date, CURRENT_DATE),
    COALESCE(p_theme, 'candy'),
    new_code
  )
  RETURNING * INTO result;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (result.id, uid, 'creator');

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Join a couple space with its invite code (idempotent, 2-member limit).
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

  -- Already a member of this space: just return it.
  IF EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = target.id AND user_id = uid
  ) THEN
    RETURN target;
  END IF;

  IF EXISTS (SELECT 1 FROM public.couple_members WHERE user_id = uid) THEN
    RAISE EXCEPTION 'You already belong to a different couple space';
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM public.couple_members
  WHERE couple_id = target.id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'A couple space is strictly limited to exactly two partners.';
  END IF;

  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES (target.id, uid, 'partner');

  RETURN target;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_my_couple() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_couple_space(TEXT, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_couple_by_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_couple() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_space(TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_by_code(TEXT) TO authenticated;
