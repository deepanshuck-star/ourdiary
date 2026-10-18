import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  collectActivity,
  computeStreak,
  milestoneToCelebrate,
  nextMilestone,
  recentDays,
} from '../src/lib/features/streak.ts';

const ONLY_A = { user_1: true, user_2: false };
const ONLY_B = { user_1: false, user_2: true };

/** Activity map with one partner active on each listed day. */
function days(start, count, who = ONLY_A, skip = []) {
  const map = {};
  for (let i = 0; i < count; i++) {
    const d = addDays(start, i);
    if (!skip.includes(d)) map[d] = { ...who };
  }
  return map;
}

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2025-12-31', 1), '2026-01-01');
  assert.equal(addDays('2024-03-01', -1), '2024-02-29');
});

test('either partner keeps the couple streak alive', () => {
  const activity = {
    '2026-01-01': ONLY_A,
    '2026-01-02': ONLY_B,
    '2026-01-03': { user_1: true, user_2: true },
  };
  const r = computeStreak(activity, '2026-01-03');
  assert.equal(r.current, 3);
  assert.equal(r.todayDone, true);
});

test('today being open does not break the streak', () => {
  const r = computeStreak(days('2026-01-01', 3), '2026-01-04');
  assert.equal(r.current, 3);
  assert.equal(r.todayDone, false);
  assert.deepEqual(r.frozenDays, []);
});

test('a missed day without freezes resets the streak', () => {
  const activity = { ...days('2026-01-01', 3), ...days('2026-01-05', 2) };
  const r = computeStreak(activity, '2026-01-06');
  assert.equal(r.current, 2);
  assert.equal(r.longest, 3);
});

test('a 7-day streak earns one freeze, capped at two', () => {
  assert.equal(computeStreak(days('2026-01-01', 6), '2026-01-06').freezes, 0);
  assert.equal(computeStreak(days('2026-01-01', 7), '2026-01-07').freezes, 1);
  assert.equal(computeStreak(days('2026-01-01', 14), '2026-01-14').freezes, 2);
  assert.equal(computeStreak(days('2026-01-01', 28), '2026-01-28').freezes, 2);
});

test('a freeze covers a single missed day', () => {
  const activity = days('2026-01-01', 10, ONLY_A, ['2026-01-08']);
  const r = computeStreak(activity, '2026-01-10');
  assert.equal(r.current, 9, 'frozen day does not add to the count, but keeps it going');
  assert.equal(r.freezes, 0);
  assert.deepEqual(r.frozenDays, ['2026-01-08']);
});

test('two missed days in a row end the streak and return the freeze', () => {
  const activity = days('2026-01-01', 12, ONLY_A, ['2026-01-08', '2026-01-09']);
  const r = computeStreak(activity, '2026-01-12');
  assert.equal(r.current, 3);
  assert.equal(r.longest, 7);
  assert.equal(r.freezes, 1);
  assert.deepEqual(r.frozenDays, []);
});

test('yesterday frozen while today is still open keeps the streak', () => {
  const r = computeStreak(days('2026-01-01', 7), '2026-01-09');
  assert.equal(r.current, 7);
  assert.equal(r.freezes, 0);
  assert.deepEqual(r.frozenDays, ['2026-01-08']);
});

test('no activity means a zero streak', () => {
  assert.deepEqual(computeStreak({}, '2026-01-01'), {
    current: 0,
    longest: 0,
    freezes: 0,
    frozenDays: [],
    todayDone: false,
  });
});

test('collectActivity merges spark answers and moods per partner', () => {
  const map = collectActivity({
    sparkAnswers: [
      { date: '2026-02-01', answers: { user_1: { answeredAt: '2026-02-01T10:00:00' } } },
      { date: '2026-02-02', answers: { user_2: {} } },
    ],
    moodSnapshots: [{ profileId: 'user_2', updatedAt: '2026-02-01T20:00:00' }],
    currentMoods: { user_1: { updatedAt: '2026-02-03T09:00:00' } },
  });
  assert.deepEqual(map['2026-02-01'], { user_1: true, user_2: true });
  assert.deepEqual(map['2026-02-02'], { user_1: false, user_2: true });
  assert.deepEqual(map['2026-02-03'], { user_1: true, user_2: false });
});

test('recentDays returns a 7-day strip ending today', () => {
  const strip = recentDays({ '2026-01-07': ONLY_B }, '2026-01-07', ['2026-01-05']);
  assert.equal(strip.length, 7);
  assert.equal(strip[0].date, '2026-01-01');
  assert.equal(strip[6].isToday, true);
  assert.equal(strip[6].user_2, true);
  assert.equal(strip[4].frozen, true);
});

test('milestones celebrate once and point to the next one', () => {
  assert.equal(milestoneToCelebrate(6, []), null);
  assert.equal(milestoneToCelebrate(7, []), 7);
  assert.equal(milestoneToCelebrate(31, [7]), 30);
  assert.equal(milestoneToCelebrate(31, [7, 30]), null);
  assert.equal(nextMilestone(31), 100);
  assert.equal(nextMilestone(400), null);
});
