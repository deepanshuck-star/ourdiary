import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SET_BLURBS,
  THIRTY_SIX_QUESTIONS,
  aronProgress,
  emptyRoseBudThorn,
  isRbtComplete,
  isRbtStarted,
  isTwoTruthsCorrect,
  nextAronQuestion,
  questionsInSet,
  rbtStreak,
  validateTwoTruths,
} from '../src/lib/features/games/conversation.ts';

test('there are exactly 36 questions, twelve to a set', () => {
  assert.equal(THIRTY_SIX_QUESTIONS.length, 36);
  assert.equal(questionsInSet(1).length, 12);
  assert.equal(questionsInSet(2).length, 12);
  assert.equal(questionsInSet(3).length, 12);
});

test('question ids are unique and every question has text', () => {
  const ids = THIRTY_SIX_QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, 36);
  assert.ok(THIRTY_SIX_QUESTIONS.every((q) => q.text.trim().length > 10));
  assert.ok(Object.keys(SET_BLURBS).length === 3);
});

test('the sets stay in order — the escalation is the design', () => {
  // Shuffling would break the procedure: set III asked cold doesn't work.
  const sets = THIRTY_SIX_QUESTIONS.map((q) => q.set);
  assert.deepEqual(sets, [...sets].sort((a, b) => a - b));
});

test('the next question is the first unanswered one', () => {
  assert.equal(nextAronQuestion([]).id, 'q1');
  assert.equal(nextAronQuestion(['q1']).id, 'q2');
  // A gap is filled before moving on.
  assert.equal(nextAronQuestion(['q2', 'q3']).id, 'q1');
});

test('answering all 36 ends the set', () => {
  const all = THIRTY_SIX_QUESTIONS.map((q) => q.id);
  assert.equal(nextAronQuestion(all), null);
  assert.deepEqual(aronProgress(all), { done: 36, total: 36, set: 3 });
});

test('progress reports which set you are in', () => {
  assert.deepEqual(aronProgress([]), { done: 0, total: 36, set: 1 });
  const throughSetOne = questionsInSet(1).map((q) => q.id);
  assert.deepEqual(aronProgress(throughSetOne), { done: 12, total: 36, set: 2 });
});

test('two truths needs three distinct, non-empty statements', () => {
  assert.equal(validateTwoTruths(['a', 'b', 'c'], 1), null);
  assert.match(validateTwoTruths(['a', 'b'], 0), /exactly three/i);
  assert.match(validateTwoTruths(['a', '', 'c'], 0), /fill in all three/i);
  assert.match(validateTwoTruths(['a', 'A', 'c'], 0), /different from each other/i);
  assert.match(validateTwoTruths(['a', 'b', 'x'.repeat(201)], 0), /under 200/i);
});

test('two truths needs a lie marked within range', () => {
  assert.match(validateTwoTruths(['a', 'b', 'c'], -1), /mark which one/i);
  assert.match(validateTwoTruths(['a', 'b', 'c'], 3), /mark which one/i);
});

test('two truths scoring waits for a guess', () => {
  const round = { authorId: 'u1', statements: ['a', 'b', 'c'], lieIndex: 2 };
  assert.equal(isTwoTruthsCorrect(round), null);
  assert.equal(isTwoTruthsCorrect({ ...round, guessIndex: 2 }), true);
  assert.equal(isTwoTruthsCorrect({ ...round, guessIndex: 0 }), false);
});

test('a guess of index 0 is a real guess, not a missing one', () => {
  // The `=== undefined` check matters: `if (!guessIndex)` would treat 0 as
  // "hasn't guessed yet".
  const round = { authorId: 'u1', statements: ['a', 'b', 'c'], lieIndex: 0, guessIndex: 0 };
  assert.equal(isTwoTruthsCorrect(round), true);
});

test('rose/bud/thorn tracks started and complete separately', () => {
  const empty = emptyRoseBudThorn('2026-10-23');
  assert.equal(isRbtStarted(empty), false);
  assert.equal(isRbtComplete(empty), false);

  const partial = { ...empty, rose: 'coffee together' };
  assert.ok(isRbtStarted(partial));
  assert.equal(isRbtComplete(partial), false);

  const full = { ...empty, rose: 'a', bud: 'b', thorn: 'c' };
  assert.ok(isRbtComplete(full));
});

test('the streak counts consecutive days back from today', () => {
  const entries = [
    { date: '2026-10-23', rose: 'a', bud: '', thorn: '' },
    { date: '2026-10-22', rose: '', bud: 'b', thorn: '' },
    { date: '2026-10-21', rose: '', bud: '', thorn: 'c' },
  ];
  assert.equal(rbtStreak(entries, '2026-10-23'), 3);
});

test('a gap breaks the streak', () => {
  const entries = [
    { date: '2026-10-23', rose: 'a', bud: '', thorn: '' },
    // 22nd missing
    { date: '2026-10-21', rose: 'c', bud: '', thorn: '' },
  ];
  assert.equal(rbtStreak(entries, '2026-10-23'), 1);
});

test('nothing today means no streak, however long the run before', () => {
  const entries = [
    { date: '2026-10-22', rose: 'a', bud: '', thorn: '' },
    { date: '2026-10-21', rose: 'b', bud: '', thorn: '' },
  ];
  assert.equal(rbtStreak(entries, '2026-10-23'), 0);
});

test('an empty entry does not keep a streak alive', () => {
  const entries = [{ date: '2026-10-23', rose: '', bud: '', thorn: '' }];
  assert.equal(rbtStreak(entries, '2026-10-23'), 0);
});

test('the streak crosses a month boundary', () => {
  const entries = [
    { date: '2026-11-01', rose: 'a', bud: '', thorn: '' },
    { date: '2026-10-31', rose: 'b', bud: '', thorn: '' },
    { date: '2026-10-30', rose: 'c', bud: '', thorn: '' },
  ];
  assert.equal(rbtStreak(entries, '2026-11-01'), 3);
});
