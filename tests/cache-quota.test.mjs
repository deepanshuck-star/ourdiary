import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

// ---------------------------------------------------------------------------
// A space holding inline base64 photos overflows localStorage's few megabytes.
// The write was a bare setItem, so the quota error escaped a useEffect inside
// DiaryProvider and took the whole app down on load with
// "Setting the value of 'ourdiary_real_couple_v1' exceeded the quota".
// ---------------------------------------------------------------------------

test('no full-space write bypasses the quota-safe helper', () => {
  const ctx = read('src', 'store', 'DiaryContext.tsx');
  // The flags (is_live_user, current_user_id) are tiny and may stay direct;
  // anything serialising a whole space must not.
  const direct = ctx.match(/localStorage\.setItem\([^)]*JSON\.stringify/g) || [];
  assert.deepEqual(direct, [], 'a space is being written without cacheDiaryData');
  assert.ok(ctx.includes('cacheDiaryData'));
});

test('slimForCache drops inline photos and keeps everything else', async () => {
  const { slimForCache } = await import('../src/lib/storage-quota.ts');
  const data = {
    couple: { id: 'c1', name: 'Us', photoUrl: 'data:image/png;base64,AAAA' },
    memories: [
      {
        id: 'm1',
        title: 'Paris',
        photos: [
          { id: 'p1', url: 'data:image/png;base64,' + 'A'.repeat(5000) },
          { id: 'p2', url: 'https://res.cloudinary.com/x/y.webp#iv=abc' },
        ],
      },
    ],
    events: [{ id: 'e1' }],
  };

  const slim = slimForCache(data);
  // The megabytes go.
  assert.deepEqual(slim.memories[0].photos.map((p) => p.id), ['p2']);
  assert.equal(slim.couple.photoUrl, undefined);
  // Everything that is small stays, untouched.
  assert.equal(slim.memories[0].title, 'Paris');
  assert.equal(slim.couple.name, 'Us');
  assert.deepEqual(slim.events, [{ id: 'e1' }]);
  // And the original is not mutated.
  assert.equal(data.memories[0].photos.length, 2);
});

test('slimForCache keeps a real upload, encrypted or not', async () => {
  const { slimForCache } = await import('../src/lib/storage-quota.ts');
  const data = {
    couple: { id: 'c1', photoUrl: 'https://res.cloudinary.com/a/b.webp' },
    memories: [
      { id: 'm1', photos: [{ id: 'p1', url: 'https://res.cloudinary.com/a/c.webp#iv=z' }] },
    ],
  };
  const slim = slimForCache(data);
  assert.equal(slim.couple.photoUrl, 'https://res.cloudinary.com/a/b.webp');
  assert.equal(slim.memories[0].photos.length, 1);
});

test('slimForCache survives a space with nothing in it', async () => {
  const { slimForCache } = await import('../src/lib/storage-quota.ts');
  assert.doesNotThrow(() => slimForCache({ couple: {}, memories: [] }));
  assert.doesNotThrow(() => slimForCache({ couple: {} }));
  const odd = slimForCache({ couple: {}, memories: [{ id: 'm1' }] });
  assert.deepEqual(odd.memories[0].photos, []);
});

test('isQuotaError recognises what each browser throws', async () => {
  const { isQuotaError } = await import('../src/lib/storage-quota.ts');
  assert.equal(isQuotaError({ name: 'QuotaExceededError' }), true);
  assert.equal(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }), true, 'Firefox');
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError({ code: 1014 }), true);
  // Anything else must fall through, not be swallowed as a quota problem.
  assert.equal(isQuotaError(new TypeError('nope')), false);
  assert.equal(isQuotaError(null), false);
  assert.equal(isQuotaError('string'), false);
});
