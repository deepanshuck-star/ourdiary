import test from 'node:test';
import assert from 'node:assert/strict';
import {
  approxFlightHours,
  buildDistanceSummary,
  formatDistance,
  haversineKm,
} from '../src/lib/features/distance.ts';

const KOLKATA = { lat: 22.5726, lng: 88.3639, query: 'Kolkata' };
const LONDON = { lat: 51.5072, lng: -0.1276, query: 'London' };

test('haversineKm matches known great-circle distances', () => {
  // Kolkata to London is about 7,960 km.
  assert.ok(Math.abs(haversineKm(KOLKATA, LONDON) - 7960) < 60);
  assert.equal(haversineKm(KOLKATA, KOLKATA), 0);
  // Symmetric, and an antipodal-ish pair stays inside half the circumference.
  assert.equal(haversineKm(KOLKATA, LONDON), haversineKm(LONDON, KOLKATA));
  assert.ok(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }) <= 20_038);
});

test('formatDistance rounds for reading, not for precision', () => {
  assert.equal(formatDistance(4178.4), '4,178 km');
  assert.equal(formatDistance(4178.4, 'mi'), '2,596 mi');
  assert.equal(formatDistance(3.42), '3.4 km');
  assert.equal(formatDistance(0), '0 km');
});

test('the line reads as one sentence of three numbers', () => {
  const summary = buildDistanceSummary({
    mine: LONDON,
    theirs: KOLKATA,
    daysTogether: 312,
    daysUntilReunion: 19,
  });
  assert.equal(summary.complete, true);
  assert.equal(summary.daysTogetherText, '312 days together');
  assert.equal(summary.reunionText, "19 days until you're not");
  assert.equal(summary.distanceText, `${formatDistance(summary.km)} apart`);
  assert.match(summary.line, /^7,9\d\d km apart · 312 days together · 19 days until you're not$/);
});

test('one day out and the day itself get their own wording', () => {
  const tomorrow = buildDistanceSummary({
    mine: LONDON,
    theirs: KOLKATA,
    daysTogether: 1,
    daysUntilReunion: 1,
  });
  assert.equal(tomorrow.daysTogetherText, '1 day together');
  assert.equal(tomorrow.reunionText, 'together again tomorrow');

  const today = buildDistanceSummary({
    mine: LONDON,
    theirs: KOLKATA,
    daysTogether: 5,
    daysUntilReunion: 0,
  });
  assert.equal(today.reunionText, 'together right now');

  const inProgress = buildDistanceSummary({
    mine: LONDON,
    theirs: KOLKATA,
    daysTogether: 5,
    daysUntilReunion: -2,
  });
  assert.equal(inProgress.reunionText, 'together right now');
});

test('a missing city drops the distance instead of reporting zero', () => {
  const summary = buildDistanceSummary({
    mine: LONDON,
    theirs: null,
    daysTogether: 312,
    daysUntilReunion: null,
  });
  assert.equal(summary.km, null);
  assert.equal(summary.distanceText, null);
  assert.equal(summary.complete, false);
  assert.equal(summary.line, '312 days together');
});

test('no trip booked means no countdown, not a countdown to nothing', () => {
  const summary = buildDistanceSummary({
    mine: LONDON,
    theirs: KOLKATA,
    daysTogether: 312,
    daysUntilReunion: null,
  });
  assert.equal(summary.reunionText, null);
  assert.match(summary.line, /312 days together$/);
});

test('approxFlightHours is a sentence, not a timetable', () => {
  assert.equal(approxFlightHours(850), 1.8);
  assert.ok(approxFlightHours(7960) > 9 && approxFlightHours(7960) < 11);
});
