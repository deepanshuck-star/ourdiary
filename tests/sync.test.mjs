import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = (name) => path.join(process.cwd(), 'supabase', 'migrations', name);
const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('Migration 14: feature_state table has RLS and both shared/owned uniqueness', () => {
  const sql = fs.readFileSync(migrationPath('20261014000014_feature_state_and_voice_notes.sql'), 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.feature_state'));
  assert.ok(sql.includes('ALTER TABLE public.feature_state ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('feature_state_shared_uidx'));
  assert.ok(sql.includes('feature_state_owned_uidx'));
  // Owned writes must be restricted to the real owner.
  assert.ok(sql.includes('owner_user_id = auth.uid()'));
});

test('Migration 14: voice_notes table exists with RLS scoped via can_access_memory', () => {
  const sql = fs.readFileSync(migrationPath('20261014000014_feature_state_and_voice_notes.sql'), 'utf8');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.voice_notes'));
  assert.ok(sql.includes('ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('public.can_access_memory(memory_id)'));
  assert.ok(sql.includes('author_id = auth.uid()'));
});

test('xsync.ts: generic feature-state fetch/upsert target the feature_state table', () => {
  const src = read('src', 'lib', 'supabase', 'xsync.ts');
  assert.ok(src.includes("from('feature_state')"));
  assert.ok(src.includes('export async function fetchFeatureStateRemote'));
  assert.ok(src.includes('export async function upsertFeatureStateRemote'));
});

test('xsync.ts: voice notes CRUD targets the voice_notes table', () => {
  const src = read('src', 'lib', 'supabase', 'xsync.ts');
  assert.ok(src.includes("from('voice_notes')"));
  assert.ok(src.includes('export async function fetchVoiceNotesRemote'));
  assert.ok(src.includes('export async function createVoiceNoteRemote'));
  assert.ok(src.includes('export async function deleteVoiceNoteRemote'));
});

test('local-store.ts: only the agreed feature prefixes are synced, everything else stays local', () => {
  const src = read('src', 'lib', 'local-store.ts');
  const synced = ['mood-history:', 'dateIdeas:votes:', 'dateIdeas:custom:', 'dateIdeas:planned:', 'countdowns:custom:', 'budget:', 'surprises:'];
  for (const prefix of synced) {
    assert.ok(src.includes(`'${prefix}'`), `expected "${prefix}" in the synced-prefix allowlist`);
  }
  assert.ok(src.includes("SYNCED_OWNED_PREFIX = 'quiz:'"));
});

test('local-store.ts: a sync failure is surfaced via the error handler, not just console.error', () => {
  const src = read('src', 'lib', 'local-store.ts');
  assert.ok(src.includes('onSyncError?.('));
  assert.ok(src.includes('export function setSyncErrorHandler'));
});

test('local-store.ts: logout path clears synced in-memory cache so a new login always refetches', () => {
  const src = read('src', 'lib', 'local-store.ts');
  const fn = src.slice(src.indexOf('export function setSyncContext'));
  const nullBranch = fn.slice(0, fn.indexOf('const supabase = getSupabaseBrowserClient();'));
  assert.ok(nullBranch.includes('syncedCoupleId = null'));
  assert.ok(nullBranch.includes('cache.delete(key)'));
});

test('DiaryContext: logout also clears the synced "ourdiary-x:" localStorage keys, not just ourdiary_space_', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const logoutFn = ctx.slice(ctx.indexOf('const logout = async'), ctx.indexOf('const regenerateCoupleCode ='));
  assert.ok(logoutFn.includes("key.startsWith('ourdiary-x:')"));
  assert.ok(logoutFn.includes('setSyncContext(null)'));
});

test('DiaryContext: joining/creating/loading a couple space wires up the sync context with the right role slot', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('setSyncContext({ coupleId: remoteCouple.id, userId, mySlot: activeProfileId })'));
  assert.ok(ctx.includes("setSyncContext({ coupleId: couple.id, userId, mySlot: 'user_1' })"));
});

test('AI date planner is fully removed: no route, no page, no SDK dependency', () => {
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'src', 'app', 'planner')));
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'src', 'app', 'api', 'date-planner')));
  assert.ok(!fs.existsSync(path.join(process.cwd(), 'src', 'lib', 'features', 'planner.ts')));
  const pkg = read('package.json');
  assert.ok(!pkg.includes('@anthropic-ai/sdk'));
  const nav = read('src', 'components', 'layout', 'exploreNav.ts');
  assert.ok(!nav.includes('/planner'));
});

// ---------------------------------------------------------------------------
// The couple row's own fields (name, dates, theme) stopped at React state and
// localStorage. loadExistingCoupleSpace spreads the database row over the
// cache on sign-in, so an unsaved change silently reverted — and the UI had
// already said "Relationship settings saved!" before attempting any write.
// ---------------------------------------------------------------------------

test('the couple details write exists and only sends what was passed', () => {
  const src = read('src', 'lib', 'supabase', 'couple.ts');
  assert.ok(src.includes('export async function updateCoupleDetailsRemote'));
  // Column names must match the schema, not the client-side field names.
  assert.ok(src.includes('patch.relationship_start_date = fields.startDate'));
  assert.ok(src.includes('patch.anniversary_date = fields.anniversaryDate'));
  // Partial: saving the name must not blank the dates.
  assert.ok(src.includes('if (fields.name !== undefined)'));
  assert.ok(src.includes('if (Object.keys(patch).length === 0) return;'));
  // The invite code is creator-only and trigger-guarded; it is not settable here.
  assert.equal(src.includes('patch.invite_code'), false);
  assert.ok(src.includes('if (error) throw new Error(error.message)'));
});

test('updateCouple persists the relationship basics, not just the photo', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('updateCoupleDetailsRemote'));
  for (const field of ['updates.name', 'updates.startDate', 'updates.anniversaryDate', 'updates.theme']) {
    assert.ok(ctx.includes(field), `${field} should be forwarded to the server`);
  }
});

test('the save toast waits for the server instead of announcing up front', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const toast = "showToast('Relationship settings saved!', 'success')";
  // Every success toast must sit inside a .then(...) or the demo-mode branch —
  // never on the line straight after setData, which is what made the original
  // failure invisible.
  const idx = ctx.indexOf('const updateCouple');
  assert.ok(idx > -1);
  const body = ctx.slice(idx, idx + 2600);
  assert.ok(body.includes(toast));
  assert.equal(
    /setData\(\(prev\) => \(\{[\s\S]{0,200}?\}\)\);\s*showToast\('Relationship settings saved!'/.test(body),
    false,
    'the toast must not fire before the write is attempted'
  );
  // And a failed write has to say so rather than passing silently.
  assert.ok(body.includes("'warn'"));
});
