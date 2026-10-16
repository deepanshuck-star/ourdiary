-- ==============================================================================
-- OurDiary Migration 12: "Show this locked note on partner's dashboard" toggle
-- Version: 20261014000012
-- A locked (private) note is normally invisible to the partner entirely.
-- This adds an author-controlled flag: when on, the partner can see that a
-- locked note exists (and where), but never its content — content is masked
-- server-side via a view, not just hidden in the UI, so it's real protection,
-- not the passcode illusion we removed in migration 11.
-- ==============================================================================

ALTER TABLE public.memory_notes
  ADD COLUMN IF NOT EXISTS visible_when_locked BOOLEAN NOT NULL DEFAULT false;

-- Let the couple member see the row (not just the author) when the author
-- opted in, in addition to the existing shared/author-only cases.
DROP POLICY IF EXISTS "Notes select policy" ON public.memory_notes;

CREATE POLICY "Notes select policy"
  ON public.memory_notes
  FOR SELECT
  TO authenticated
  USING (
    (visibility = 'shared' AND public.can_access_memory(memory_id))
    OR (visibility = 'private' AND author_id = auth.uid())
    OR (visibility = 'private' AND visible_when_locked = true AND public.can_access_memory(memory_id))
  );

-- Masking view: the client reads notes through this, never the raw table,
-- so a locked note's content is NULL for everyone but its author — the
-- partner only ever learns the note exists, never what it says.
CREATE OR REPLACE VIEW public.memory_notes_feed
WITH (security_invoker = true) AS
SELECT
  id,
  memory_id,
  author_id,
  visibility,
  visible_when_locked,
  CASE
    WHEN visibility = 'private' AND author_id <> auth.uid() THEN NULL
    ELSE content
  END AS content,
  created_at
FROM public.memory_notes;

GRANT SELECT ON public.memory_notes_feed TO authenticated;
