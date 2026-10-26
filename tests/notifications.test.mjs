import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ICON,
  KINDS,
  badgeLabel,
  dayLabel,
  describe,
  groupByDay,
  iconFor,
  isKnownKind,
  mergeNotifications,
  relativeTime,
  unreadCount,
  unreadIds,
} from '../src/lib/features/notifications.ts';

/** Local-time ISO string, so grouping tests don't depend on the runner's TZ. */
const localISO = (y, m, d, hh = 12, mm = 0) => new Date(y, m - 1, d, hh, mm).toISOString();

const note = (over = {}) => ({
  id: 'n1',
  kind: 'memory',
  title: 'A new memory',
  body: null,
  href: '/memories',
  actorId: 'user-a',
  readAt: null,
  createdAt: localISO(2026, 10, 21, 9),
  ...over,
});

test('KINDS covers every kind the migration lists', () => {
  assert.deepEqual(
    [...KINDS].sort(),
    [
      'anniversary',
      'event',
      'gift',
      'habit',
      'hug',
      'letter',
      'memory',
      'message',
      'mood',
      'note',
      'photo',
      'ping',
    ]
  );
});

test('iconFor gives a stable key per kind and never repeats the default', () => {
  const keys = KINDS.map(iconFor);
  assert.equal(new Set(keys).size, KINDS.length, 'each kind has its own icon');
  assert.ok(!keys.includes(DEFAULT_ICON), 'known kinds do not fall back');
  // Stable across calls — the UI keys render on it.
  assert.equal(iconFor('photo'), iconFor('photo'));
});

test('iconFor degrades for an unknown, empty or non-string kind', () => {
  // kind is free text in the database, so this is a normal path, not an error.
  assert.equal(iconFor('spaceship'), DEFAULT_ICON);
  assert.equal(iconFor(''), DEFAULT_ICON);
  assert.equal(iconFor(null), DEFAULT_ICON);
  assert.equal(iconFor(undefined), DEFAULT_ICON);
  assert.equal(iconFor(42), DEFAULT_ICON);
});

test('iconFor is case and whitespace tolerant', () => {
  assert.equal(iconFor('  Photo '), iconFor('photo'));
});

test('isKnownKind only accepts the listed kinds', () => {
  assert.equal(isKnownKind('hug'), true);
  assert.equal(isKnownKind('hugs'), false);
});

test('describe prefers the stored body', () => {
  // For a chat message the body is the sender's own preview — the only text
  // this device is allowed to show.
  assert.equal(describe(note({ kind: 'message', body: 'Avi: miss you' }), 'Avi'), 'Avi: miss you');
});

test('describe falls back to a per-kind line naming the actor', () => {
  assert.match(describe(note({ kind: 'letter' }), 'Avi'), /^Avi wrote you a letter/);
  assert.match(describe(note({ kind: 'hug' }), 'Avi'), /hug/);
  // App-raised kinds have no actor at all.
  assert.ok(!describe(note({ kind: 'anniversary', actorId: null }), null).includes('{actor}'));
});

test('describe stands in for a missing actor name', () => {
  assert.match(describe(note({ kind: 'note' }), null), /^Your partner/);
  assert.match(describe(note({ kind: 'note' }), '   '), /^Your partner/);
});

test('describe degrades for an unknown kind instead of throwing', () => {
  const line = describe(note({ kind: 'spaceship' }), 'Avi');
  assert.ok(line.length > 0);
  assert.ok(!line.includes('{actor}'));
  assert.ok(line.includes('Avi'));
});

test('describe ignores a blank body', () => {
  assert.match(describe(note({ kind: 'photo', body: '   ' }), 'Avi'), /shared a photo/);
});

test('unreadCount and unreadIds count only unopened rows', () => {
  const list = [
    note({ id: 'a', readAt: null }),
    note({ id: 'b', readAt: localISO(2026, 10, 21, 10) }),
    note({ id: 'c', readAt: null }),
  ];
  assert.equal(unreadCount(list), 2);
  assert.deepEqual(unreadIds(list), ['a', 'c']);
  assert.equal(unreadCount([]), 0);
  assert.deepEqual(unreadIds([]), []);
});

test('badgeLabel caps the display at 9+', () => {
  assert.equal(badgeLabel(0), null);
  assert.equal(badgeLabel(-3), null);
  assert.equal(badgeLabel(1), '1');
  assert.equal(badgeLabel(9), '9');
  assert.equal(badgeLabel(10), '9+');
  assert.equal(badgeLabel(248), '9+');
});

test('dayLabel says Today / Yesterday, else a date', () => {
  const now = new Date(2026, 9, 21, 15, 0);
  assert.equal(dayLabel(localISO(2026, 10, 21, 9), now), 'Today');
  assert.equal(dayLabel(localISO(2026, 10, 20, 23), now), 'Yesterday');
  assert.match(dayLabel(localISO(2026, 10, 12, 9), now), /Oct/);
  assert.equal(dayLabel('not-a-date', now), 'Unknown');
});

test('groupByDay keeps feed order and starts a new group per day', () => {
  const now = new Date(2026, 9, 21, 15, 0);
  const list = [
    note({ id: 'a', createdAt: localISO(2026, 10, 21, 14) }),
    note({ id: 'b', createdAt: localISO(2026, 10, 21, 9) }),
    note({ id: 'c', createdAt: localISO(2026, 10, 20, 22) }),
  ];
  const groups = groupByDay(list, now);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'Today');
  assert.deepEqual(groups[0].items.map((n) => n.id), ['a', 'b']);
  assert.equal(groups[1].label, 'Yesterday');
  assert.deepEqual(groups[1].items.map((n) => n.id), ['c']);
});

test('groupByDay keeps a row with a broken timestamp', () => {
  const now = new Date(2026, 9, 21, 15, 0);
  const groups = groupByDay([note({ id: 'x', createdAt: 'nonsense' })], now);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].label, 'Unknown');
  assert.deepEqual(groups[0].items.map((n) => n.id), ['x']);
});

test('groupByDay handles an empty feed', () => {
  assert.deepEqual(groupByDay([], new Date(2026, 9, 21)), []);
});

test('relativeTime gives a compact stamp', () => {
  const now = Date.parse('2026-10-21T12:00:00.000Z');
  const ago = (ms) => relativeTime(new Date(now - ms).toISOString(), now);
  assert.equal(ago(5_000), 'just now');
  assert.equal(ago(12 * 60_000), '12m');
  assert.equal(ago(5 * 3_600_000), '5h');
  assert.equal(ago(3 * 86_400_000), '3d');
  assert.equal(ago(21 * 86_400_000), '3w');
  assert.equal(relativeTime('not-a-date', now), '');
  // A clock skewed into the future reads as "just now", never negative.
  assert.equal(relativeTime(new Date(now + 60_000).toISOString(), now), 'just now');
});

test('mergeNotifications de-duplicates by id and keeps newest first', () => {
  const existing = [
    note({ id: 'a', createdAt: localISO(2026, 10, 21, 9) }),
    note({ id: 'b', createdAt: localISO(2026, 10, 20, 9) }),
  ];
  const incoming = [
    note({ id: 'a', createdAt: localISO(2026, 10, 21, 9), readAt: localISO(2026, 10, 21, 10) }),
    note({ id: 'c', createdAt: localISO(2026, 10, 22, 9) }),
  ];
  const merged = mergeNotifications(existing, incoming);
  assert.deepEqual(merged.map((n) => n.id), ['c', 'a', 'b']);
  // The arriving copy wins, so a realtime "read" update isn't undone.
  assert.ok(merged[1].readAt);
});

test('mergeNotifications orders rows that share a timestamp stably', () => {
  const at = localISO(2026, 10, 21, 9);
  const first = mergeNotifications([note({ id: 'a', createdAt: at })], [note({ id: 'b', createdAt: at })]);
  const second = mergeNotifications([note({ id: 'b', createdAt: at })], [note({ id: 'a', createdAt: at })]);
  assert.deepEqual(first.map((n) => n.id), second.map((n) => n.id));
});
