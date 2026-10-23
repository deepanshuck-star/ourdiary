import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');
const migration = () => read('supabase', 'migrations', '20261014000018_space_owner_controls.sql');

// ---------------------------------------------------------------------------
// Bug 1: /onboarding had no auth guard. With no session both handlers fell
// through to their offline branch, fabricated a local-only space and told the
// visitor they had joined — while the database never gained a member.
// ---------------------------------------------------------------------------

test('onboarding sends a signed-out visitor to login instead of the form', () => {
  const src = read('src', 'app', 'onboarding', 'page.tsx');
  assert.ok(src.includes("router.replace('/login')"));
});

test('joining refuses to fall through to the offline branch when Supabase is configured', () => {
  const src = read('src', 'app', 'onboarding', 'page.tsx');
  // `supabase` is null only when Supabase isn't configured at all, so this
  // pair is exactly "cloud-backed app, nobody signed in".
  assert.ok(src.includes('if (supabase && !authenticatedUser)'));
  // The guard has to come before the real join attempt, or it is decoration.
  const guard = src.indexOf('if (supabase && !authenticatedUser)');
  const realJoin = src.indexOf('joinCoupleByCodeRemote(supabase, cleanedCode)');
  assert.ok(guard > -1 && realJoin > -1);
  assert.ok(guard < realJoin, 'the signed-out guard must precede the join call');
});

test('creating a space is guarded the same way', () => {
  const src = read('src', 'app', 'onboarding', 'page.tsx');
  const guards = src.split('if (supabase && !authenticatedUser)').length - 1;
  // Counted against the handlers rather than a fixed number: onboarding now
  // has a personal-diary path as well as create and join, and a new path
  // arriving without the guard is exactly what this is here to catch.
  const mutations = (src.match(/createSpaceRemote\(|joinCoupleByCodeRemote\(/g) || []).length;
  assert.ok(mutations >= 2, 'expected onboarding to create and to join');
  assert.ok(guards >= mutations, 'every create/join path needs the signed-out guard');
});

// ---------------------------------------------------------------------------
// Bug 2: regenerateCoupleCode fired an UPDATE whose `error` it never read
// (supabase-js returns one rather than throwing, so the catch was dead code)
// and reported success regardless.
// ---------------------------------------------------------------------------

test('regenerating the code goes through the server and adopts what it returns', () => {
  const src = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(src.includes('regenerateInviteCodeRemote'));
  // The local-generate-then-blind-UPDATE path must be gone.
  assert.equal(src.includes("update({ invite_code: newCode })"), false);
});

test('the invite-code call surfaces the server error rather than swallowing it', () => {
  const src = read('src', 'lib', 'supabase', 'couple.ts');
  assert.ok(src.includes('export async function regenerateInviteCodeRemote'));
  assert.ok(src.includes("supabase.rpc('regenerate_invite_code'"));
  assert.ok(src.includes('if (error) throw new Error(error.message)'));
});

test('Migration 20: no RPC infers which diary the caller meant', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000020_personal_and_multi_space.sql'),
    'utf8'
  );
  // An account can now hold a personal diary and a couple space at once, so
  // "the caller's oldest membership" silently targets the wrong one. Every
  // rewritten function must take the space and check it.
  for (const fn of [
    'regenerate_invite_code(p_couple_id UUID)',
    'start_game_session(',
    'apply_game_move(',
    'end_game_session(p_couple_id UUID, p_game_key TEXT)',
    'leave_space(p_couple_id UUID)',
  ]) {
    assert.ok(sql.includes(fn), `${fn} should take the space explicitly`);
  }
  // The exact idiom migrations 6, 18 and 19 used to mean "whichever space
  // you joined first". Ordering by created_at is still fine where it is only
  // sort order (get_my_spaces) or is kind-filtered (the personal-diary
  // dedupe) — it is resolving a mutation's target this way that is the bug.
  assert.ok(
    !sql.includes('SELECT cm.couple_id INTO my_couple'),
    'no function may infer its target space from the caller'
  );
  // The old signatures are dropped, not left as overloads an ambiguous call
  // could resolve to.
  for (const dropped of [
    'DROP FUNCTION IF EXISTS public.regenerate_invite_code();',
    'DROP FUNCTION IF EXISTS public.remove_partner(BOOLEAN);',
    'DROP FUNCTION IF EXISTS public.start_game_session(TEXT, JSONB, UUID);',
    'DROP FUNCTION IF EXISTS public.apply_game_move(TEXT, JSONB, INTEGER, UUID, TEXT);',
    'DROP FUNCTION IF EXISTS public.end_game_session(TEXT);',
  ]) {
    assert.ok(sql.includes(dropped), `missing ${dropped}`);
  }
  // Membership is still proven before anything is touched.
  assert.ok(sql.includes('FUNCTION public.assert_space_member'));
  assert.ok((sql.match(/PERFORM public\.assert_space_member/g) || []).length >= 5);
});

test('Migration 20: the client names the space on every game call', () => {
  const src = read('src', 'lib', 'supabase', 'gameSessions.ts');
  assert.equal((src.match(/p_couple_id: coupleId/g) || []).length, 3);
});

test('the dashboard reports why a regeneration failed', () => {
  const src = read('src', 'app', 'dashboard', 'page.tsx');
  // Previously a bare `catch {}` with a generic message, which is how a
  // rejected write looked identical to a successful one.
  assert.ok(src.includes("err?.message || 'Failed to regenerate code'"));
});

// ---------------------------------------------------------------------------
// Bug 3: any member could rotate the code, and nobody could remove a partner.
// ---------------------------------------------------------------------------

test('Migration 18: only the creator may change the invite code', () => {
  const sql = migration();
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.is_couple_creator'));
  assert.ok(sql.includes("role = 'creator'"));
  // RLS can't restrict a single column, so a trigger carries this rule.
  assert.ok(sql.includes('enforce_invite_code_owner'));
  assert.ok(sql.includes('NEW.invite_code IS DISTINCT FROM OLD.invite_code'));
});

test('Migration 18: the RPCs re-check ownership themselves', () => {
  const sql = migration();
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.regenerate_invite_code'));
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.remove_partner'));
  // Both must verify the caller, not trust the UI that called them.
  const checks = sql.split('IF NOT public.is_couple_creator(target.id) THEN').length - 1;
  assert.equal(checks, 2);
});

test('Migration 18: a generated code is checked for collisions', () => {
  const sql = migration();
  // invite_code is UNIQUE; without the retry loop a collision surfaces as a
  // failed update rather than a different code.
  assert.ok(sql.includes('EXIT WHEN NOT EXISTS (SELECT 1 FROM public.couples WHERE invite_code = new_code)'));
});

test('Migration 18: removing a partner rotates the code by default', () => {
  const sql = migration();
  // The removed partner knows the current code and the seat is now free, so
  // not rotating would let them walk straight back in.
  assert.ok(sql.includes('p_rotate_code BOOLEAN DEFAULT true'));
  assert.ok(sql.includes('DELETE FROM public.couple_members'));
  assert.ok(sql.includes('user_id <> uid'));
});

test('Migration 18: removing a partner keeps their shared history', () => {
  const sql = migration();
  // Only the membership row is deleted — memories and notes are keyed to the
  // couple, so nothing of theirs is destroyed by losing access.
  assert.equal(sql.includes('DELETE FROM public.memories'), false);
  assert.equal(sql.includes('DELETE FROM public.couples'), false);
});

test('Migration 18: the RPCs are not executable by anonymous callers', () => {
  const sql = migration();
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.regenerate_invite_code() FROM PUBLIC'));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.remove_partner(BOOLEAN) FROM PUBLIC'));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated'));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.remove_partner(BOOLEAN) TO authenticated'));
});

test('owner-only controls are hidden from a partner in the UI', () => {
  const src = read('src', 'app', 'dashboard', 'page.tsx');
  assert.ok(src.includes('isCoupleCreator &&'));
  assert.ok(src.includes('Remove partner'));
});

test('the signed-in user’s role is carried from the membership row', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('myRole: role'));
  // A freshly created space belongs to whoever created it.
  assert.ok(ctx.includes("myRole: couple.myRole || 'creator'"));
  const types = read('src', 'types', 'index.ts');
  assert.ok(types.includes("myRole?: 'creator' | 'partner'"));
});
