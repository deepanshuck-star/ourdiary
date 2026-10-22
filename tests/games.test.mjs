import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkTicTacToeWinner,
  getRandomPrompt,
  createMemoryDeck,
  evaluateWordleGuess,
  getWordOfTheDay,
  LOVE_WORDS,
  TRUTH_OR_DARE_PROMPTS,
} from '../src/lib/features/games.ts';

test('checkTicTacToeWinner detects row wins', () => {
  const board = [
    'user_1', 'user_1', 'user_1',
    'user_2', null, 'user_2',
    null, null, null,
  ];
  const { winner, line } = checkTicTacToeWinner(board);
  assert.equal(winner, 'user_1');
  assert.deepEqual(line, [0, 1, 2]);
});

test('checkTicTacToeWinner detects diagonal wins', () => {
  const board = [
    'user_2', null, 'user_1',
    null, 'user_2', 'user_1',
    'user_1', null, 'user_2',
  ];
  const { winner, line } = checkTicTacToeWinner(board);
  assert.equal(winner, 'user_2');
  assert.deepEqual(line, [0, 4, 8]);
});

test('checkTicTacToeWinner detects draws', () => {
  const board = [
    'user_1', 'user_2', 'user_1',
    'user_1', 'user_2', 'user_2',
    'user_2', 'user_1', 'user_1',
  ];
  const { winner, line } = checkTicTacToeWinner(board);
  assert.equal(winner, 'draw');
  assert.equal(line, null);
});

test('checkTicTacToeWinner returns null for in-progress games', () => {
  const board = [
    'user_1', null, null,
    null, 'user_2', null,
    null, null, null,
  ];
  const { winner, line } = checkTicTacToeWinner(board);
  assert.equal(winner, null);
  assert.equal(line, null);
});

test('getRandomPrompt filters by category and type', () => {
  const prompt = getRandomPrompt('spicy', 'dare');
  assert.equal(prompt.category, 'spicy');
  assert.equal(prompt.type, 'dare');
});

test('getRandomPrompt respects excludeIds', () => {
  const allRomanticTruthIds = TRUTH_OR_DARE_PROMPTS.filter(
    (p) => p.category === 'romantic' && p.type === 'truth'
  ).map((p) => p.id);
  
  // Exclude all except the first one
  const exclude = allRomanticTruthIds.slice(1);
  const prompt = getRandomPrompt('romantic', 'truth', exclude);
  assert.equal(prompt.id, allRomanticTruthIds[0]);
});

test('createMemoryDeck returns 16 cards with 8 matching pairs', () => {
  const deck = createMemoryDeck();
  assert.equal(deck.length, 16);

  const pairCounts = new Map();
  for (const card of deck) {
    pairCounts.set(card.pairId, (pairCounts.get(card.pairId) || 0) + 1);
  }

  assert.equal(pairCounts.size, 8);
  for (const count of pairCounts.values()) {
    assert.equal(count, 2);
  }
});

test('createMemoryDeck uses custom photo URLs and backfills to 16 cards', () => {
  const photos = ['https://img.com/1.jpg', 'https://img.com/2.jpg', 'https://img.com/3.jpg', 'https://img.com/4.jpg'];
  const deck = createMemoryDeck(photos);
  assert.equal(deck.length, 16);
  const imageCards = deck.filter((c) => c.isImage);
  assert.equal(imageCards.length, 8); // 4 photos * 2 = 8 cards
  const iconCards = deck.filter((c) => !c.isImage);
  assert.equal(iconCards.length, 8); // 4 icons * 2 = 8 cards
});

test('evaluateWordleGuess scores matches accurately', () => {
  // Target: HEART
  // Guess:  HEART -> all correct
  const result1 = evaluateWordleGuess('HEART', 'HEART');
  assert.deepEqual(result1, ['correct', 'correct', 'correct', 'correct', 'correct']);

  // Guess:  EARTH -> all present in wrong positions
  const result2 = evaluateWordleGuess('EARTH', 'HEART');
  assert.deepEqual(result2, ['present', 'present', 'present', 'present', 'present']);

  // Guess:  QUICK -> zero letters present in HEART
  const result3 = evaluateWordleGuess('QUICK', 'HEART');
  assert.deepEqual(result3, ['absent', 'absent', 'absent', 'absent', 'absent']);

  // Guess with duplicate letter: SWEET (target: CRUSH)
  const result4 = evaluateWordleGuess('SWEET', 'CRUSH');
  // S is present (index 0), W absent, E absent, E absent, T absent
  assert.equal(result4[0], 'present');
  assert.equal(result4[1], 'absent');
});

test('getWordOfTheDay returns a valid 5-letter word deterministically', () => {
  const word1 = getWordOfTheDay(new Date('2026-10-22'));
  const word2 = getWordOfTheDay(new Date('2026-10-22'));
  assert.equal(word1, word2);
  assert.equal(word1.length, 5);
  assert.ok(LOVE_WORDS.includes(word1));
});
