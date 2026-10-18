import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters, evaluateUnlock, isValidLatLng, formatDistance } from '../src/lib/features/surprises.ts';

const base = {
  id: 'n',
  fromId: 'user_1',
  toId: 'user_2',
  teaser: 't',
  message: 'm',
  createdAt: '2026-01-01T00:00:00Z',
  rule: 'all',
};
const eiffel = { lat: 48.8584, lng: 2.2945 };
const louvre = { lat: 48.8606, lng: 2.3376 };

test('haversine distance is accurate', () => {
  assert.equal(haversineMeters(eiffel, eiffel), 0);
  const d = haversineMeters(eiffel, louvre);
  assert.ok(d > 3100 && d < 3250, String(d));
  const london = { lat: 51.5074, lng: -0.1278 };
  const km = haversineMeters(eiffel, london) / 1000;
  assert.ok(km > 335 && km < 345, String(km));
});

test('time-only notes unlock at the time', () => {
  const note = { ...base, unlockAt: '2026-05-01T10:00:00Z' };
  assert.equal(evaluateUnlock(note, Date.parse('2026-05-01T09:59:59Z')).unlocked, false);
  assert.equal(evaluateUnlock(note, Date.parse('2026-05-01T10:00:00Z')).unlocked, true);
});

test('place-only notes need a nearby on-demand position', () => {
  const note = { ...base, place: eiffel, radiusM: 200 };
  assert.equal(evaluateUnlock(note, 0).unlocked, false);
  assert.equal(evaluateUnlock(note, 0, louvre).unlocked, false);
  const near = evaluateUnlock(note, 0, { lat: 48.859, lng: 2.295 });
  assert.equal(near.unlocked, true);
  assert.ok(near.distanceM < 200);
  assert.equal(evaluateUnlock({ ...note, placeConfirmedAt: 'x' }, 0).unlocked, true);
});

test('rule all needs both, rule any needs either, no conditions means open', () => {
  const both = { ...base, unlockAt: '2026-05-01T10:00:00Z', place: eiffel, radiusM: 100 };
  const later = Date.parse('2026-06-01T00:00:00Z');
  assert.equal(evaluateUnlock(both, later).unlocked, false);
  assert.equal(evaluateUnlock(both, later, eiffel).unlocked, true);
  assert.equal(evaluateUnlock(both, 0, eiffel).unlocked, false);
  const any = { ...both, rule: 'any' };
  assert.equal(evaluateUnlock(any, later).unlocked, true);
  assert.equal(evaluateUnlock(any, 0, eiffel).unlocked, true);
  assert.equal(evaluateUnlock(any, 0, louvre).unlocked, false);
  assert.equal(evaluateUnlock(base, 0).unlocked, true);
  assert.equal(evaluateUnlock({ ...both, unlockedAt: 'x' }, 0).unlocked, true);
});

test('lat/lng validation and distance formatting', () => {
  assert.equal(isValidLatLng(91, 0), false);
  assert.equal(isValidLatLng(10, 10), true);
  assert.equal(isValidLatLng(NaN, 0), false);
  assert.equal(formatDistance(420.4), '420 m');
  assert.equal(formatDistance(3200), '3.2 km');
});
