import test from 'node:test';
import assert from 'node:assert/strict';
import {
  offsetMinutes,
  zonedTimeToUtc,
  zonedParts,
  isProbablyAsleep,
  wakingOverlap,
  formatMinutesInOffset,
  filterTimeZones,
  formatOffset,
} from '../src/lib/features/timezones.ts';

test('offsetMinutes for fixed and DST zones', () => {
  const jan = Date.UTC(2026, 0, 15, 12);
  const jul = Date.UTC(2026, 6, 15, 12);
  assert.equal(offsetMinutes(jan, 'Asia/Kolkata'), 330);
  assert.equal(offsetMinutes(jan, 'America/New_York'), -300);
  assert.equal(offsetMinutes(jul, 'America/New_York'), -240);
  assert.equal(offsetMinutes(jan, 'UTC'), 0);
  assert.equal(formatOffset(330), 'UTC+05:30');
  assert.equal(formatOffset(-240), 'UTC-04:00');
});

test('zonedTimeToUtc round-trips a wall-clock time', () => {
  const ms = zonedTimeToUtc(2026, 3, 8, 21, 0, 'Asia/Kolkata');
  assert.equal(new Date(ms).toISOString(), '2026-03-08T15:30:00.000Z');
  const ny = zonedTimeToUtc(2026, 7, 4, 20, 15, 'America/New_York');
  const p = zonedParts(ny, 'America/New_York');
  assert.deepEqual([p.month, p.day, p.hour, p.minute], [7, 4, 20, 15]);
});

test('asleep between 23:00 and 07:00', () => {
  assert.equal(isProbablyAsleep(23), true);
  assert.equal(isProbablyAsleep(3), true);
  assert.equal(isProbablyAsleep(7), false);
  assert.equal(isProbablyAsleep(22), false);
});

test('waking overlap: same zone = 16h, IST vs London (winter) = 10.5h', () => {
  assert.equal(wakingOverlap(330, 330).totalMinutes, 16 * 60);
  const o = wakingOverlap(330, 0);
  assert.equal(o.totalMinutes, 10.5 * 60);
  assert.equal(o.windowsUtc.length, 1);
  assert.equal(formatMinutesInOffset(o.windowsUtc[0][0], 330), '12:30');
  assert.equal(formatMinutesInOffset(o.windowsUtc[0][0], 0), '07:00');
});

test('waking overlap across the date line and with wrap', () => {
  // IST vs New York winter: 12:00-17:30 UTC plus 01:30-04:00 UTC = 8h
  assert.equal(wakingOverlap(330, -300).totalMinutes, 480);
  assert.equal(wakingOverlap(330, -300).windowsUtc.length, 2);
  // Two 16h waking windows on a 24h clock always share at least 8h
  assert.equal(wakingOverlap(0, 16 * 60).totalMinutes, 480);
  assert.equal(wakingOverlap(0, 12 * 60).totalMinutes, 480);
  // Sydney (+11) vs LA (-8): 19h apart, i.e. 5h the other way -> 11h overlap
  assert.equal(wakingOverlap(660, -480).totalMinutes, 11 * 60);
});

test('filterTimeZones searches case-insensitively with spaces', () => {
  const zones = ['America/New_York', 'Asia/Kolkata', 'Europe/London'];
  assert.deepEqual(filterTimeZones(zones, 'new york'), ['America/New_York']);
  assert.deepEqual(filterTimeZones(zones, ''), zones);
});
