import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BINGO_IDEAS,
  BINGO_SIZE,
  FREE_INDEX,
  MAX_SENTENCE,
  addSentence,
  bingoLines,
  bingoProgress,
  createBingoCard,
  createStory,
  isBlackout,
  otherStoryPlayer,
  storyText,
  storyWordCount,
  toggleSquare,
  validateSentence,
} from '../src/lib/features/games/collab.ts';

const P1 = 'alex';
const P2 = 'maya';

test('a story starts empty and alternates players', () => {
  const s = createStory([P1, P2], 'The wrong train');
  assert.deepEqual(s.sentences, []);
  assert.equal(s.title, 'The wrong train');
  assert.equal(otherStoryPlayer(s, P1), P2);
});

test('sentences are added in order with their author', () => {
  let s = createStory([P1, P2]);
  s = addSentence(s, 'We boarded at dawn.', P1);
  s = addSentence(s, 'Nobody checked the destination.', P2);
  assert.equal(s.sentences.length, 2);
  assert.deepEqual(s.sentences.map((x) => x.playerId), [P1, P2]);
  assert.equal(storyText(s), 'We boarded at dawn. Nobody checked the destination.');
});

test('validateSentence refuses empty and over-long text', () => {
  assert.equal(validateSentence('A sentence.'), null);
  assert.match(validateSentence('   '), /add a sentence/i);
  assert.match(validateSentence('x'.repeat(MAX_SENTENCE + 1)), /under/i);
});

test('addSentence refuses what validateSentence rejects', () => {
  const s = createStory([P1, P2]);
  assert.equal(addSentence(s, '   ', P1), null);
  assert.equal(addSentence(s, 'x'.repeat(MAX_SENTENCE + 1), P1), null);
  assert.equal(addSentence(s, 'Fine.', 'stranger'), null);
});

test('a finished story takes no more sentences', () => {
  const s = { ...createStory([P1, P2]), finished: true };
  assert.equal(addSentence(s, 'One more.', P1), null);
});

test('word count handles the empty story', () => {
  assert.equal(storyWordCount(createStory([P1, P2])), 0);
  const s = addSentence(createStory([P1, P2]), 'Three little words', P1);
  assert.equal(storyWordCount(s), 3);
});

test('addSentence never mutates the state it was given', () => {
  const before = createStory([P1, P2]);
  addSentence(before, 'Hello.', P1);
  assert.deepEqual(before.sentences, []);
});

// ------------------------------------------------------------------ Bingo ---

const card = () => createBingoCard(BINGO_IDEAS, '2026-10-23');

test('a card is 5x5 with the centre free and already ticked', () => {
  const c = card();
  assert.equal(c.squares.length, BINGO_SIZE * BINGO_SIZE);
  assert.equal(c.squares[FREE_INDEX].done, true);
  assert.match(c.squares[FREE_INDEX].text, /free square/i);
});

test('a short idea list still makes a full card', () => {
  // Padding rather than failing: a custom list of three shouldn't break it.
  const c = createBingoCard(['a', 'b', 'c'], '2026-10-23');
  assert.equal(c.squares.length, BINGO_SIZE * BINGO_SIZE);
  assert.ok(c.squares.every((s) => s.text.trim() !== ''));
});

test('ticking a square records the date, and untick clears it', () => {
  let c = card();
  c = toggleSquare(c, 'b0', '2026-10-24');
  assert.equal(c.squares[0].done, true);
  assert.equal(c.squares[0].doneOn, '2026-10-24');

  c = toggleSquare(c, 'b0', '2026-10-25');
  assert.equal(c.squares[0].done, false);
  assert.equal(c.squares[0].doneOn, undefined);
});

test('the free square cannot be unticked', () => {
  // Lines through the centre would otherwise be unreachable for no reason.
  const c = toggleSquare(card(), `b${FREE_INDEX}`, '2026-10-24');
  assert.equal(c.squares[FREE_INDEX].done, true);
});

test('a fresh card has no completed lines', () => {
  assert.deepEqual(bingoLines(card()), []);
  assert.equal(bingoProgress(card()).lines, 0);
});

test('a full row counts as a line', () => {
  let c = card();
  for (let i = 0; i < BINGO_SIZE; i++) c = toggleSquare(c, `b${i}`, '2026-10-24');
  const lines = bingoLines(c);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], [0, 1, 2, 3, 4]);
});

test('a full column counts as a line', () => {
  let c = card();
  for (let r = 0; r < BINGO_SIZE; r++) c = toggleSquare(c, `b${r * BINGO_SIZE}`, '2026-10-24');
  assert.equal(bingoLines(c).length, 1);
});

test('both diagonals count, and the free centre helps', () => {
  let c = card();
  for (let i = 0; i < BINGO_SIZE; i++) c = toggleSquare(c, `b${i * BINGO_SIZE + i}`, '2026-10-24');
  assert.ok(bingoLines(c).some((line) => line[0] === 0 && line[line.length - 1] === 24));

  let d = card();
  for (let i = 0; i < BINGO_SIZE; i++) {
    d = toggleSquare(d, `b${i * BINGO_SIZE + (BINGO_SIZE - 1 - i)}`, '2026-10-24');
  }
  assert.ok(bingoLines(d).some((line) => line[0] === 4));
});

test('progress counts squares and lines', () => {
  let c = card();
  c = toggleSquare(c, 'b0', '2026-10-24');
  const p = bingoProgress(c);
  assert.equal(p.total, 25);
  assert.equal(p.done, 2); // the free square plus this one
  assert.equal(p.lines, 0);
});

test('blackout is only when every square is done', () => {
  let c = card();
  assert.equal(isBlackout(c), false);
  for (let i = 0; i < BINGO_SIZE * BINGO_SIZE; i++) c = toggleSquare(c, `b${i}`, '2026-10-24');
  assert.ok(isBlackout(c));
  // 5 rows + 5 columns + 2 diagonals.
  assert.equal(bingoLines(c).length, 12);
});

test('toggleSquare never mutates the card it was given', () => {
  const before = card();
  toggleSquare(before, 'b0', '2026-10-24');
  assert.equal(before.squares[0].done, false);
});
