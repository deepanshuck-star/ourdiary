-- ==============================================================================
-- Have migrations 21 and 22 been run on this database?
--
-- READ-ONLY. This only looks; it changes nothing, so it is safe to run as
-- many times as you like. Paste it into Supabase -> SQL Editor -> Run.
--
-- It checks what each migration actually did to the database, rather than
-- a migrations log, because running a migration by pasting it into the SQL
-- editor does not record it in any log.
-- ==============================================================================

WITH
idx AS (
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'feature_state'
),
m21 AS (
  SELECT
    EXISTS (SELECT 1 FROM idx WHERE indexname = 'feature_state_key_uidx') AS new_index,
    EXISTS (SELECT 1 FROM idx WHERE indexname IN ('feature_state_shared_uidx', 'feature_state_owned_uidx')) AS old_indexes
),
m22 AS (
  SELECT
    COALESCE((
      SELECT pg_get_expr(p.polqual, p.polrelid) LIKE '%draft%'
      FROM pg_policy p
      WHERE p.polrelid = 'public.letters'::regclass AND p.polname = 'Letters select policy'
    ), false) AS drafts_hidden,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.letters'::regclass
        AND tgname = 'letters_recipient_may_only_open'
        AND NOT tgisinternal
    ) AS trigger_present
)
SELECT 'Migration 21 — synced features save to the server' AS migration,
  CASE
    WHEN m21.new_index AND NOT m21.old_indexes THEN 'DONE: already run, nothing to do'
    WHEN NOT m21.new_index AND m21.old_indexes THEN 'NOT RUN: run supabase/migrations/20261030000021_feature_state_upsert_index.sql'
    WHEN m21.new_index AND m21.old_indexes THEN 'HALF RUN: new index exists but old ones remain. Running the migration again finishes it safely.'
    ELSE 'UNEXPECTED: neither index found. Is this the OurDiary database?'
  END AS status
FROM m21
UNION ALL
SELECT 'Migration 22 — drafts private, received letters read-only',
  CASE
    WHEN m22.drafts_hidden AND m22.trigger_present THEN 'DONE: already run, nothing to do'
    WHEN NOT m22.drafts_hidden AND NOT m22.trigger_present THEN 'NOT RUN: run supabase/migrations/20261103000022_letters_drafts_private_recipient_read_only.sql'
    ELSE 'HALF RUN: running the migration again finishes it safely.'
  END
FROM m22
UNION ALL
SELECT 'Postgres version (migration 21 needs 15 or newer)',
  CASE
    WHEN current_setting('server_version_num')::int >= 150000 THEN 'OK: ' || split_part(current_setting('server_version'), ' ', 1)
    ELSE 'TOO OLD for migration 21: ' || split_part(current_setting('server_version'), ' ', 1) || ' — ask for the version-14 alternative'
  END;
