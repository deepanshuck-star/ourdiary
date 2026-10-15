-- ==============================================================================
-- OurDiary Migration 04: Couple Invite Code Join Fix
-- Version: 20261014000004
-- Allows authenticated users to find couples by invite_code before joining,
-- while maintaining full row-level security for memories and letters.
-- ==============================================================================

-- 1. Update Couples View Policy to allow looking up by invite_code
DROP POLICY IF EXISTS "Couples view policy" ON public.couples;

CREATE POLICY "Couples view policy"
  ON public.couples
  FOR SELECT
  TO authenticated
  USING (
    public.is_couple_member(id)
    OR invite_code IS NOT NULL
  );

-- 2. Allow creator to insert themselves into couple_members upon creation
DROP POLICY IF EXISTS "Couple members join policy" ON public.couple_members;

CREATE POLICY "Couple members join policy"
  ON public.couple_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
