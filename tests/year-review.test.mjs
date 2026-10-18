import test from 'node:test';
import assert from 'node:assert/strict';
import { availableYears, computeYearReview, longestRun } from '../src/lib/features/yearReview.ts';
import { addSnapshot, moodSeries, moodTally } from '../src/lib/features/moodHistory.ts';

const memories = [
  { id: '1', title: 'First date', date: '2025-02-14', location: 'Paris', mood: 'romantic', photos: [{ url: 'a.jpg' }, { url: 'b.jpg' }] },
  { id: '2', title: 'Picnic', date: '2025-06-01', location: 'Central Park', mood: 'happy', photos: [] },
  { id: '3', title: 'Concert', date: '2025-06-20', location: 'paris', mood: 'happy', photos: [{ url: 'c.jpg' }] },
  { id: '4', title: 'Road trip', date: '2025-06-25', location: 'Rome', mood: 'adventurous' },
  { id: '5', title: 'New year', date: '2024-12-31', location: 'Home', mood: 'cozy', photos: [{ url: 'd.jpg' }] },
];
const letters = [
  { createdAt: '2025-03-01T10:00:00Z', isDraft: false },
  { createdAt: '2025-04-01T10:00:00Z', isDraft: true },
  { createdAt: '2024-05-01T10:00:00Z' },
];

test('availableYears lists years with content, newest first', () => {
  assert.deepEqual(availableYears(memories, letters), [2025, 2024]);
  assert.deepEqual(availableYears([]), []);
});

test('longestRun counts consecutive days, ignoring duplicates and gaps', () => {
  assert.equal(longestRun([]), 0);
  assert.equal(longestRun(['2025-01-01', '2025-01-02', '2025-01-02', '2025-01-04']), 2);
  assert.equal(longestRun(['2024-12-30', '2024-12-31', '2025-01-01']), 3);
});

test('computeYearReview summarises a single year', () => {
  const s = computeYearReview({
    year: 2025,
    memories,
    letters,
    activityDays: ['2025-03-01', '2025-03-02', '2025-03-03', '2024-12-30', '2024-12-31'],
  });
  assert.equal(s.memoriesCount, 4);
  assert.equal(s.photosCount, 3);
  assert.deepEqual(s.topPlaces, [
    { place: 'Paris', count: 2 },
    { place: 'Central Park', count: 1 },
    { place: 'Rome', count: 1 },
  ]);
  assert.deepEqual(s.busiestMonth, { month: 5, count: 3 });
  assert.deepEqual(s.favouriteMood, { mood: 'happy', count: 2 });
  assert.equal(s.longestStreak, 3);
  assert.equal(s.lettersWritten, 1);
  assert.equal(s.firstMemory.title, 'First date');
  assert.deepEqual(s.highlightPhotos, ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('computeYearReview handles an empty year', () => {
  const s = computeYearReview({ year: 2030, memories, letters });
  assert.equal(s.memoriesCount, 0);
  assert.equal(s.busiestMonth, null);
  assert.equal(s.favouriteMood, null);
  assert.equal(s.firstMemory, null);
  assert.deepEqual(s.topPlaces, []);
  assert.equal(s.longestStreak, 0);
});

test('computeYearReview supports all years', () => {
  const s = computeYearReview({ year: 'all', memories, letters });
  assert.equal(s.memoriesCount, 5);
  assert.equal(s.lettersWritten, 2);
  assert.equal(s.firstMemory.id, '5');
});

test('mood history dedupes snapshots and builds a per-day series', () => {
  let h = [];
  h = addSnapshot(h, { profileId: 'user_1', mood: 'happy', updatedAt: '2026-01-01T09:00:00' });
  h = addSnapshot(h, { profileId: 'user_1', mood: 'happy', updatedAt: '2026-01-01T09:00:00' });
  h = addSnapshot(h, { profileId: 'user_1', mood: 'stressed', updatedAt: '2026-01-01T18:00:00' });
  h = addSnapshot(h, { profileId: 'user_2', mood: 'cuddle', updatedAt: '2026-01-03T12:00:00' });
  assert.equal(h.length, 3);
  const series = moodSeries(h, '2026-01-03', 3);
  assert.deepEqual(series, [
    { date: '2026-01-01', user_1: 'stressed', user_2: null },
    { date: '2026-01-02', user_1: null, user_2: null },
    { date: '2026-01-03', user_1: null, user_2: 'cuddle' },
  ]);
  assert.deepEqual(moodTally(series, 'user_2'), [{ mood: 'cuddle', count: 1 }]);
});
