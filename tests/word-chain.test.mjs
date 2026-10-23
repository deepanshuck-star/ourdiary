import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHAIN_WORD,
  addChainWord,
  chainScores,
  createWordChain,
  otherChainPlayer,
  requiredLetter,
  validateChainWord,
} from '../src/lib/features/games/wordChain.ts';

const P1 = 'alex';
const P2 = 'maya';
const fresh = () => createWordChain([P1, P2], 'places');

test('the first word can start with anything', () => {
  const s = fresh();
  assert.equal(requiredLetter(s), null);
  assert.equal(validateChainWord(s, 'goa'), null);
});

test('the next word must start with the previous word’s last letter', () => {
  const s = addChainWord(fresh(), 'goa', P1);
  assert.equal(requiredLetter(s), 'A');
  assert.equal(validateChainWord(s, 'agra'), null);
  assert.match(validateChainWord(s, 'delhi'), /start with “A”/);
});

test('the starting-letter check ignores case', () => {
  const s = addChainWord(fresh(), 'Goa', P1);
  assert.equal(validateChainWord(s, 'Agra'), null);
  assert.equal(validateChainWord(s, 'AGRA'), null);
});

test('repeats are refused, case-insensitively', () => {
  const s = addChainWord(fresh(), 'apple', P1);
  // "Apple" after "apple" is the same word with a capital letter.
  assert.match(validateChainWord(s, 'Apple'), /already in the chain/i);
});

test('only letters are allowed', () => {
  const s = fresh();
  assert.match(validateChainWord(s, 'two words'), /letters only/i);
  assert.match(validateChainWord(s, 'co-op'), /letters only/i);
  assert.match(validateChainWord(s, 'abc123'), /letters only/i);
});

test('length bounds are enforced', () => {
  const s = fresh();
  assert.match(validateChainWord(s, 'a'), /bit longer/i);
  assert.match(validateChainWord(s, 'a'.repeat(MAX_CHAIN_WORD + 1)), /under/i);
  assert.equal(validateChainWord(s, 'ab'), null);
});

test('an empty word is refused', () => {
  assert.match(validateChainWord(fresh(), '   '), /type a word/i);
});

test('addChainWord refuses exactly what validateChainWord rejects', () => {
  // The two paths must agree, or the UI shows an error for a move that worked.
  const s = addChainWord(fresh(), 'goa', P1);
  assert.equal(addChainWord(s, 'delhi', P2), null);
  assert.equal(addChainWord(s, 'goa', P2), null);
  assert.equal(addChainWord(s, '!!', P2), null);
  assert.ok(addChainWord(s, 'agra', P2));
});

test('a player outside the game cannot add a word', () => {
  assert.equal(addChainWord(fresh(), 'goa', 'stranger'), null);
});

test('links record who played each word, and scores count them', () => {
  let s = addChainWord(fresh(), 'goa', P1);
  s = addChainWord(s, 'agra', P2);
  s = addChainWord(s, 'assam', P1);
  assert.deepEqual(s.links.map((l) => l.playerId), [P1, P2, P1]);
  assert.deepEqual(chainScores(s), { [P1]: 2, [P2]: 1 });
});

test('otherChainPlayer alternates', () => {
  const s = fresh();
  assert.equal(otherChainPlayer(s, P1), P2);
  assert.equal(otherChainPlayer(s, P2), P1);
});

test('addChainWord never mutates the state it was given', () => {
  const before = fresh();
  addChainWord(before, 'goa', P1);
  assert.deepEqual(before.links, []);
});
