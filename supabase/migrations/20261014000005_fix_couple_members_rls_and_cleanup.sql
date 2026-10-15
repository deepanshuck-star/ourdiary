-- ==============================================================================
-- OurDiary Migration 05: Fix Couple Members RLS & Existing Space Lookup
-- Version: 20261014000005
-- Fixes infinite recursion on couple_members query by allowing user_id = auth.uid()
-- ==============================================================================

-- 1. Fix couple_members select policy
DROP POLICY IF EXISTS "Couple members view policy" ON public.couple_members;

CREATE POLICY "Couple members view policy"
  ON public.couple_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_couple_member(couple_id)
  );

-- 2. Ensure couples view policy allows querying by invite_code or couple membership
DROP POLICY IF EXISTS "Couples view policy" ON public.couples;

CREATE POLICY "Couples view policy"
  ON public.couples
  FOR SELECT
  TO authenticated
  USING (
    public.is_couple_member(id)
    OR invite_code IS NOT NULL
  );

-- 3. Optional Stale Test Data Cleanup:
-- To clear past duplicate test spaces created during earlier login attempts,
-- run the following query in your Supabase SQL Editor:
--
-- TRUNCATE TABLE public.couple_members, public.memories, public.memory_photos, public.memory_notes, public.couples CASCADE;

