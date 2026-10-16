-- ==============================================================================
-- OurDiary Migration 10: Let a couple member fetch a passcode-locked note
-- Version: 20261014000010
-- The "secret passcode note" feature intends for the author to lock a
-- private note and share the passcode with their partner so the partner can
-- unlock and read it. The original RLS policy (visibility='private' AND
-- author_id=auth.uid()) only let the author ever fetch the row at all, so a
-- real partner account could never even see the locked card. A truly
-- private note (private, no passcode) stays author-only.
-- ==============================================================================

DROP POLICY IF EXISTS "Notes select policy" ON public.memory_notes;

CREATE POLICY "Notes select policy"
  ON public.memory_notes
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'shared' AND public.can_access_memory(memory_id))
    OR (visibility = 'private' AND author_id = auth.uid())
    OR (visibility = 'private' AND passcode IS NOT NULL AND public.can_access_memory(memory_id))
  );
