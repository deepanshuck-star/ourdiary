import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitDuration,
  nextAnnual,
  nextDayMilestone,
  calendarDaysUntil,
  buildAutoCountdowns,
  memoriesOnThisDay,
  toISODate,
} from '../src/lib/features/countdowns.ts';

test('splitDuration breaks ms into d/h/m/s', () => {
  const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
  assert.deepEqual(splitDuration(ms), { past: false, totalMs: ms, days: 2, hours: 3, minutes: 4, seconds: 5 });
  assert.equal(splitDuration(-1000).past, true);
});

test('nextAnnual picks this year if not passed, else next year; today counts', () => {
  const now = new Date(2026, 9, 18, 15, 0);
  assert.equal(toISODate(nextAnnual('2020-12-01', now).date), '2026-12-01');
  assert.equal(nextAnnual('2020-12-01', now).years, 6);
  assert.equal(toISODate(nextAnnual('2020-01-05', now).date), '2027-01-05');
  assert.equal(toISODate(nextAnnual('2021-10-18', now).date), '2026-10-18');
});

test('Feb 29 anniversaries fall back to Feb 28 in non-leap years', () => {
  assert.equal(toISODate(nextAnnual('2020-02-29', new Date(2026, 9, 18)).date), '2027-02-28');
  assert.equal(toISODate(nextAnnual('2020-02-29', new Date(2027, 5, 1)).date), '2028-02-29');
});

test('nextDayMilestone and calendarDaysUntil', () => {
  const now = new Date(2026, 0, 1);
  const m = nextDayMilestone('2025-12-01', now);
  assert.equal(m.days, 100);
  assert.equal(toISODate(m.date), '2026-03-11');
  assert.equal(calendarDaysUntil(m.date, now), 69);
});

test('buildAutoCountdowns includes anniversary, milestone and upcoming events in order', () => {
  const now = new Date(2026, 9, 18, 12, 0);
  const items = buildAutoCountdowns(
    { startDate: '2024-01-10', anniversaryDate: '2024-02-14' },
    [
      { id: 'a', title: 'Past', date: '2026-10-01' },
      { id: 'b', title: 'Later', date: '2026-12-24' },
      { id: 'c', title: 'Soon', date: '2026-10-20', time: '19:30' },
      { id: 'd', title: 'Earlier today', date: '2026-10-18', time: '08:00' },
    ],
    now
  );
  assert.equal(items[0].kind, 'anniversary');
  assert.equal(toISODate(new Date(items[0].target)), '2027-02-14');
  assert.equal(items[1].kind, 'milestone');
  assert.deepEqual(items.filter((i) => i.kind === 'event').map((i) => i.title), ['Soon', 'Later']);
});

test('memoriesOnThisDay matches month/day from earlier years only', () => {
  const mems = [
    { id: 1, date: '2024-10-18' },
    { id: 2, date: '2026-10-18' },
    { id: 3, date: '2023-10-19' },
  ];
  assert.deepEqual(memoriesOnThisDay(mems, '2026-10-18').map((m) => m.id), [1]);
});
