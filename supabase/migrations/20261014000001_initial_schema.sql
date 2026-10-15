-- ==============================================================================
-- OurDiary Migration 01: Initial Database Schema
-- Version: 20261014000001
-- Tables: profiles, couples, couple_members, memories, memory_media,
--         memory_notes, memory_reactions, events, letters, bucket_items
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
-- Connected to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Automatic trigger to create profile upon new Supabase auth sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_public_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_public_id'
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. COUPLES TABLE
-- Represents the shared space for exactly two partners
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  relationship_start_date DATE NOT NULL,
  anniversary_date DATE,
  theme TEXT DEFAULT 'candy' NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- 3. COUPLE MEMBERS TABLE
-- Maps auth users to couples (enforcing exactly 2 users per couple)
CREATE TABLE IF NOT EXISTS public.couple_members (
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'partner' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (couple_id, user_id)
);

-- Enforce exactly 2 partners per couple via database trigger
CREATE OR REPLACE FUNCTION public.check_couple_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  member_count INT;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM public.couple_members
  WHERE couple_id = NEW.couple_id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'A couple space is strictly limited to exactly two partners.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_max_two_members ON public.couple_members;
CREATE TRIGGER enforce_max_two_members
  BEFORE INSERT ON public.couple_members
  FOR EACH ROW EXECUTE FUNCTION public.check_couple_member_limit();


-- 4. MEMORIES TABLE
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  memory_date DATE NOT NULL,
  title TEXT NOT NULL,
  story TEXT,
  mood TEXT,
  category TEXT,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_couple_date ON public.memories(couple_id, memory_date DESC);


-- 5. MEMORY MEDIA TABLE (Cloudinary references)
CREATE TABLE IF NOT EXISTS public.memory_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_asset_id TEXT,
  resource_type TEXT DEFAULT 'image' NOT NULL,
  delivery_type TEXT DEFAULT 'authenticated' NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_media_memory_id ON public.memory_media(memory_id);


-- 6. MEMORY NOTES TABLE (Shared vs Private Notes)
CREATE TABLE IF NOT EXISTS public.memory_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('shared', 'private')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_notes_memory_author ON public.memory_notes(memory_id, author_id, visibility);


-- 7. MEMORY REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.memory_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(memory_id, user_id, emoji)
);


-- 8. EVENTS TABLE (Calendar & Anniversaries)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  category TEXT,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_couple_date ON public.events(couple_id, event_date);


-- 9. LETTERS TABLE (Wax-Sealed Time Capsules)
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sealed' NOT NULL CHECK (status IN ('draft', 'sealed', 'opened')),
  unlock_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_letters_couple_unlock ON public.letters(couple_id, unlock_at);


-- 10. BUCKET ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.bucket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  is_completed BOOLEAN DEFAULT false NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bucket_items_couple ON public.bucket_items(couple_id);
