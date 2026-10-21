-- ==============================================================================
-- OurDiary Migration 17: Bad habits + gifts wardrobe
-- Version: 20261014000017
--
-- Both are shared lists each partner writes to, so they get real rows rather
-- than a `feature_state` JSON blob. Migration 14 flags the blob's limitation
-- itself: the later write wins and the other device's entry is lost. For a
-- throwaway toggle that's fine; for a record of every gift you've been given
-- it is not.
--
-- 1. bad_habits — a playful list. `about_user_id` is whose habit it is,
--    `created_by` is who logged it, so "you leave mugs everywhere" is
--    attributable. Forgiven ones stay on the record rather than being
--    deleted, which is the point of the feature.
--
-- 2. gifts — who gave what to whom, with an optional photo. The same row
--    answers both "what have I been given" and "what have I given", read
--    from either direction, so there is nothing to keep in sync.
-- ==============================================================================

-- --------------------------------------------------------------- Habits ---
CREATE TABLE IF NOT EXISTS public.bad_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  -- Whose habit this is. Either partner, so you can own up to your own.
  about_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  -- 1 mildly annoying · 2 genuinely annoying · 3 we need to talk
  severity SMALLINT NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
  forgiven BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bad_habits_couple ON public.bad_habits(couple_id, created_at DESC);

ALTER TABLE public.bad_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bad habits select policy"
  ON public.bad_habits
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Bad habits insert policy"
  ON public.bad_habits
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id) AND created_by = auth.uid());

-- Either partner may edit or forgive: the accused needs to be able to mark
-- "fine, I've stopped" without asking the accuser to do it for them.
CREATE POLICY "Bad habits update policy"
  ON public.bad_habits
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

-- Deleting is the author's call — you can withdraw what you wrote, you
-- can't erase what your partner said about you.
CREATE POLICY "Bad habits delete policy"
  ON public.bad_habits
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());


-- ---------------------------------------------------------------- Gifts ---
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  occasion TEXT,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  photo_url TEXT,
  photo_public_id TEXT,
  given_on DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- A gift has a giver and a receiver; the same person is neither.
  CONSTRAINT gifts_distinct_parties CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_gifts_couple ON public.gifts(couple_id, given_on DESC NULLS LAST, created_at DESC);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gifts select policy"
  ON public.gifts
  FOR SELECT
  TO authenticated
  USING (public.is_couple_member(couple_id));

CREATE POLICY "Gifts insert policy"
  ON public.gifts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_couple_member(couple_id) AND created_by = auth.uid());

-- Either partner may correct a gift's details — the receiver often knows
-- the occasion better than whoever typed it in.
CREATE POLICY "Gifts update policy"
  ON public.gifts
  FOR UPDATE
  TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

CREATE POLICY "Gifts delete policy"
  ON public.gifts
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
