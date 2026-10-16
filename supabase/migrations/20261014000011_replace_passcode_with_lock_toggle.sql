-- ==============================================================================
-- OurDiary Migration 11: Replace passcode-locked notes with a lock/unlock toggle
-- Version: 20261014000011
-- Passcode "security" was cosmetic: the passcode and content were sent to the
-- browser and checked client-side, so a locked note was never actually
-- protected from anyone who opened dev tools. Replaced with a plain
-- lock/unlock toggle on visibility, which IS enforced server-side: a
-- 'private' (locked) note is simply never sent to anyone but its author.
-- The author can flip it back to 'shared' (unlocked) at any time.
-- ==============================================================================

-- Restore the plain, no-passcode-bypass select policy from migration 02/04
-- (migration 10's passcode exception no longer applies — passcode is gone).
DROP POLICY IF EXISTS "Notes select policy" ON public.memory_notes;

CREATE POLICY "Notes select policy"
  ON public.memory_notes
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'shared' AND public.can_access_memory(memory_id))
    OR (visibility = 'private' AND author_id = auth.uid())
  );

ALTER TABLE public.memory_notes
  DROP COLUMN IF EXISTS passcode,
  DROP COLUMN IF EXISTS is_locked;
