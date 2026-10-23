import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arrivalPhrase,
  daysBetweenISO,
  daysUntilArrival,
  isValidISODate,
  nextArrival,
  packageStatus,
  sortPackages,
  transitDays,
  validatePackage,
} from '../src/lib/features/carePackages.ts';

const pkg = (over = {}) => ({
  id: 'p1',
  title: 'A jumper and too much chocolate',
  fromId: 'me',
  toId: 'them',
  sentOn: '2026-03-01',
  expectedOn: '2026-03-10',
  createdAt: '2026-03-01T09:00:00.000Z',
  ...over,
});

test('daysBetweenISO counts whole days across a month and a DST change', () => {
  assert.equal(daysBetweenISO('2026-03-01', '2026-03-10'), 9);
  assert.equal(daysBetweenISO('2026-03-10', '2026-03-01'), -9);
  assert.equal(daysBetweenISO('2026-02-27', '2026-03-02'), 3);
  // Late-March UK clock change: still 2 calendar days, not 1.96.
  assert.equal(daysBetweenISO('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetweenISO('2026-03-01', 'rubbish'), 0);
});

test('isValidISODate rejects impossible days', () => {
  assert.equal(isValidISODate('2026-02-28'), true);
  assert.equal(isValidISODate('2026-02-31'), false);
  assert.equal(isValidISODate('2026-13-01'), false);
  assert.equal(isValidISODate('1/3/2026'), false);
  assert.equal(isValidISODate(''), false);
});

test('status moves from on-the-way through arriving-today to overdue', () => {
  assert.equal(packageStatus(pkg(), '2026-03-05'), 'on-the-way');
  assert.equal(packageStatus(pkg(), '2026-03-10'), 'arriving-today');
  assert.equal(packageStatus(pkg(), '2026-03-12'), 'overdue');
  assert.equal(packageStatus(pkg({ arrivedOn: '2026-03-12' }), '2026-03-20'), 'arrived');
  assert.equal(daysUntilArrival(pkg(), '2026-03-05'), 5);
});

test('transitDays reports what it actually took', () => {
  assert.equal(transitDays(pkg()), null);
  assert.equal(transitDays(pkg({ arrivedOn: '2026-03-13' })), 12);
  // Clocked as arriving before it was posted: clamp rather than go negative.
  assert.equal(transitDays(pkg({ arrivedOn: '2026-02-20' })), 0);
});

test('arrivalPhrase reads like a person wrote it', () => {
  assert.equal(arrivalPhrase(pkg(), '2026-03-09'), 'Lands tomorrow');
  assert.equal(arrivalPhrase(pkg(), '2026-03-07'), '3 days out');
  assert.equal(arrivalPhrase(pkg(), '2026-03-10'), 'Should land today');
  assert.equal(arrivalPhrase(pkg(), '2026-03-11'), '1 day late');
  assert.equal(arrivalPhrase(pkg(), '2026-03-14'), '4 days late');
  assert.equal(arrivalPhrase(pkg({ arrivedOn: '2026-03-02' }), '2026-03-20'), 'Arrived — 1 day in the post');
  assert.equal(arrivalPhrase(pkg({ arrivedOn: '2026-03-11' }), '2026-03-20'), 'Arrived — 10 days in the post');
});

test('things still in the post sort above things already opened', () => {
  const packages = [
    pkg({ id: 'old', arrivedOn: '2026-03-02' }),
    pkg({ id: 'late', expectedOn: '2026-03-04' }),
    pkg({ id: 'soon', expectedOn: '2026-03-06' }),
    pkg({ id: 'newer', arrivedOn: '2026-03-08' }),
  ];
  assert.deepEqual(
    sortPackages(packages, '2026-03-05').map((p) => p.id),
    ['late', 'soon', 'newer', 'old']
  );
  assert.equal(nextArrival(packages, '2026-03-05').id, 'late');
  assert.equal(nextArrival([pkg({ arrivedOn: '2026-03-02' })], '2026-03-05'), null);
});

test('validatePackage catches the mistakes that matter', () => {
  assert.match(validatePackage({ title: '', sentOn: '2026-03-01', expectedOn: '2026-03-10' }), /name/);
  assert.match(validatePackage({ title: 'x', sentOn: 'nope', expectedOn: '2026-03-10' }), /posted it/);
  assert.match(
    validatePackage({ title: 'x', sentOn: '2026-03-10', expectedOn: '2026-03-01' }),
    /can’t arrive before/
  );
  assert.equal(validatePackage({ title: 'x', sentOn: '2026-03-01', expectedOn: '2026-03-01' }), null);
});
