-- ==============================================================================
-- OurDiary Migration 13: Couple photo + individual profile photos
-- Version: 20261014000013
-- Avatars were local-only before this (not even saved to the database).
-- Adds a column for each partner's uploaded photo and one shared "couple
-- photo" (both partners together), shown top-left in the navbar.
-- ==============================================================================

ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
