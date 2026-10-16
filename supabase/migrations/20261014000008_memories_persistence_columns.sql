-- ==============================================================================
-- OurDiary Migration 08: Memory persistence columns
-- Version: 20261014000008
-- The app previously never saved memories to the database (client state /
-- localStorage only), so logging out cleared them. This adds the columns the
-- client's Memory type needs so memories can be stored and read back from
-- Supabase, and keeps RLS as-is (migration 02 already covers these tables).
-- ==============================================================================

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS perspective_user1 TEXT,
  ADD COLUMN IF NOT EXISTS perspective_user2 TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
