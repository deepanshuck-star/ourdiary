-- ==============================================================================
-- OurDiary Migration 07: Backfill missing profiles + make create/join robust
-- Version: 20261014000007
-- Accounts created before the signup trigger existed had no profiles row, so
-- inserting into couple_members failed with a foreign-key conflict (HTTP 409).
-- ==============================================================================

INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 1. Create a couple space (idempotent per user).
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

  -- Make sure the caller has a profile row (couple_members.user_id references it).
  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = uid
  ON CONFLICT (id) DO NOTHING;

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

-- 2. Join a couple space with its invite code (idempotent, 2-member limit).
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

  -- Make sure the caller has a profile row (couple_members.user_id references it).
  INSERT INTO public.profiles (id, display_name)
  SELECT u.id, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = uid
  ON CONFLICT (id) DO NOTHING;

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

GRANT EXECUTE ON FUNCTION public.create_couple_space(TEXT, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_by_code(TEXT) TO authenticated;
