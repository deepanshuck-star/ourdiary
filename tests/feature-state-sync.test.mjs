import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('feature_state has one upsertable unique index', () => {
  // Postgres cannot resolve ON CONFLICT against a PARTIAL unique index
  // unless the statement repeats its WHERE, which supabase-js cannot send.
  // Every shared synced feature was failing to reach the server.
  const sql = read('supabase', 'migrations', '20261030000021_feature_state_upsert_index.sql');
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS feature_state_key_uidx\s+ON public\.feature_state \(couple_id, feature_key, owner_user_id\)\s+NULLS NOT DISTINCT/);
  assert.match(sql, /DROP INDEX IF EXISTS public\.feature_state_shared_uidx/);
  assert.match(sql, /DROP INDEX IF EXISTS public\.feature_state_owned_uidx/);
  // The new index is created before the old ones go, so uniqueness is never
  // unenforced between statements.
  assert.ok(sql.indexOf('CREATE UNIQUE INDEX') < sql.indexOf('DROP INDEX'));
});

test('every upsert names the columns of that index', () => {
  const src = read('src', 'lib', 'supabase', 'xsync.ts');
  assert.match(src, /const onConflict = 'couple_id,feature_key,owner_user_id';/);
  assert.equal(/'couple_id,feature_key'[^,]/.test(src), false, 'a two-column target can never match');
});

test('the little world syncs between both partners', () => {
  const src = read('src', 'lib', 'local-store.ts');
  assert.ok(src.includes("'world:',"));
});
