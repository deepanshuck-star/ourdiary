-- ==============================================================================
-- OurDiary Migration 21: make feature_state upserts actually land
-- Version: 20261030000021
--
-- Every synced feature — mood history, budget, trips, photo of the day,
-- long-distance, quizzes, and now the little world's avatars — saves with
-- an upsert. None of them have been reaching the server.
--
-- Migration 14 made the two uniqueness rules PARTIAL indexes:
--
--   (couple_id, feature_key)                 WHERE owner_user_id IS NULL
--   (couple_id, feature_key, owner_user_id)  WHERE owner_user_id IS NOT NULL
--
-- That was a reasonable way to stop a plain UNIQUE from treating every NULL
-- owner as distinct. But Postgres can only use a partial index to resolve
-- ON CONFLICT when the statement repeats the index's WHERE clause, and the
-- Supabase client's upsert() has no way to send one. So every upsert failed
-- with "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification", and each feature quietly lived on one device only.
--
-- NULLS NOT DISTINCT (Postgres 15, which Supabase runs) solves the original
-- problem directly: one non-partial index over all three columns, in which
-- two NULL owners DO count as equal. A shared row and an owned row can never
-- collide because their owner columns differ, so the existing data already
-- satisfies it — the old indexes enforced exactly this, split in two.
--
-- Safe for a deployment still running the old client: shared upserts there
-- were failing before this and still fail; owned upserts there name all
-- three columns and start working.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS feature_state_key_uidx
  ON public.feature_state (couple_id, feature_key, owner_user_id)
  NULLS NOT DISTINCT;

DROP INDEX IF EXISTS public.feature_state_shared_uidx;
DROP INDEX IF EXISTS public.feature_state_owned_uidx;
