import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_NOTE_LENGTH,
  deliveryInstant,
  isDue,
  mailboxFor,
  markOpened,
  pruneNotes,
  validateNote,
} from '../src/lib/features/morningMail.ts';

const NOW = Date.UTC(2026, 2, 10, 6, 0);
const iso = (ms) => new Date(ms).toISOString();

const note = (over = {}) => ({
  id: 'n1',
  fromId: 'me',
  toId: 'them',
  content: 'morning you',
  createdAt: iso(NOW - 3_600_000),
  deliverAt: iso(NOW + 3_600_000),
  ...over,
});

test('validateNote rejects blank and over-long notes', () => {
  assert.equal(validateNote('  '), 'Write something first.');
  assert.equal(validateNote('hi'), null);
  assert.match(validateNote('x'.repeat(MAX_NOTE_LENGTH + 1)), /too long/);
});

test('a note addressed to me that is not due yet appears nowhere', () => {
  const notes = [note({ id: 'sealed', fromId: 'them', toId: 'me', deliverAt: iso(NOW + 3_600_000) })];
  const box = mailboxFor(notes, 'me', NOW);
  assert.deepEqual(box.arrived, []);
  assert.deepEqual(box.unopened, []);
  assert.deepEqual(box.queued, []);
  assert.deepEqual(box.delivered, []);
});

test('the sender sees their own note waiting in the queue', () => {
  const notes = [note({ id: 'sealed' })];
  const box = mailboxFor(notes, 'me', NOW);
  assert.deepEqual(box.queued.map((n) => n.id), ['sealed']);
  assert.deepEqual(box.delivered, []);
});

test('once due it lands for the recipient and counts as unopened', () => {
  const notes = [
    note({ id: 'landed', fromId: 'them', toId: 'me', deliverAt: iso(NOW - 60_000) }),
    note({ id: 'opened', fromId: 'them', toId: 'me', deliverAt: iso(NOW - 120_000), openedAt: iso(NOW) }),
  ];
  const box = mailboxFor(notes, 'me', NOW);
  assert.deepEqual(box.arrived.map((n) => n.id).sort(), ['landed', 'opened']);
  assert.deepEqual(box.unopened.map((n) => n.id), ['landed']);
});

test('mailboxFor without an id returns nothing rather than everything', () => {
  const box = mailboxFor([note(), note({ id: 'n2', toId: 'me' })], null, NOW);
  assert.deepEqual(box, { arrived: [], unopened: [], queued: [], delivered: [] });
});

test('a note with a broken due date is released, not lost', () => {
  assert.equal(isDue(note({ deliverAt: 'not-a-date' }), NOW), true);
});

test('deliveryInstant waits for their morning only when they are actually asleep', () => {
  const wake = NOW + 5 * 3_600_000;
  assert.equal(deliveryInstant(NOW, true, wake), wake);
  assert.equal(deliveryInstant(NOW, false, wake), NOW);
  // A wake time already behind us must not schedule into the past.
  assert.equal(deliveryInstant(NOW, true, NOW - 1_000), NOW);
});

test('markOpened stamps once and leaves the first time alone', () => {
  const first = markOpened([note({ id: 'a' })], ['a'], iso(NOW));
  assert.equal(first[0].openedAt, iso(NOW));
  const again = markOpened(first, ['a'], iso(NOW + 60_000));
  assert.equal(again[0].openedAt, iso(NOW));
  assert.equal(markOpened(first, [], iso(NOW)), first);
});

test('pruneNotes drops old deliveries but never anything still sealed', () => {
  const notes = [
    note({ id: 'ancient', deliverAt: iso(NOW - 60 * 86_400_000) }),
    note({ id: 'recent', deliverAt: iso(NOW - 2 * 86_400_000) }),
    note({ id: 'sealed', deliverAt: iso(NOW + 86_400_000) }),
  ];
  assert.deepEqual(
    pruneNotes(notes, NOW).map((n) => n.id).sort(),
    ['recent', 'sealed']
  );
});
