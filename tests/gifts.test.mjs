import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_GIFT_TITLE,
  formatGiftDate,
  sortGifts,
  splitByDirection,
  tallyGifts,
  validateGift,
} from '../src/lib/features/gifts.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

const gift = (over = {}) => ({
  id: 'g1',
  fromUserId: 'them',
  toUserId: 'me',
  title: 'The blue scarf',
  givenOn: '2026-10-01',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});

test('validateGift requires a title and caps the lengths', () => {
  assert.equal(validateGift('Scarf', ''), null);
  assert.match(validateGift('  ', ''), /what was the gift/i);
  assert.match(validateGift('a'.repeat(MAX_GIFT_TITLE + 1), ''), /under/i);
  assert.match(validateGift('Scarf', 'x'.repeat(2001)), /too long/i);
});

test('sortGifts orders by the day it was given, newest first', () => {
  const sorted = sortGifts([
    gift({ id: 'old', givenOn: '2025-01-01' }),
    gift({ id: 'new', givenOn: '2026-12-25' }),
    gift({ id: 'mid', givenOn: '2026-06-01' }),
  ]);
  assert.deepEqual(sorted.map((g) => g.id), ['new', 'mid', 'old']);
});

test('sortGifts falls back to when it was logged if no date was given', () => {
  // A dateless gift shouldn't jump to the top or sink out of sight.
  const sorted = sortGifts([
    gift({ id: 'dated-old', givenOn: '2025-01-01' }),
    gift({ id: 'undated', givenOn: null, createdAt: '2026-06-01T09:00:00.000Z' }),
    gift({ id: 'dated-new', givenOn: '2026-12-25' }),
  ]);
  assert.deepEqual(sorted.map((g) => g.id), ['dated-new', 'undated', 'dated-old']);
});

test('sortGifts does not mutate its input', () => {
  const input = [gift({ id: 'a', givenOn: '2025-01-01' }), gift({ id: 'b', givenOn: '2026-01-01' })];
  sortGifts(input);
  assert.deepEqual(input.map((g) => g.id), ['a', 'b']);
});

test('splitByDirection reads the same row from both ends', () => {
  const gifts = [
    gift({ id: 'to-me', fromUserId: 'them', toUserId: 'me' }),
    gift({ id: 'from-me', fromUserId: 'me', toUserId: 'them' }),
  ];

  const mine = splitByDirection(gifts, 'me');
  assert.deepEqual(mine.received.map((g) => g.id), ['to-me']);
  assert.deepEqual(mine.given.map((g) => g.id), ['from-me']);

  // The partner sees the same two rows the other way round.
  const theirs = splitByDirection(gifts, 'them');
  assert.deepEqual(theirs.received.map((g) => g.id), ['from-me']);
  assert.deepEqual(theirs.given.map((g) => g.id), ['to-me']);
});

test('splitByDirection never puts one gift in both lists', () => {
  const gifts = [gift({ id: 'a', fromUserId: 'them', toUserId: 'me' })];
  const { received, given } = splitByDirection(gifts, 'me');
  assert.equal(received.length + given.length, 1);
});

test('splitByDirection drops rows involving neither of us', () => {
  // Stale data is better left out than shown under the wrong heading.
  const { received, given } = splitByDirection([gift({ fromUserId: 'x', toUserId: 'y' })], 'me');
  assert.equal(received.length, 0);
  assert.equal(given.length, 0);
});

test('splitByDirection returns empty lists with no signed-in user', () => {
  const { received, given } = splitByDirection([gift()], null);
  assert.equal(received.length, 0);
  assert.equal(given.length, 0);
});

test('formatGiftDate renders the local day, not a UTC-shifted one', () => {
  // A bare YYYY-MM-DD parses as UTC midnight, which renders as the previous
  // day anywhere west of Greenwich — the formatter must not do that.
  // Asserted without assuming a day-first or month-first locale: the point
  // is that the 1st of October doesn't come out as the 30th of September.
  const formatted = formatGiftDate('2026-10-01');
  assert.match(formatted, /\b1\b/);
  assert.match(formatted, /2026/);
  assert.equal(/Sep/i.test(formatted), false);
  assert.equal(/\b30\b/.test(formatted), false);
  assert.equal(formatGiftDate(null), 'Date not set');
  assert.equal(formatGiftDate(undefined), 'Date not set');
  assert.equal(formatGiftDate(''), 'Date not set');
  assert.equal(formatGiftDate('garbage'), 'Date not set');
});

test('tallyGifts counts each direction', () => {
  const gifts = [
    gift({ id: 'a', fromUserId: 'them', toUserId: 'me' }),
    gift({ id: 'b', fromUserId: 'them', toUserId: 'me' }),
    gift({ id: 'c', fromUserId: 'me', toUserId: 'them' }),
  ];
  assert.deepEqual(tallyGifts(gifts, 'me'), { received: 2, given: 1 });
});

test('Migration 17: gifts has RLS and a giver that differs from the receiver', () => {
  const sql = read('supabase', 'migrations', '20261014000017_bad_habits_and_gifts.sql');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.gifts'));
  assert.ok(sql.includes('ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('gifts_distinct_parties'));
  assert.ok(sql.includes('from_user_id <> to_user_id'));
  assert.ok(sql.includes('created_by = auth.uid()'));
});

test('gifts.ts data layer targets the gifts table', () => {
  const src = read('src', 'lib', 'supabase', 'gifts.ts');
  assert.ok(src.includes("from('gifts')"));
  assert.ok(src.includes('export async function fetchGiftsRemote'));
  assert.ok(src.includes('export async function createGiftRemote'));
  assert.ok(src.includes('export async function deleteGiftRemote'));
});

test('a gift photo is cleaned up when its row fails to save or is deleted', () => {
  const src = read('src', 'app', 'gifts', 'page.tsx');
  assert.ok(src.includes('destroyCloudinaryAsset'));
  // Upload-then-insert can fail at the insert; the image must not be orphaned.
  assert.ok(src.includes('if (photoPublicId) await destroyCloudinaryAsset(photoPublicId'));
});

test('chat bubbles align by sender, WhatsApp style', () => {
  const src = read('src', 'app', 'chat', 'page.tsx');
  assert.ok(src.includes("message.mine ? 'justify-end' : 'justify-start'"));
  // And are visually distinct, not just differently aligned.
  assert.ok(src.includes("'bg-primary text-on-primary rounded-br-md'"));
});
