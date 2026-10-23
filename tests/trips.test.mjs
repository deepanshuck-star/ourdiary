import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntilTrip,
  nextTrip,
  parseAmount,
  sortTrips,
  splitTrip,
  tripNights,
  tripStatus,
  validateTrip,
} from '../src/lib/features/trips.ts';

const trip = (over = {}) => ({
  id: 't1',
  title: 'Ritesh comes to London',
  startDate: '2026-05-01',
  endDate: '2026-05-10',
  costs: [],
  createdBy: 'a',
  createdAt: '2026-03-01T09:00:00.000Z',
  ...over,
});

const cost = (amount, paidBy, id = 'c') => ({
  id,
  label: 'Flights',
  amount,
  paidBy,
  createdAt: '2026-03-01T09:00:00.000Z',
});

test('countdown and status track the visit, not the booking', () => {
  assert.equal(daysUntilTrip(trip(), '2026-03-15'), 47);
  assert.equal(tripStatus(trip(), '2026-03-15'), 'upcoming');
  assert.equal(tripStatus(trip(), '2026-05-01'), 'together-now');
  assert.equal(tripStatus(trip(), '2026-05-10'), 'together-now');
  assert.equal(tripStatus(trip(), '2026-05-11'), 'past');
  assert.equal(tripNights(trip()), 9);
  assert.equal(tripNights(trip({ endDate: undefined })), 0);
});

test('a one-day visit with no end date is over the day after', () => {
  const day = trip({ endDate: undefined, startDate: '2026-05-01' });
  assert.equal(tripStatus(day, '2026-05-01'), 'together-now');
  assert.equal(tripStatus(day, '2026-05-02'), 'past');
});

test('costs split 50/50 and name who tops up whom', () => {
  const t = trip({ costs: [cost(240, 'a', 'c1'), cost(60, 'b', 'c2')] });
  const split = splitTrip(t, 'a', 'b');
  assert.equal(split.total, 300);
  assert.equal(split.fairShare, 150);
  assert.deepEqual(split.paid, { a: 240, b: 60 });
  assert.deepEqual(split.owes, { from: 'b', to: 'a', amount: 90 });
});

test('splitting an odd number of pence does not invent or lose money', () => {
  const t = trip({ costs: [cost(0.01, 'a', 'c1')] });
  const split = splitTrip(t, 'a', 'b');
  assert.equal(split.total, 0.01);
  // Half a penny rounds to a penny rather than vanishing.
  assert.deepEqual(split.owes, { from: 'b', to: 'a', amount: 0.01 });
});

test('money math stays exact where floats would drift', () => {
  const t = trip({ costs: [cost(0.1, 'a', 'c1'), cost(0.2, 'a', 'c2')] });
  assert.equal(splitTrip(t, 'a', 'b').total, 0.3);
});

test('already even means nobody owes anything', () => {
  const t = trip({ costs: [cost(100, 'a', 'c1'), cost(100, 'b', 'c2')] });
  assert.equal(splitTrip(t, 'a', 'b').owes, null);
  assert.equal(splitTrip(trip(), 'a', 'b').owes, null);
});

test('a cost paid by neither of the current two counts but cannot be settled', () => {
  const t = trip({ costs: [cost(50, 'ghost', 'c1')] });
  const split = splitTrip(t, 'a', 'b');
  assert.equal(split.total, 50);
  assert.deepEqual(split.paid, { a: 0, b: 0 });
  assert.equal(split.owes, null);
});

test('nextTrip is the soonest one still ahead', () => {
  const trips = [
    trip({ id: 'past', startDate: '2026-01-01', endDate: '2026-01-05' }),
    trip({ id: 'far', startDate: '2026-09-01', endDate: undefined }),
    trip({ id: 'near', startDate: '2026-05-01', endDate: undefined }),
  ];
  assert.equal(nextTrip(trips, '2026-03-15').id, 'near');
  assert.deepEqual(sortTrips(trips, '2026-03-15').map((t) => t.id), ['near', 'far', 'past']);
  assert.equal(nextTrip([trips[0]], '2026-03-15'), null);
});

test('a visit happening right now is still the next one', () => {
  const trips = [trip({ id: 'now', startDate: '2026-05-01', endDate: '2026-05-10' })];
  assert.equal(nextTrip(trips, '2026-05-03').id, 'now');
  assert.equal(daysUntilTrip(trips[0], '2026-05-03'), -2);
});

test('validateTrip and parseAmount reject the obvious nonsense', () => {
  assert.match(validateTrip({ title: '', startDate: '2026-05-01' }), /Name the visit/);
  assert.match(validateTrip({ title: 'x', startDate: 'soon' }), /day you arrive/);
  assert.match(
    validateTrip({ title: 'x', startDate: '2026-05-10', endDate: '2026-05-01' }),
    /end before it starts/
  );
  assert.equal(validateTrip({ title: 'x', startDate: '2026-05-01', endDate: '' }), null);

  assert.equal(parseAmount('240'), 240);
  assert.equal(parseAmount('1,240.50'), 1240.5);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseAmount('12.345'), null);
});
