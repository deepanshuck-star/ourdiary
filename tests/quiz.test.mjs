import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOVE_LANGUAGES,
  LOVE_LANGUAGE_QUESTIONS,
  YOU_OR_ME_QUESTIONS,
  answerQuestion,
  answeredCount,
  compareYouOrMe,
  emptyProgress,
  resolvePick,
  scoreLoveLanguages,
  summariseYouOrMe,
} from '../src/lib/features/quiz.ts';

test('quizzes have the expected lengths', () => {
  assert.equal(YOU_OR_ME_QUESTIONS.length, 12);
  assert.equal(LOVE_LANGUAGE_QUESTIONS.length, 10);
});

test('love language questions cover every pair exactly once', () => {
  const pairs = new Set(LOVE_LANGUAGE_QUESTIONS.map((q) => [q.a.language, q.b.language].sort().join('|')));
  assert.equal(pairs.size, 10);
  for (const q of LOVE_LANGUAGE_QUESTIONS) assert.notEqual(q.a.language, q.b.language);
});

test('resolvePick translates first-person answers into people', () => {
  assert.equal(resolvePick('user_1', 'me'), 'user_1');
  assert.equal(resolvePick('user_1', 'partner'), 'user_2');
  assert.equal(resolvePick('user_2', 'me'), 'user_2');
  assert.equal(resolvePick('user_2', 'both'), 'both');
  assert.equal(resolvePick('user_2', null), null);
});

test('compareYouOrMe agrees when both point at the same person', () => {
  const qs = ['q1', 'q2', 'q3', 'q4'];
  // q1: A says "me", B says "partner" -> both mean A (agree)
  // q2: both say "me" -> they point at different people
  // q3: both say "both" -> agree
  // q4: unanswered by B -> not in sync
  const items = compareYouOrMe(['me', 'me', 'both', 'me'], ['partner', 'me', 'both', null], qs);
  assert.deepEqual(items.map((i) => i.agree), [true, false, true, false]);
  assert.equal(items[0].user_1, 'user_1');
  assert.equal(items[1].user_2, 'user_2');
  const { inSync, toTalkAbout } = summariseYouOrMe(items);
  assert.equal(inSync.length, 2);
  assert.deepEqual(toTalkAbout.map((i) => i.question), ['q2', 'q4']);
});

test('scoreLoveLanguages ranks all five languages', () => {
  // Always picking option "a" favours the language listed first most often (words: 4 times).
  const ranked = scoreLoveLanguages(LOVE_LANGUAGE_QUESTIONS.map(() => 'a'));
  assert.equal(ranked.length, 5);
  assert.deepEqual(ranked.map((r) => r.language), ['words', 'time', 'gifts', 'service', 'touch']);
  assert.deepEqual(ranked.map((r) => r.score), [4, 3, 2, 1, 0]);
});

test('scoreLoveLanguages breaks ties in canonical order and ignores blanks', () => {
  const ranked = scoreLoveLanguages(LOVE_LANGUAGE_QUESTIONS.map(() => null));
  assert.deepEqual(ranked.map((r) => r.language), LOVE_LANGUAGES);
  assert.ok(ranked.every((r) => r.score === 0));
});

test('answerQuestion saves progress, resumes and finishes', () => {
  let p = emptyProgress(3);
  p = answerQuestion(p, 0, 'a');
  assert.deepEqual(p, { answers: ['a', null, null], index: 1, done: false });
  p = answerQuestion(p, 1, 'b');
  assert.equal(answeredCount(p), 2);
  p = answerQuestion(p, 2, 'a');
  assert.equal(p.done, true);
});

test('answerQuestion jumps back to a skipped question before finishing', () => {
  const p = answerQuestion({ answers: ['a', null, null], index: 2, done: false }, 2, 'b');
  assert.equal(p.done, false);
  assert.equal(p.index, 1);
});

test('editing a finished quiz walks forward instead of finishing early', () => {
  const p = answerQuestion({ answers: ['a', 'b', 'a'], index: 0, done: false }, 0, 'b');
  assert.deepEqual(p, { answers: ['b', 'b', 'a'], index: 1, done: false });
});
