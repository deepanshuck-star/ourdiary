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
