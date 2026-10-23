import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WRONG_GUESSES,
  createHangman,
  guessLetter,
  isSolved,
  lettersIn,
  maskedPhrase,
  remainingGuesses,
  validatePhrase,
  wrongLetters,
} from '../src/lib/features/games/hangman.ts';

const setter = 'alex';
const guesser = 'maya';
const game = (phrase = 'OUR FIRST DATE', hint = 'where it began') =>
  createHangman(phrase, hint, setter, guesser);

test('validatePhrase accepts letters and spaces', () => {
  assert.equal(validatePhrase('our first date'), null);
  assert.equal(validatePhrase('  Goa  '), null);
});

test('validatePhrase rejects empty, too long, and unguessable input', () => {
  assert.match(validatePhrase('   '), /pick a word/i);
  assert.match(validatePhrase('a'.repeat(41)), /under/i);
  // Digits and punctuation can never be guessed, so they'd be dead blanks.
  assert.match(validatePhrase('flat 3b'), /letters and spaces/i);
  assert.match(validatePhrase('hello!'), /letters and spaces/i);
  assert.match(validatePhrase('   '), /pick a word/i);
});

test('the phrase is stored uppercase and masked except spaces', () => {
  const s = game('our first date');
  assert.equal(s.phrase, 'OUR FIRST DATE');
  assert.equal(maskedPhrase(s), '___ _____ ____');
});

test('a correct guess reveals every occurrence', () => {
  const s = guessLetter(game('OUR FIRST DATE'), 't');
  assert.equal(maskedPhrase(s), '___ ____T __T_');
  assert.equal(s.wrong, 0);
});

test('a wrong guess costs a life and is listed as a miss', () => {
  const s = guessLetter(game('GOA'), 'z');
  assert.equal(s.wrong, 1);
  assert.equal(remainingGuesses(s), MAX_WRONG_GUESSES - 1);
  assert.deepEqual(wrongLetters(s), ['Z']);
});

test('a repeat guess is ignored rather than punished', () => {
  // Costing a life for a mis-tap would just be annoying.
  const first = guessLetter(game('GOA'), 'g');
  assert.equal(guessLetter(first, 'g'), null);
  assert.equal(guessLetter(first, 'G'), null);
});

test('non-letters are ignored', () => {
  const s = game('GOA');
  assert.equal(guessLetter(s, '1'), null);
  assert.equal(guessLetter(s, ''), null);
  assert.equal(guessLetter(s, 'ab'), null);
  assert.equal(guessLetter(s, ' '), null);
});

test('guessing every letter wins', () => {
  let s = game('GOA');
  for (const letter of ['g', 'o', 'a']) s = guessLetter(s, letter);
  assert.ok(isSolved(s));
  assert.equal(s.outcome, 'won');
  assert.equal(maskedPhrase(s), 'GOA');
});

test('spaces do not need guessing', () => {
  let s = game('A B');
  for (const letter of ['a', 'b']) s = guessLetter(s, letter);
  assert.equal(s.outcome, 'won');
  assert.deepEqual(lettersIn('A B'), ['A', 'B']);
});

test('six wrong guesses loses', () => {
  let s = game('GOA');
  for (const letter of ['z', 'x', 'q', 'w', 'v', 'b']) s = guessLetter(s, letter);
  assert.equal(s.wrong, MAX_WRONG_GUESSES);
  assert.equal(s.outcome, 'lost');
  assert.equal(remainingGuesses(s), 0);
});

test('a finished game accepts no more guesses', () => {
  let s = game('GOA');
  for (const letter of ['g', 'o', 'a']) s = guessLetter(s, letter);
  assert.equal(guessLetter(s, 'z'), null);
});

test('the setter and guesser are recorded, so the setter can watch', () => {
  const s = game();
  assert.equal(s.setterId, setter);
  assert.equal(s.guesserId, guesser);
});

test('guessLetter never mutates the state it was given', () => {
  const before = game('GOA');
  guessLetter(before, 'g');
  assert.deepEqual(before.guessed, []);
  assert.equal(before.wrong, 0);
});
