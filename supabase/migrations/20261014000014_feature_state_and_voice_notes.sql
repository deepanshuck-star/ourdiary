-- ==============================================================================
-- OurDiary Migration 14: Generic synced feature state + voice notes
-- Version: 20261014000014
-- Backs the "additional features" branch (streaks/mood history, quizzes,
-- date ideas, countdowns, budget, surprise notes, voice notes) with real
-- cross-device storage. These features previously lived only in this
-- device's localStorage/IndexedDB, so a partner on a different phone never
-- saw any of it.
--
-- Design: one generic `feature_state` table holding a JSON blob per
-- (couple, feature key, optional owner). This mirrors the existing
-- `useLocalState(key, fallback)` pattern 1:1 — each local-storage key
-- becomes a `feature_key` — so no page's component code needs to change,
-- only the sync layer underneath it (src/lib/local-store.ts).
--
-- Known limitation: a feature_key is a single JSON blob, not individual
-- rows like memories/events. If both partners edit the same blob (e.g. the
-- budget) on two devices within moments of each other, the later write
-- wins and the earlier device's unsynced edit can be lost. This is an
-- accepted simplification, not a bug — true conflict-free sync would need
-- per-item rows, same as memories/events already have.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.feature_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  -- NULL = shared blob (either partner may write it, e.g. budget, surprise
  -- notes). NOT NULL = owned by that partner only (e.g. their own quiz
  -- progress) — RLS restricts writes to author_id = auth.uid().
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- A shared blob is unique per (couple, feature_key); an owned blob is
-- unique per (couple, feature_key, owner). Partial indexes because a plain
-- UNIQUE constraint treats every NULL as distinct, which would allow
-- unlimited duplicate "shared" rows.
CREATE UNIQUE INDEX IF NOT EXISTS feature_state_shared_uidx
  ON public.feature_state (couple_id, feature_key)
  WHERE owner_user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS feature_state_owned_uidx
  ON public.feature_state (couple_id, feature_key, owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_state_couple ON public.feature_state(couple_id);

ALTER TABLE public.feature_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature state select policy"
  ON public.feature_state
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Feature state insert policy"
  ON public.feature_state
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );

CREATE POLICY "Feature state update policy"
  ON public.feature_state
  FOR UPDATE
  TO authenticated
  USING (
    public.is_couple_member(couple_id)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_couple_member(couple_id)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );

CREATE POLICY "Feature state delete policy"
  ON public.feature_state
  FOR DELETE
  TO authenticated
  USING (
    public.is_couple_member(couple_id)
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );


-- Voice notes: real audio files (uploaded via the same signed Cloudinary
-- flow memory photos already use), replacing device-only IndexedDB storage.
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  duration_sec NUMERIC NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_voice_notes_memory_id ON public.voice_notes(memory_id);

ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice notes select policy" ON public.voice_notes
  FOR SELECT TO authenticated USING (public.can_access_memory(memory_id));
CREATE POLICY "Voice notes insert policy" ON public.voice_notes
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_memory(memory_id) AND author_id = auth.uid()
  );
CREATE POLICY "Voice notes delete policy" ON public.voice_notes
  FOR DELETE TO authenticated USING (author_id = auth.uid());
