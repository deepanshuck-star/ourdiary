import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableGuessFields,
  buildGiftRound,
  buildGuessRound,
  buildTimelineRound,
  buildWhereRound,
  createKnowMeRound,
  haversineKm,
  isKnowMeGuessed,
  isKnowMeWritten,
  isTimelineSolved,
  knowMeScore,
  memoriesWithPhotos,
  pickDistinct,
  scoreTimeline,
  shuffle,
  yearOf,
} from '../src/lib/features/games/memoryGames.ts';

/** Deterministic rng so a round can be asserted exactly. */
const always = (v) => () => v;

const memory = (over = {}) => ({
  id: 'm1',
  title: 'Goa trip',
  date: '2024-03-14',
  location: 'Goa',
  photos: [{ url: 'https://example.com/a.jpg' }],
  ...over,
});

const library = [
  memory({ id: 'm1', title: 'Goa trip', date: '2024-03-14', location: 'Goa' }),
  memory({ id: 'm2', title: 'First date', date: '2023-01-05', location: 'Delhi' }),
  memory({ id: 'm3', title: 'Manali snow', date: '2025-12-20', location: 'Manali' }),
  memory({ id: 'm4', title: 'Beach day', date: '2022-07-01', location: 'Pondicherry' }),
];

test('shuffle keeps every element and leaves the input alone', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, always(0));
  assert.deepEqual([...out].sort(), [...input].sort());
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});

test('pickDistinct never returns more than exists, or duplicates', () => {
  const out = pickDistinct(['a', 'b'], 5, always(0));
  assert.equal(out.length, 2);
  assert.equal(new Set(out).size, 2);
  assert.deepEqual(pickDistinct(['a'], 0, always(0)), []);
  assert.deepEqual(pickDistinct([], 3, always(0)), []);
});

test('memoriesWithPhotos skips memories we cannot show', () => {
  const pool = [memory({ id: 'a' }), memory({ id: 'b', photos: [] }), memory({ id: 'c', photos: undefined })];
  assert.deepEqual(memoriesWithPhotos(pool).map((m) => m.id), ['a']);
});

test('yearOf reads the year, and copes with junk', () => {
  assert.equal(yearOf('2024-03-14'), '2024');
  assert.equal(yearOf('nonsense'), '');
});

test('a guess round offers the right answer among its options', () => {
  const round = buildGuessRound(library, 'location', always(0));
  assert.ok(round);
  assert.ok(round.options.includes(round.answer));
  assert.ok(round.photoUrl);
  // Decoys come from their own other memories, which is what makes it hard.
  assert.ok(round.options.length > 1);
  assert.equal(new Set(round.options).size, round.options.length);
});

test('a guess round needs something to ask about', () => {
  // One memory means no decoys, so no question can be posed.
  assert.equal(buildGuessRound([memory()], 'location', always(0)), null);
  // No photos means nothing to show.
  assert.equal(buildGuessRound(library.map((m) => ({ ...m, photos: [] })), 'year', always(0)), null);
  assert.equal(buildGuessRound([], 'year', always(0)), null);
});

test('a field with no values anywhere is not offered', () => {
  const noPlaces = library.map((m) => ({ ...m, location: '' }));
  assert.equal(availableGuessFields(noPlaces).includes('location'), false);
  assert.ok(availableGuessFields(library).includes('location'));
});

test('a timeline round presents the items and knows the true order', () => {
  const round = buildTimelineRound(library, 4, always(0));
  assert.ok(round);
  assert.equal(round.items.length, 4);
  assert.deepEqual([...round.solution].sort(), [...round.items.map((i) => i.id)].sort());
  // Oldest first.
  assert.equal(round.solution[0], 'm4'); // 2022
  assert.equal(round.solution[round.solution.length - 1], 'm3'); // 2025
});

test('a timeline round is never handed out already solved', () => {
  // always(0) makes the shuffle a no-op, so the nudge has to kick in.
  const round = buildTimelineRound(library, 4, always(0));
  assert.equal(isTimelineSolved(round.items.map((i) => i.id), round.solution), false);
});

test('a timeline round needs at least three dated memories', () => {
  assert.equal(buildTimelineRound(library.slice(0, 2), 5, always(0)), null);
  const undated = library.map((m) => ({ ...m, date: 'soon' }));
  assert.equal(buildTimelineRound(undated, 5, always(0)), null);
});

test('timeline scoring gives partial credit', () => {
  const solution = ['a', 'b', 'c'];
  assert.equal(scoreTimeline(['a', 'b', 'c'], solution), 3);
  assert.equal(scoreTimeline(['a', 'c', 'b'], solution), 1);
  assert.equal(scoreTimeline(['c', 'b', 'a'], solution), 1);
  assert.ok(isTimelineSolved(['a', 'b', 'c'], solution));
  assert.equal(isTimelineSolved(['a', 'b'], solution), false);
});

const places = [
  { id: 'p1', title: 'Goa trip', location: 'Goa', lat: 15.3, lng: 74.1 },
  { id: 'p2', title: 'First date', location: 'Delhi', lat: 28.6, lng: 77.2 },
  { id: 'p3', title: 'Manali snow', location: 'Manali', lat: 32.2, lng: 77.1 },
];

test('a where-round includes the correct place among its options', () => {
  const round = buildWhereRound(places, always(0));
  assert.ok(round);
  assert.ok(round.options.some((o) => o.id === round.answerId));
  assert.equal(new Set(round.options.map((o) => o.id)).size, round.options.length);
});

test('a where-round needs at least two places', () => {
  assert.equal(buildWhereRound(places.slice(0, 1), always(0)), null);
  assert.equal(buildWhereRound([], always(0)), null);
});

test('haversine measures real distances', () => {
  assert.equal(Math.round(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })), 0);
  // Delhi to Goa is roughly 1500km.
  const d = haversineKm({ lat: 28.6, lng: 77.2 }, { lat: 15.3, lng: 74.1 });
  assert.ok(d > 1400 && d < 1650, `expected ~1500km, got ${Math.round(d)}`);
});

const names = { u1: 'Alex', u2: 'Maya' };
const gifts = [
  { id: 'g1', title: 'Blue scarf', occasion: 'Birthday', fromUserId: 'u2', toUserId: 'u1' },
  { id: 'g2', title: 'Record player', occasion: 'Anniversary', fromUserId: 'u1', toUserId: 'u2' },
  { id: 'g3', title: 'Plant', occasion: 'Just because', fromUserId: 'u2', toUserId: 'u1' },
];

test('a "who gave this" round names both people', () => {
  const round = buildGiftRound(gifts, names, 'who', always(0));
  assert.ok(round);
  assert.ok(round.options.includes(round.answer));
  assert.deepEqual([...round.options].sort(), ['Alex', 'Maya']);
});

test('a "who" round is impossible with only one person named', () => {
  assert.equal(buildGiftRound(gifts, { u1: 'Alex' }, 'who', always(0)), null);
});

test('an occasion round draws decoys from their other gifts', () => {
  const round = buildGiftRound(gifts, names, 'occasion', always(0));
  assert.ok(round);
  assert.ok(round.options.includes(round.answer));
  assert.ok(round.options.every((o) => o.trim() !== ''));
});

test('gifts with no occasion are skipped rather than asked about', () => {
  const blank = gifts.map((g) => ({ ...g, occasion: '' }));
  assert.equal(buildGiftRound(blank, names, 'occasion', always(0)), null);
  // A single occasion leaves no decoys.
  const one = [gifts[0]];
  assert.equal(buildGiftRound(one, names, 'occasion', always(0)), null);
});

test('a know-me round starts empty and tracks its phases', () => {
  const round = createKnowMeRound('u1', ['Favourite food', 'Worst habit']);
  assert.equal(round.phase, 'writing');
  assert.equal(isKnowMeWritten(round), false);

  const written = { ...round, answers: round.answers.map((a) => ({ ...a, truth: 'x' })) };
  assert.ok(isKnowMeWritten(written));
  assert.equal(isKnowMeGuessed(written), false);

  const guessed = { ...written, answers: written.answers.map((a) => ({ ...a, guess: 'y' })) };
  assert.ok(isKnowMeGuessed(guessed));
});

test('know-me scoring counts only what the author has marked', () => {
  const round = createKnowMeRound('u1', ['a', 'b', 'c']);
  round.answers[0].correct = true;
  round.answers[1].correct = false;
  assert.deepEqual(knowMeScore(round), { correct: 1, total: 3 });
});

test('a know-me round with no prompts is not "written"', () => {
  assert.equal(isKnowMeWritten(createKnowMeRound('u1', [])), false);
});
