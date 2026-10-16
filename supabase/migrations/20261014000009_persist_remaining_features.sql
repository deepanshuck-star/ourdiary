-- ==============================================================================
-- OurDiary Migration 09: Persist events, letters, bucket list, notes, photos,
-- love coupons, spin wheel options, and daily spark answers
-- Version: 20261014000009
-- These were previously stored only in browser localStorage and lost on
-- logout. Ephemeral, low-stakes state (heartbeat pings, warm hugs, mood
-- beacons, soundtrack playback) is deliberately left local-only.
-- ==============================================================================

-- 1. Existing tables: add the columns the client needs.
ALTER TABLE public.memory_notes
  ADD COLUMN IF NOT EXISTS passcode TEXT,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.bucket_items
  ADD COLUMN IF NOT EXISTS memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS target_date DATE;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL;

ALTER TABLE public.letters
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS envelope_color TEXT;


-- 2. Memory photos (plain image URLs added from the Memories UI — distinct
--    from memory_media, which tracks signed Cloudinary uploads).
CREATE TABLE IF NOT EXISTS public.memory_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memory_photos_memory_id ON public.memory_photos(memory_id);

ALTER TABLE public.memory_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Memory photos select policy" ON public.memory_photos
  FOR SELECT TO authenticated USING (public.can_access_memory(memory_id));
CREATE POLICY "Memory photos insert policy" ON public.memory_photos
  FOR INSERT TO authenticated WITH CHECK (public.can_access_memory(memory_id));
CREATE POLICY "Memory photos delete policy" ON public.memory_photos
  FOR DELETE TO authenticated USING (public.can_access_memory(memory_id));


-- 3. Love coupons
CREATE TABLE IF NOT EXISTS public.love_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  from_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_user UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_love_coupons_couple ON public.love_coupons(couple_id);

ALTER TABLE public.love_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Love coupons select policy" ON public.love_coupons
  FOR SELECT TO authenticated USING (public.is_couple_member(couple_id));
CREATE POLICY "Love coupons insert policy" ON public.love_coupons
  FOR INSERT TO authenticated WITH CHECK (public.is_couple_member(couple_id));
CREATE POLICY "Love coupons update policy" ON public.love_coupons
  FOR UPDATE TO authenticated USING (public.is_couple_member(couple_id));
CREATE POLICY "Love coupons delete policy" ON public.love_coupons
  FOR DELETE TO authenticated USING (public.is_couple_member(couple_id));


-- 4. Spin wheel options
CREATE TABLE IF NOT EXISTS public.spin_wheel_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'activity')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spin_wheel_options_couple ON public.spin_wheel_options(couple_id);

ALTER TABLE public.spin_wheel_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spin wheel options select policy" ON public.spin_wheel_options
  FOR SELECT TO authenticated USING (public.is_couple_member(couple_id));
CREATE POLICY "Spin wheel options insert policy" ON public.spin_wheel_options
  FOR INSERT TO authenticated WITH CHECK (public.is_couple_member(couple_id));
CREATE POLICY "Spin wheel options delete policy" ON public.spin_wheel_options
  FOR DELETE TO authenticated USING (public.is_couple_member(couple_id));


-- 5. Daily spark answers
CREATE TABLE IF NOT EXISTS public.daily_spark_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (couple_id, question_id, answer_date, user_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_spark_couple_date ON public.daily_spark_answers(couple_id, answer_date);

ALTER TABLE public.daily_spark_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily spark select policy" ON public.daily_spark_answers
  FOR SELECT TO authenticated USING (public.is_couple_member(couple_id));
CREATE POLICY "Daily spark insert policy" ON public.daily_spark_answers
  FOR INSERT TO authenticated WITH CHECK (public.is_couple_member(couple_id) AND user_id = auth.uid());
CREATE POLICY "Daily spark update policy" ON public.daily_spark_answers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
