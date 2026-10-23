import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bothPostedStreak,
  buildStrip,
  dayHeading,
  hasPosted,
  localDayKey,
  photoFor,
  prunePhotos,
  removePhoto,
  shiftDay,
  upsertPhoto,
} from '../src/lib/features/photoOfDay.ts';

const photo = (authorId, day, over = {}) => ({
  id: `${authorId}-${day}`,
  authorId,
  day,
  url: `https://example.test/${authorId}-${day}.jpg`,
  createdAt: `${day}T09:00:00.000Z`,
  ...over,
});

test('localDayKey uses the poster’s own calendar date', () => {
  const d = new Date(2026, 2, 9, 23, 30);
  assert.equal(localDayKey(d), '2026-03-09');
  assert.equal(localDayKey(new Date(2026, 0, 1)), '2026-01-01');
});

test('one photo per person per day; a second replaces the first', () => {
  let photos = [photo('me', '2026-03-09')];
  photos = upsertPhoto(photos, photo('me', '2026-03-09', { id: 'second', caption: 'better one' }));
  assert.equal(photos.filter((p) => p.authorId === 'me' && p.day === '2026-03-09').length, 1);
  assert.equal(photoFor(photos, 'me', '2026-03-09').caption, 'better one');
  assert.equal(hasPosted(photos, 'me', '2026-03-09'), true);
  assert.equal(hasPosted(photos, 'me', '2026-03-08'), false);
  assert.equal(hasPosted(photos, null, '2026-03-09'), false);
});

test('one person posting does not overwrite the other’s photo that day', () => {
  let photos = [photo('me', '2026-03-09')];
  photos = upsertPhoto(photos, photo('them', '2026-03-09'));
  assert.equal(photos.length, 2);
  assert.equal(photoFor(photos, 'them', '2026-03-09').authorId, 'them');
  assert.deepEqual(removePhoto(photos, 'me-2026-03-09').map((p) => p.authorId), ['them']);
});

test('the strip is newest day first and skips days nobody posted', () => {
  const photos = [
    photo('me', '2026-03-09'),
    photo('them', '2026-03-09'),
    photo('me', '2026-03-07'),
  ];
  const strip = buildStrip(photos, 'me', 'them');
  assert.deepEqual(strip.map((d) => d.day), ['2026-03-09', '2026-03-07']);
  assert.equal(strip[0].complete, true);
  assert.equal(strip[1].complete, false);
  assert.equal(strip[1].theirs, null);
  assert.equal(buildStrip(photos, 'me', 'them', 1).length, 1);
});

test('the streak counts consecutive days you both posted', () => {
  const days = ['2026-03-07', '2026-03-08', '2026-03-09'];
  const photos = days.flatMap((d) => [photo('me', d), photo('them', d)]);
  assert.equal(bothPostedStreak(photos, 'me', 'them', '2026-03-09'), 3);
});

test('today being incomplete does not reset a run still in progress', () => {
  const photos = [
    photo('me', '2026-03-08'),
    photo('them', '2026-03-08'),
    // Only one of us has posted today so far.
    photo('me', '2026-03-09'),
  ];
  assert.equal(bothPostedStreak(photos, 'me', 'them', '2026-03-09'), 1);
});

test('a missed day does break the run', () => {
  const photos = [
    photo('me', '2026-03-06'),
    photo('them', '2026-03-06'),
    photo('me', '2026-03-08'),
    photo('them', '2026-03-08'),
  ];
  assert.equal(bothPostedStreak(photos, 'me', 'them', '2026-03-09'), 1);
  assert.equal(bothPostedStreak(photos, 'me', 'them', '2026-03-10'), 0);
  assert.equal(bothPostedStreak(photos, 'me', null, '2026-03-09'), 0);
});

test('shiftDay crosses months, years and a DST boundary cleanly', () => {
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
  assert.equal(shiftDay('2026-03-29', 1), '2026-03-30');
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
});

test('dayHeading says Today and Yesterday before it says a date', () => {
  assert.equal(dayHeading('2026-03-09', '2026-03-09'), 'Today');
  assert.equal(dayHeading('2026-03-08', '2026-03-09'), 'Yesterday');
  assert.ok(dayHeading('2026-03-01', '2026-03-09').length > 0);
});

test('prunePhotos trims the archive without touching recent days', () => {
  const photos = [photo('me', '2025-01-01'), photo('me', '2026-03-09')];
  assert.deepEqual(prunePhotos(photos, '2026-03-09').map((p) => p.day), ['2026-03-09']);
  assert.equal(prunePhotos(photos, '2026-03-09', 5000).length, 2);
});
