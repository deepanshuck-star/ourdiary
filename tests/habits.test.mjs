import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_HABIT_TITLE,
  clampSeverity,
  severityLabel,
  sortHabits,
  splitByPerson,
  tallyHabits,
  validateHabit,
} from '../src/lib/features/habits.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

const habit = (over = {}) => ({
  id: 'h1',
  aboutUserId: 'me',
  title: 'Leaves mugs everywhere',
  severity: 1,
  forgiven: false,
  createdAt: '2026-10-01T09:00:00.000Z',
  ...over,
});

test('validateHabit requires a title and caps the lengths', () => {
  assert.equal(validateHabit('Snores', ''), null);
  assert.match(validateHabit('   ', ''), /name/i);
  assert.match(validateHabit('a'.repeat(MAX_HABIT_TITLE + 1), ''), /under/i);
  assert.match(validateHabit('Snores', 'x'.repeat(2001)), /too long/i);
  // Whitespace is trimmed before saving, so it must not count.
  assert.equal(validateHabit('  Snores  ', '  note  '), null);
});

test('clampSeverity keeps values inside 1-3', () => {
  assert.equal(clampSeverity(0), 1);
  assert.equal(clampSeverity(1), 1);
  assert.equal(clampSeverity(2), 2);
  assert.equal(clampSeverity(3), 3);
  assert.equal(clampSeverity(99), 3);
});

test('severityLabel falls back rather than rendering blank', () => {
  assert.equal(severityLabel(1), 'Mildly annoying');
  assert.equal(severityLabel(3), 'We need to talk');
  assert.equal(severityLabel(42), 'Mildly annoying');
});

test('sortHabits puts unforgiven first, then most severe, then newest', () => {
  const sorted = sortHabits([
    habit({ id: 'forgiven-severe', severity: 3, forgiven: true }),
    habit({ id: 'mild', severity: 1 }),
    habit({ id: 'severe', severity: 3 }),
    habit({ id: 'mild-newer', severity: 1, createdAt: '2026-10-05T09:00:00.000Z' }),
  ]);
  assert.deepEqual(
    sorted.map((h) => h.id),
    ['severe', 'mild-newer', 'mild', 'forgiven-severe']
  );
});

test('sortHabits keeps forgiven habits rather than dropping them', () => {
  // Keeping the record is the point of the feature.
  const sorted = sortHabits([habit({ id: 'a', forgiven: true })]);
  assert.equal(sorted.length, 1);
});

test('sortHabits does not mutate its input', () => {
  const input = [habit({ id: 'a', severity: 1 }), habit({ id: 'b', severity: 3 })];
  sortHabits(input);
  assert.deepEqual(input.map((h) => h.id), ['a', 'b']);
});

test('splitByPerson separates mine from theirs', () => {
  const habits = [
    habit({ id: 'mine', aboutUserId: 'me' }),
    habit({ id: 'theirs', aboutUserId: 'them' }),
  ];
  const { mine, theirs } = splitByPerson(habits, 'me');
  assert.deepEqual(mine.map((h) => h.id), ['mine']);
  assert.deepEqual(theirs.map((h) => h.id), ['theirs']);
});

test('splitByPerson shows everything as the partner’s when there is no signed-in user', () => {
  // Better than silently dropping rows from both columns.
  const habits = [habit({ id: 'a' }), habit({ id: 'b', aboutUserId: 'them' })];
  const { mine, theirs } = splitByPerson(habits, null);
  assert.equal(mine.length, 0);
  assert.equal(theirs.length, 2);
});

test('tallyHabits counts outstanding versus forgiven', () => {
  const habits = [habit({ id: 'a' }), habit({ id: 'b', forgiven: true }), habit({ id: 'c' })];
  assert.deepEqual(tallyHabits(habits), { total: 3, forgiven: 1, outstanding: 2 });
  assert.deepEqual(tallyHabits([]), { total: 0, forgiven: 0, outstanding: 0 });
});

test('Migration 17: bad_habits has RLS, a sender-bound insert and an author-only delete', () => {
  const sql = read('supabase', 'migrations', '20261014000017_bad_habits_and_gifts.sql');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.bad_habits'));
  assert.ok(sql.includes('ALTER TABLE public.bad_habits ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('created_by = auth.uid()'));
  assert.ok(sql.includes('public.is_couple_member(couple_id)'));
  assert.ok(sql.includes('severity BETWEEN 1 AND 3'));
});

test('habits.ts data layer targets the bad_habits table', () => {
  const src = read('src', 'lib', 'supabase', 'habits.ts');
  assert.ok(src.includes("from('bad_habits')"));
  assert.ok(src.includes('export async function fetchHabitsRemote'));
  assert.ok(src.includes('export async function createHabitRemote'));
  assert.ok(src.includes('export async function updateHabitRemote'));
  assert.ok(src.includes('export async function deleteHabitRemote'));
});
