import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// --- Authorization Logic Under Test ---
function filterNotesForUser(notes, currentUserId, coupleMemberIds) {
  // 1. Verify caller is a couple member
  if (!coupleMemberIds.includes(currentUserId)) {
    throw new Error('Forbidden: Not a member of this couple space');
  }

  // 2. Strict policy: Shared notes OR private notes authored by caller
  return notes.filter((note) => {
    if (note.visibility === 'shared') return true;
    if (note.visibility === 'private' && note.authorId === currentUserId) return true;
    return false;
  });
}

function canViewLetter(letter, currentUserId, coupleMemberIds, now = new Date()) {
  if (!coupleMemberIds.includes(currentUserId)) {
    return false;
  }
  // Author can always view
  if (letter.authorId === currentUserId) {
    return true;
  }
  // Opened letters can be viewed
  if (letter.status === 'opened') {
    return true;
  }
  // Sealed letter with future unlock date CANNOT be viewed
  if (letter.unlockAt && new Date(letter.unlockAt) > now) {
    return false;
  }
  return true;
}

function canJoinCouple(existingMembersCount) {
  if (existingMembersCount >= 2) {
    throw new Error('A couple space is strictly limited to exactly two partners.');
  }
  return true;
}

function validateUploadRequest({ hasSession, isCoupleMember, isCloudinaryConfigured }) {
  if (!isCloudinaryConfigured) {
    return { status: 503, error: 'Cloudinary not configured' };
  }
  if (!hasSession) {
    return { status: 401, error: 'Unauthorized: Session missing' };
  }
  if (!isCoupleMember) {
    return { status: 403, error: 'Forbidden: Couple membership required' };
  }
  return { status: 200, success: true };
}

// ==============================================================================
// TEST SUITE: Authorization & Security
// ==============================================================================

test('Private Notes Security: User 2 cannot access User 1 private notes', () => {
  const coupleMemberIds = ['user_1', 'user_2'];
  const testNotes = [
    { id: 'n1', content: 'Shared coffee shop memory', visibility: 'shared', authorId: 'user_1' },
    { id: 'n2', content: 'Secret proposal planning ideas', visibility: 'private', authorId: 'user_1' },
    { id: 'n3', content: 'Surprise birthday gift note', visibility: 'private', authorId: 'user_2' },
  ];

  // When User 1 fetches notes
  const user1Notes = filterNotesForUser(testNotes, 'user_1', coupleMemberIds);
  assert.equal(user1Notes.length, 2);
  assert.ok(user1Notes.some((n) => n.id === 'n1'));
  assert.ok(user1Notes.some((n) => n.id === 'n2'));
  assert.ok(!user1Notes.some((n) => n.id === 'n3'), 'User 1 must NOT see User 2 private note');

  // When User 2 fetches notes
  const user2Notes = filterNotesForUser(testNotes, 'user_2', coupleMemberIds);
  assert.equal(user2Notes.length, 2);
  assert.ok(user2Notes.some((n) => n.id === 'n1'));
  assert.ok(user2Notes.some((n) => n.id === 'n3'));
  assert.ok(!user2Notes.some((n) => n.id === 'n2'), 'User 2 must NOT see User 1 private note');
});

test('Private Notes Security: External user cannot access any notes', () => {
  const coupleMemberIds = ['user_1', 'user_2'];
  const testNotes = [
    { id: 'n1', content: 'Shared note', visibility: 'shared', authorId: 'user_1' },
  ];

  assert.throws(() => {
    filterNotesForUser(testNotes, 'external_hacker_user', coupleMemberIds);
  }, /Forbidden/);
});

test('Time Capsule Security: Future sealed letters are locked for recipient', () => {
  const coupleMemberIds = ['user_1', 'user_2'];
  const futureLetter = {
    id: 'l1',
    authorId: 'user_1',
    recipientId: 'user_2',
    status: 'sealed',
    unlockAt: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days in future
  };

  // Author can view their own letter
  assert.equal(canViewLetter(futureLetter, 'user_1', coupleMemberIds), true);

  // Recipient CANNOT view before unlock date
  assert.equal(canViewLetter(futureLetter, 'user_2', coupleMemberIds), false);

  // Once unlocked, recipient can view
  const unlockedLetter = {
    ...futureLetter,
    unlockAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  };
  assert.equal(canViewLetter(unlockedLetter, 'user_2', coupleMemberIds), true);
});

test('Couple Limit Security: Strictly maximum 2 members per couple', () => {
  assert.equal(canJoinCouple(0), true);
  assert.equal(canJoinCouple(1), true);

  // 3rd member attempt MUST throw
  assert.throws(() => {
    canJoinCouple(2);
  }, /strictly limited to exactly two partners/);
});

test('Upload Signature Security: Rejects unauthorized callers', () => {
  // 1. Missing session -> 401
  const res1 = validateUploadRequest({
    hasSession: false,
    isCoupleMember: false,
    isCloudinaryConfigured: true,
  });
  assert.equal(res1.status, 401);

  // 2. Authenticated but not couple member -> 403
  const res2 = validateUploadRequest({
    hasSession: true,
    isCoupleMember: false,
    isCloudinaryConfigured: true,
  });
  assert.equal(res2.status, 403);

  // 3. Valid session and couple member -> 200
  const res3 = validateUploadRequest({
    hasSession: true,
    isCoupleMember: true,
    isCloudinaryConfigured: true,
  });
  assert.equal(res3.status, 200);

  // 4. Cloudinary unconfigured -> 503
  const res4 = validateUploadRequest({
    hasSession: true,
    isCoupleMember: true,
    isCloudinaryConfigured: false,
  });
  assert.equal(res4.status, 503);
});

test('RLS Policies SQL Verification: Confirms RLS on all 10 tables', () => {
  const rlsFilePath = path.join(process.cwd(), 'supabase', 'migrations', '20261014000002_rls_policies.sql');
  assert.ok(fs.existsSync(rlsFilePath), 'RLS policy migration file must exist');

  const content = fs.readFileSync(rlsFilePath, 'utf8');

  const expectedTables = [
    'profiles',
    'couples',
    'couple_members',
    'memories',
    'memory_media',
    'memory_notes',
    'memory_reactions',
    'events',
    'letters',
    'bucket_items',
  ];

  for (const table of expectedTables) {
    const rlsStatement = `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`;
    assert.ok(
      content.includes(rlsStatement),
      `Expected ${table} to have Row Level Security enabled: "${rlsStatement}"`
    );
  }

  // Verify private notes policy explicitly requires author_id = auth.uid()
  assert.ok(
    content.includes("visibility = 'private' AND") && content.includes('author_id = auth.uid()'),
    'Private notes policy must strictly require author_id = auth.uid()'
  );
});

// ==============================================================================
// TEST SUITE: Couple onboarding (create / re-login / join by invite code)
// ==============================================================================

const migration6 = () =>
  fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000006_create_and_join_couple_rpc.sql'),
    'utf8'
  );
const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('Couple RPC migration: join/create functions exist, are SECURITY DEFINER and granted to authenticated', () => {
  const sql = migration6();
  for (const fn of ['join_couple_by_code', 'create_couple_space', 'get_my_couple']) {
    assert.ok(sql.includes(`FUNCTION public.${fn}`), `${fn} must be defined`);
    assert.ok(sql.includes(`GRANT EXECUTE ON FUNCTION public.${fn}`), `${fn} must be granted`);
  }
  assert.ok(sql.includes('SECURITY DEFINER SET search_path = public'));
});

test('Couple RPC migration: join enforces 2-member limit and creates a partner membership', () => {
  const sql = migration6();
  assert.ok(sql.includes('member_count >= 2'));
  assert.ok(sql.includes("'partner'"));
  assert.ok(sql.includes('Invalid invite code'));
});

test('Couple RPC migration: create is idempotent so re-login never makes a second space', () => {
  const sql = migration6();
  const createFn = sql.slice(sql.indexOf('FUNCTION public.create_couple_space'));
  assert.ok(
    createFn.indexOf('RETURN result;') < createFn.indexOf('INSERT INTO public.couples'),
    'existing couple must be returned before any INSERT INTO couples'
  );
});

test('Couple RLS: couples are no longer readable by every authenticated user', () => {
  const sql = migration6();
  assert.ok(!/USING\s*\(\s*public\.is_couple_member\(id\)\s*OR\s+invite_code IS NOT NULL/.test(sql));
  assert.ok(sql.includes('USING (public.is_couple_member(id))'));
});

test('Client: onboarding/login use the shared helpers and never silently swallow errors', () => {
  const login = read('src', 'app', 'login', 'page.tsx');
  const onboarding = read('src', 'app', 'onboarding', 'page.tsx');
  assert.ok(login.includes('fetchMyCouple'));
  assert.ok(!login.includes('.maybeSingle()'), 'login must not use maybeSingle (fails on >1 rows)');
  assert.ok(onboarding.includes('joinCoupleByCodeRemote'));
  assert.ok(onboarding.includes('createCoupleSpaceRemote'));
  assert.ok(!onboarding.includes(".from('couples')"), 'onboarding must not query couples directly');
  assert.ok(onboarding.includes("loadExistingCoupleSpace(authenticatedUser.id, foundCouple, 'partner')"));
});

test('Client: DiaryContext keeps DB invite code/id and ignores caches of other couples', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('inviteCode: remoteCouple.invite_code'));
  assert.ok(ctx.includes('parsed.couple?.id === remoteCouple.id'));
});

test('Couple RLS: no direct INSERT policy on couple_members after migration 06', () => {
  const sql = migration6();
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Couple members join policy"'));
  assert.ok(!/CREATE POLICY "Couple members join policy"/.test(sql));
});

test('Migration 07: create/join ensure the caller has a profile row (avoids FK 409)', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000007_backfill_profiles.sql'),
    'utf8'
  );
  assert.ok(sql.includes('INSERT INTO public.profiles'));
  assert.equal((sql.match(/ON CONFLICT \(id\) DO NOTHING/g) || []).length, 3);
  assert.ok(sql.includes('FUNCTION public.create_couple_space'));
  assert.ok(sql.includes('FUNCTION public.join_couple_by_code'));
});

// ==============================================================================
// TEST SUITE: Security hardening (no raw errors leaked, security headers set)
// ==============================================================================

test('Security: next.config.ts sends baseline security headers on every route', () => {
  const cfg = read('next.config.ts');
  assert.ok(cfg.includes("'X-Frame-Options'"));
  assert.ok(cfg.includes("'X-Content-Type-Options'"));
  assert.ok(cfg.includes('nosniff'));
  assert.ok(cfg.includes('Strict-Transport-Security'));
  assert.ok(cfg.includes('async headers()'));
});

test('Security: login/onboarding route raw Supabase errors through friendlyAuthError', () => {
  const login = read('src', 'app', 'login', 'page.tsx');
  const onboarding = read('src', 'app', 'onboarding', 'page.tsx');
  assert.ok(login.includes('friendlyAuthError'));
  assert.ok(onboarding.includes('friendlyAuthError'));
  assert.ok(!/setErrorMsg\(error\.message\)/.test(login), 'raw error.message must not reach the UI');
  assert.ok(!/setJoinError\(err\?\.message/.test(onboarding), 'raw err.message must not reach the UI');
});

test('Security: a failed couple lookup on login never dead-ends the user', () => {
  const login = read('src', 'app', 'login', 'page.tsx');
  assert.ok(login.includes('lookupFailed'));
  assert.ok(login.includes("router.push('/onboarding')"));
});

test('Security: secrets stay server-side (no Cloudinary/Supabase secret in client bundle code)', () => {
  const client = read('src', 'lib', 'supabase', 'client.ts');
  assert.ok(!client.includes('SERVICE_ROLE'));
  assert.ok(!client.includes('API_SECRET'));
  const cloudinary = read('src', 'lib', 'cloudinary', 'server.ts');
  assert.ok(cloudinary.includes("'use client'") === false);
});

test('Security: import validate API route requires auth and caps body size', () => {
  const route = read('src', 'app', 'api', 'import', 'validate', 'route.ts');
  assert.ok(route.includes('MAX_BODY_BYTES'));
  assert.ok(route.includes('getSupabaseServerClient'));
  assert.ok(route.includes('Unauthorized'));
  assert.ok(/status: 413/.test(route), 'must reject oversized bodies with 413');
});

// ==============================================================================
// TEST SUITE: Memory persistence (survives logout/login)
// ==============================================================================

test('Migration 08: memories table gains perspective/tags columns', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000008_memories_persistence_columns.sql'),
    'utf8'
  );
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS perspective_user1'));
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS perspective_user2'));
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS tags'));
});

test('Memories helper: fetch/create/update/delete all target the memories table', () => {
  const src = read('src', 'lib', 'supabase', 'memories.ts');
  assert.ok(src.includes("from('memories')"));
  assert.ok(src.includes('export async function fetchMemoriesRemote'));
  assert.ok(src.includes('export async function createMemoryRemote'));
  assert.ok(src.includes('export async function updateMemoryRemote'));
  assert.ok(src.includes('export async function deleteMemoryRemote'));
});

test('DiaryContext: loading a couple space fetches real memories from the database', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('fetchMemoriesRemote'));
  assert.ok(ctx.includes('createMemoryRemote'));
  assert.ok(ctx.includes('updateMemoryRemote'));
  assert.ok(ctx.includes('deleteMemoryRemote'));
  // loadExistingCoupleSpace must be async so it can await the fetch
  assert.ok(/const loadExistingCoupleSpace = async \(/.test(ctx));
});

// ==============================================================================
// TEST SUITE: Persisting the remaining features (events, letters, bucket list,
// love coupons, spin wheel, daily spark, memory notes/photos)
// ==============================================================================

test('Migration 09: new tables exist with RLS enabled and policies scoped by couple membership', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000009_persist_remaining_features.sql'),
    'utf8'
  );
  for (const table of ['memory_photos', 'love_coupons', 'spin_wheel_options', 'daily_spark_answers']) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `${table} must be created`);
    assert.ok(
      sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
      `${table} must enable RLS`
    );
  }
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS passcode'));
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS is_locked'));
  assert.ok(sql.includes("UNIQUE (couple_id, question_id, answer_date, user_id)"));
});

test('Sync helpers: every remaining feature has fetch/create helpers wired to its table', () => {
  const src = read('src', 'lib', 'supabase', 'sync.ts');
  const tables = [
    'events', 'letters', 'bucket_items', 'love_coupons',
    'spin_wheel_options', 'daily_spark_answers', 'memory_notes', 'memory_photos',
  ];
  for (const table of tables) {
    assert.ok(src.includes(`from('${table}')`), `sync.ts must query ${table}`);
  }
});

test('DiaryContext: loading a couple space fetches all persisted features in parallel', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  for (const fn of [
    'fetchEventsRemote', 'fetchLettersRemote', 'fetchBucketListRemote',
    'fetchLoveCouponsRemote', 'fetchWheelOptionsRemote', 'fetchDailySparkAnswersRemote',
    'fetchMemoryNotesForMemoriesRemote', 'fetchMemoryPhotosForMemoriesRemote',
  ]) {
    assert.ok(ctx.includes(fn), `loadExistingCoupleSpace must call ${fn}`);
  }
});

test('DiaryContext: ephemeral state (heartbeat/mood/soundtrack) is NOT sent to the database', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  // sendHeartbeatPing / sendWarmHug / updateMoodBeacon / toggleSoundtrack bodies
  // must not reference any remote write helper.
  const forbidden = [
    'createEventRemote', 'createLetterRemote', 'createMemoryRemote', 'createBucketItemRemote',
  ];
  const heartbeatFnMatch = ctx.match(/const sendHeartbeatPing = [\s\S]*?\n  };/);
  const warmHugFnMatch = ctx.match(/const sendWarmHug = [\s\S]*?\n  };/);
  const moodFnMatch = ctx.match(/const updateMoodBeacon = [\s\S]*?\n  };/);
  assert.ok(heartbeatFnMatch && warmHugFnMatch && moodFnMatch, 'expected functions must exist');
  for (const fn of forbidden) {
    assert.ok(!heartbeatFnMatch[0].includes(fn));
    assert.ok(!warmHugFnMatch[0].includes(fn));
    assert.ok(!moodFnMatch[0].includes(fn));
  }
});

test('Migration 10: passcode-locked private notes are fetchable by the couple, not just the author', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000010_private_note_passcode_visibility.sql'),
    'utf8'
  );
  assert.ok(sql.includes("passcode IS NOT NULL AND public.can_access_memory(memory_id)"));
  // A true private note (no passcode) must still be author-only.
  assert.ok(sql.includes("visibility = 'private' AND author_id = auth.uid()"));
});

// ==============================================================================
// TEST SUITE: Consistent sync-failure toasts + lock/unlock replaces passcode
// ==============================================================================

test('Reliability: every background database write shows a toast on failure, not just console.error', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const lines = ctx.split('\n');
  const silent = [];
  lines.forEach((line, i) => {
    if (!line.includes("console.error('[OurDiary] Failed")) return;
    // The toast call is on the same line or one of the next couple of lines.
    const nearby = lines.slice(i, i + 3).join('\n');
    if (!nearby.includes('showToast(')) silent.push(line.trim());
  });
  assert.deepEqual(silent, [], 'every failed-sync console.error must be paired with a showToast');

  const failureCount = (ctx.match(/console\.error\('\[OurDiary\] Failed/g) || []).length;
  assert.ok(failureCount >= 20, 'expected at least 20 handled background writes');
});

test('Security: passcode notes are gone — replaced by a real server-enforced lock/unlock toggle', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  const sync = read('src', 'lib', 'supabase', 'sync.ts');
  const types = read('src', 'types', 'index.ts');
  const notePage = read('src', 'app', 'memories', '[id]', 'page.tsx');

  assert.ok(ctx.includes('const toggleNoteLock ='));
  assert.ok(!ctx.includes('const unlockNote ='));
  assert.ok(!sync.includes('passcode'));
  assert.ok(!sync.includes('is_locked'));
  assert.ok(!types.includes('passcode'));
  assert.ok(!notePage.includes('passcode'));
  assert.ok(!notePage.includes('unlockNote'));
});

test('Migration 11: drops passcode columns and restores the plain author-only private-note policy', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000011_replace_passcode_with_lock_toggle.sql'),
    'utf8'
  );
  assert.ok(sql.includes('DROP COLUMN IF EXISTS passcode'));
  assert.ok(sql.includes('DROP COLUMN IF EXISTS is_locked'));
  assert.ok(sql.includes("visibility = 'private' AND author_id = auth.uid()"));
  assert.ok(!sql.includes('passcode IS NOT NULL'));
});

// ==============================================================================
// TEST SUITE: "Show locked note on partner's dashboard" — real content masking
// ==============================================================================

test('Migration 12: visible_when_locked column, RLS widened, and a content-masking view exist', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '20261014000012_note_visible_when_locked.sql'),
    'utf8'
  );
  assert.ok(sql.includes('ADD COLUMN IF NOT EXISTS visible_when_locked'));
  assert.ok(sql.includes('visible_when_locked = true'));
  assert.ok(sql.includes('CREATE OR REPLACE VIEW public.memory_notes_feed'));
  assert.ok(sql.includes('security_invoker = true'));
  // The view must null out content for anyone but the author while locked —
  // this is what makes the feature real protection, not a UI illusion.
  assert.ok(sql.includes("WHEN visibility = 'private' AND author_id <> auth.uid() THEN NULL"));
  assert.ok(sql.includes('GRANT SELECT ON public.memory_notes_feed TO authenticated'));
});

test('Sync: notes are read through the masking view, never the raw table, for both fetch paths', () => {
  const sync = read('src', 'lib', 'supabase', 'sync.ts');
  assert.ok(sync.includes("from('memory_notes_feed')"));
  // Writes still go to the real table (the view has no writable content column).
  assert.ok(sync.includes("from('memory_notes')\n    .insert"));
  assert.ok(sync.includes("from('memory_notes').update"));
  assert.ok(sync.includes("from('memory_notes').delete"));
});

test('DiaryContext: toggling note visibility-when-locked syncs to the database', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  assert.ok(ctx.includes('const toggleNoteVisibleWhenLocked ='));
  assert.ok(ctx.includes('visibleWhenLocked: nextValue'));
});

test('Dashboard: locked-note teaser list never references note content, only its existence', () => {
  const dash = read('src', 'app', 'dashboard', 'page.tsx');
  assert.ok(dash.includes('lockedNoteTeasers'));
  assert.ok(!/\{note\.content\}/.test(dash), 'dashboard must never render a locked note\'s content');
});
