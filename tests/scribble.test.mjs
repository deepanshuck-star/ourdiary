import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DRAWER_SHARE,
  MAX_GUESS_POINTS,
  MIN_GUESS_POINTS,
  ROUND_SECONDS,
  SCRIBBLE_BANKS,
  SCRIBBLE_WORDS,
  addGuess,
  createRound,
  isCorrectGuess,
  isNearMiss,
  levenshtein,
  nextRound,
  normaliseGuess,
  pickWord,
  revealedHint,
  roundOver,
  scoreCorrectGuess,
  secondsLeft,
} from '../src/lib/features/games/scribble.ts';

const DRAWER = 'alex';
const GUESSER = 'maya';
const T0 = 1_700_000_000_000;
const SPAN = ROUND_SECONDS * 1000;

const fresh = (word = 'penguin') => createRound([DRAWER, GUESSER], DRAWER, word, 'Animals', T0);

/** An rng that walks a fixed list, so a pick is reproducible. */
const rngSeq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// ------------------------------------------------------------- word banks ---

test('every bank has enough distinct words to play with', () => {
  assert.ok(SCRIBBLE_BANKS.length >= 4);
  for (const bank of SCRIBBLE_BANKS) {
    const words = SCRIBBLE_WORDS[bank];
    assert.ok(words.length >= 15, `${bank} is short`);
    assert.equal(new Set(words).size, words.length, `${bank} repeats itself`);
    for (const word of words) {
      assert.equal(word, word.toLowerCase());
      assert.ok(normaliseGuess(word).length > 0);
    }
  }
});

test('pickWord returns a word from the named bank', () => {
  const word = pickWord('Animals', rngSeq(0));
  assert.equal(word, SCRIBBLE_WORDS['Animals'][0]);
});

test('pickWord skips words already used', () => {
  const animals = SCRIBBLE_WORDS['Animals'];
  const used = [animals[0], animals[1]];
  assert.equal(pickWord('Animals', rngSeq(0), used), animals[2]);
});

test('pickWord recycles the bank once it is exhausted', () => {
  const animals = SCRIBBLE_WORDS['Animals'];
  const word = pickWord('Animals', rngSeq(0), [...animals]);
  assert.ok(animals.includes(word));
});

test('pickWord stays in range at the top of the rng', () => {
  const animals = SCRIBBLE_WORDS['Animals'];
  assert.equal(pickWord('Animals', rngSeq(0.999999)), animals[animals.length - 1]);
  assert.equal(pickWord('Animals', rngSeq(1)), animals[animals.length - 1]);
});

test('an unknown bank yields nothing rather than throwing', () => {
  assert.equal(pickWord('Nonsense', rngSeq(0)), '');
});

// ----------------------------------------------------------------- rounds ---

test('createRound starts round one with a clock and empty scores', () => {
  const s = fresh();
  assert.equal(s.round, 1);
  assert.equal(s.drawerId, DRAWER);
  assert.equal(s.endsAt - s.startedAt, SPAN);
  assert.deepEqual(s.scores, { [DRAWER]: 0, [GUESSER]: 0 });
  assert.deepEqual(s.guesses, []);
  assert.equal(s.solvedAt, null);
  assert.deepEqual(s.usedWords, ['penguin']);
});

test('secondsLeft counts down and floors at zero', () => {
  const s = fresh();
  assert.equal(secondsLeft(s, T0), ROUND_SECONDS);
  assert.equal(secondsLeft(s, T0 + 30_000), ROUND_SECONDS - 30);
  assert.equal(secondsLeft(s, s.endsAt), 0);
  assert.equal(secondsLeft(s, s.endsAt + 60_000), 0);
});

test('the clock freezes the moment the word is got', () => {
  const solved = addGuess(fresh(), GUESSER, 'penguin', T0 + 10_000);
  assert.equal(secondsLeft(solved, T0 + 80_000), ROUND_SECONDS - 10);
});

test('roundOver is true at time-up or once solved', () => {
  const s = fresh();
  assert.equal(roundOver(s, T0), false);
  assert.equal(roundOver(s, s.endsAt - 1), false);
  assert.equal(roundOver(s, s.endsAt), true);
  const solved = addGuess(s, GUESSER, 'penguin', T0 + 1000);
  assert.equal(roundOver(solved, T0 + 2000), true);
});

// ---------------------------------------------------------- guess matching ---

test('normaliseGuess handles case, punctuation and stray spaces', () => {
  assert.equal(normaliseGuess('  Ice   CREAM!  '), 'ice cream');
  assert.equal(normaliseGuess('“Penguin.”'), 'penguin');
  assert.equal(normaliseGuess("it's a Fried-Egg"), 'its a friedegg');
  assert.equal(normaliseGuess('   '), '');
});

test('a guess matches on its normalised form', () => {
  assert.equal(isCorrectGuess('ice cream', '  Ice   Cream!  '), true);
  assert.equal(isCorrectGuess('penguin', 'Penguin'), true);
  assert.equal(isCorrectGuess('penguin', 'pengiun'), false);
  assert.equal(isCorrectGuess('', ''), false);
});

test('levenshtein counts single edits', () => {
  assert.equal(levenshtein('penguin', 'penguin'), 0);
  assert.equal(levenshtein('penguin', 'pengui'), 1);
  assert.equal(levenshtein('penguin', 'pengiun'), 2);
  assert.equal(levenshtein('', 'owl'), 3);
  assert.equal(levenshtein('owl', ''), 3);
  assert.equal(levenshtein('owl', 'cat'), 3);
});

test('a near miss is close but is never a win', () => {
  assert.equal(isNearMiss('penguin', 'penguine'), true);
  assert.equal(isNearMiss('penguin', 'pengiun'), true);
  assert.equal(isNearMiss('penguin', 'penguin'), false, 'the right word is a win, not a near miss');
  assert.equal(isNearMiss('penguin', 'tortoise'), false);
  // Short words get a tighter allowance, or everything is "so close".
  assert.equal(isNearMiss('owl', 'oil'), true);
  assert.equal(isNearMiss('owl', 'cat'), false);
  assert.equal(isNearMiss('owl', ''), false);
});

// ------------------------------------------------------------- the guesses ---

test('the drawer may not guess their own word', () => {
  assert.equal(addGuess(fresh(), DRAWER, 'penguin', T0 + 1000), null);
});

test('someone outside the game may not guess', () => {
  assert.equal(addGuess(fresh(), 'stranger', 'penguin', T0 + 1000), null);
});

test('an empty guess is refused', () => {
  assert.equal(addGuess(fresh(), GUESSER, '   ', T0 + 1000), null);
  assert.equal(addGuess(fresh(), GUESSER, '!!!', T0 + 1000), null);
});

test('a wrong guess is recorded and scores nothing', () => {
  const s = addGuess(fresh(), GUESSER, 'tortoise', T0 + 1000);
  assert.equal(s.guesses.length, 1);
  assert.equal(s.guesses[0].correct, false);
  assert.equal(s.guesses[0].nearMiss, false);
  assert.equal(s.solvedAt, null);
  assert.deepEqual(s.scores, { [DRAWER]: 0, [GUESSER]: 0 });
});

test('a near miss is flagged but does not end the round', () => {
  const s = addGuess(fresh(), GUESSER, 'pengiun', T0 + 1000);
  assert.equal(s.guesses[0].nearMiss, true);
  assert.equal(s.guesses[0].correct, false);
  assert.equal(s.solvedAt, null);
  assert.deepEqual(s.scores, { [DRAWER]: 0, [GUESSER]: 0 });
});

test('a correct guess ends the round and pays both of them', () => {
  const s = addGuess(fresh(), GUESSER, 'Penguin!', T0);
  assert.equal(s.guesses[0].correct, true);
  assert.equal(s.solvedBy, GUESSER);
  assert.equal(s.solvedAt, T0);
  assert.equal(s.scores[GUESSER], MAX_GUESS_POINTS);
  assert.equal(s.scores[DRAWER], Math.round(MAX_GUESS_POINTS * DRAWER_SHARE));
});

test('nothing more can be guessed once the word is got', () => {
  const s = addGuess(fresh(), GUESSER, 'penguin', T0 + 1000);
  assert.equal(addGuess(s, GUESSER, 'penguin', T0 + 2000), null);
});

test('a correct guess after time-up does not score', () => {
  const s = fresh();
  assert.equal(addGuess(s, GUESSER, 'penguin', s.endsAt), null);
  assert.equal(addGuess(s, GUESSER, 'penguin', s.endsAt + 5000), null);
  assert.deepEqual(s.scores, { [DRAWER]: 0, [GUESSER]: 0 });
});

test('addGuess never mutates the state it was given', () => {
  const before = fresh();
  addGuess(before, GUESSER, 'penguin', T0 + 1000);
  assert.deepEqual(before.guesses, []);
  assert.deepEqual(before.scores, { [DRAWER]: 0, [GUESSER]: 0 });
  assert.equal(before.solvedAt, null);
});

// ----------------------------------------------------------------- scoring ---

test('scoring pays the most at full time and the least at none', () => {
  const s = fresh();
  assert.deepEqual(scoreCorrectGuess(s, T0), {
    guesser: MAX_GUESS_POINTS,
    drawer: Math.round(MAX_GUESS_POINTS * DRAWER_SHARE),
  });
  assert.deepEqual(scoreCorrectGuess(s, s.endsAt), {
    guesser: MIN_GUESS_POINTS,
    drawer: Math.round(MIN_GUESS_POINTS * DRAWER_SHARE),
  });
  // Past the end the floor holds rather than going negative.
  assert.deepEqual(scoreCorrectGuess(s, s.endsAt + 600_000), {
    guesser: MIN_GUESS_POINTS,
    drawer: Math.round(MIN_GUESS_POINTS * DRAWER_SHARE),
  });
});

test('scoring slides with the clock', () => {
  const s = fresh();
  const half = scoreCorrectGuess(s, T0 + SPAN / 2);
  assert.equal(half.guesser, MIN_GUESS_POINTS + (MAX_GUESS_POINTS - MIN_GUESS_POINTS) / 2);
  assert.equal(half.drawer, Math.round(half.guesser * DRAWER_SHARE));
  const late = scoreCorrectGuess(s, T0 + SPAN * 0.75);
  assert.ok(late.guesser < half.guesser && late.guesser > MIN_GUESS_POINTS);
});

// ------------------------------------------------------------------- hints ---

test('the hint starts blank and fills in as time runs down', () => {
  const s = fresh();
  assert.equal(revealedHint(s, T0), '_______');
  const mid = revealedHint(s, T0 + SPAN / 2);
  const letters = (h) => [...h].filter((c) => c !== '_').length;
  assert.ok(letters(mid) > 0);
  assert.ok(letters(revealedHint(s, s.endsAt)) > letters(mid));
});

test('the hint never gives the whole word away', () => {
  for (const word of ['owl', 'penguin', 'ice cream', 'a']) {
    const s = fresh(word);
    for (const at of [T0, T0 + SPAN / 3, s.endsAt, s.endsAt + 600_000]) {
      const hint = revealedHint(s, at);
      assert.notEqual(hint, word, `${word} fully revealed at ${at}`);
      assert.ok(hint.includes('_'), `${word} had no masked letter at ${at}`);
    }
  }
});

test('the hint keeps the shape of the word', () => {
  const s = fresh('ice cream');
  const hint = revealedHint(s, T0);
  assert.equal(hint, '___ _____');
  assert.equal(hint.length, 'ice cream'.length);
});

// ------------------------------------------------------------- next rounds ---

test('nextRound swaps the drawer and bumps the round', () => {
  const s = nextRound(fresh(), 'sloth', T0 + SPAN);
  assert.equal(s.drawerId, GUESSER);
  assert.equal(s.round, 2);
  assert.equal(s.word, 'sloth');
  assert.deepEqual(s.guesses, []);
  assert.equal(s.solvedAt, null);
  assert.equal(s.solvedBy, null);
  assert.equal(s.startedAt, T0 + SPAN);
  assert.equal(s.endsAt, T0 + SPAN * 2);
  assert.deepEqual(s.usedWords, ['penguin', 'sloth']);
});

test('scores accumulate across rounds', () => {
  let s = addGuess(fresh(), GUESSER, 'penguin', T0);
  const afterOne = { ...s.scores };
  s = nextRound(s, 'sloth', T0 + SPAN);
  assert.deepEqual(s.scores, afterOne);

  // Roles are swapped now, so the old drawer is the one guessing.
  assert.equal(addGuess(s, GUESSER, 'sloth', T0 + SPAN), null);
  s = addGuess(s, DRAWER, 'sloth', T0 + SPAN);
  assert.equal(s.scores[DRAWER], afterOne[DRAWER] + MAX_GUESS_POINTS);
  assert.equal(s.scores[GUESSER], afterOne[GUESSER] + Math.round(MAX_GUESS_POINTS * DRAWER_SHARE));
});
