import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHandoff, formatAgo, formatGap, WAKING_SOON_MS } from '../src/lib/features/handoff.ts';
import { nextLocalTimeUtc, sleepStateFor } from '../src/lib/features/timezones.ts';

const NOW = Date.UTC(2026, 2, 10, 6, 0); // 06:00 UTC
const base = {
  nowMs: NOW,
  partnerName: 'Ritesh',
  iAmAwake: true,
  partnerAsleep: true,
  partnerNextWakeUtc: NOW + 3 * 3_600_000,
};

test('no card when you are both awake, or both asleep', () => {
  assert.equal(buildHandoff({ ...base, partnerAsleep: false }), null);
  assert.equal(buildHandoff({ ...base, iAmAwake: false }), null);
});

test('the card carries what they said before bed and when they wake', () => {
  const card = buildHandoff({
    ...base,
    lastPartnerMessage: {
      id: 'm1',
      content: 'night, miss you',
      createdAt: new Date(NOW - 5 * 3_600_000).toISOString(),
    },
  });
  assert.ok(card);
  assert.equal(card.reason, 'asleep');
  assert.equal(card.headline, 'Ritesh is asleep right now');
  assert.equal(card.lastWord?.content, 'night, miss you');
  assert.match(card.detail, /went quiet 5 hours ago/);
  assert.match(card.detail, /Morning for them in 3h/);
  assert.equal(card.msUntilTheyWake, 3 * 3_600_000);
});

test('a stale message is not passed off as tonight’s parting word', () => {
  const card = buildHandoff({
    ...base,
    lastPartnerMessage: {
      id: 'old',
      content: 'from three weeks ago',
      createdAt: new Date(NOW - 21 * 86_400_000).toISOString(),
    },
  });
  assert.ok(card);
  assert.equal(card.lastWord, null);
  assert.equal(card.detail, 'Morning for them in 3h.');
});

test('an empty or future-dated message is ignored', () => {
  const blank = buildHandoff({
    ...base,
    lastPartnerMessage: { id: 'b', content: '   ', createdAt: new Date(NOW).toISOString() },
  });
  assert.equal(blank?.lastWord, null);

  const ahead = buildHandoff({
    ...base,
    lastPartnerMessage: { id: 'f', content: 'hi', createdAt: new Date(NOW + 86_400_000).toISOString() },
  });
  assert.equal(ahead?.lastWord, null);
});

test('inside the last 90 minutes the card switches to “about to wake”', () => {
  const card = buildHandoff({ ...base, partnerNextWakeUtc: NOW + WAKING_SOON_MS - 60_000 });
  assert.ok(card);
  assert.equal(card.reason, 'waking-soon');
  assert.equal(card.headline, 'Ritesh is about to wake up');
  assert.match(card.detail, /Leave something for them to open/);
});

test('the dismiss key changes with the morning it belongs to', () => {
  const tonight = buildHandoff(base);
  const tomorrow = buildHandoff({ ...base, partnerNextWakeUtc: base.partnerNextWakeUtc + 86_400_000 });
  assert.notEqual(tonight.dismissKey, tomorrow.dismissKey);
});

test('formatGap and formatAgo stay short', () => {
  assert.equal(formatGap(30_000), 'any moment');
  assert.equal(formatGap(40 * 60_000), '40m');
  assert.equal(formatGap(2 * 3_600_000), '2h');
  assert.equal(formatGap(2 * 3_600_000 + 40 * 60_000), '2h 40m');
  assert.equal(formatGap(30 * 3_600_000), '1d 6h');
  assert.equal(formatGap(-5), 'any moment');

  assert.equal(formatAgo(30_000), 'just now');
  assert.equal(formatAgo(20 * 60_000), '20 minutes ago');
  assert.equal(formatAgo(3_600_000), 'an hour ago');
  assert.equal(formatAgo(5 * 3_600_000), '5 hours ago');
  assert.equal(formatAgo(26 * 3_600_000), 'yesterday');
  assert.equal(formatAgo(3 * 86_400_000), '3 days ago');
});

test('a real India/UK night produces exactly one card, for the one who is up', () => {
  // 19:30 UTC = 01:00 next day in Kolkata (asleep), 19:30 in London (awake).
  const at = Date.UTC(2026, 0, 15, 19, 30);
  const kolkata = sleepStateFor(at, 'Asia/Kolkata');
  const london = sleepStateFor(at, 'Europe/London');
  assert.equal(kolkata.asleep, true);
  assert.equal(london.asleep, false);

  const forLondon = buildHandoff({
    nowMs: at,
    partnerName: 'Ritesh',
    iAmAwake: !london.asleep,
    partnerAsleep: kolkata.asleep,
    partnerNextWakeUtc: kolkata.nextWakeUtc,
  });
  const forKolkata = buildHandoff({
    nowMs: at,
    partnerName: 'Sam',
    iAmAwake: !kolkata.asleep,
    partnerAsleep: london.asleep,
    partnerNextWakeUtc: london.nextWakeUtc,
  });
  assert.ok(forLondon);
  assert.equal(forKolkata, null);
  // Their 07:00 IST is 01:30 UTC the next morning: six hours away.
  assert.equal(kolkata.nextWakeUtc, nextLocalTimeUtc(at, 'Asia/Kolkata', 7));
  assert.equal(forLondon.msUntilTheyWake, 6 * 3_600_000);
});
