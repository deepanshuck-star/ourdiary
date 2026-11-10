import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canChangeStake,
  createHeartsKisses,
  findHKWin,
  isRoundOver,
  markFor,
  nextRound,
  placeMark,
  resetScore,
  setStake,
} from '../src/lib/features/games/heartsKisses.ts';

const A = 'alex';
const B = 'maya';
const fresh = (starter = A) => createHeartsKisses([A, B], starter, 'Loser makes breakfast');

/** Plays cells in order, alternating from whoever's turn it is. */
function play(state, cells) {
  let s = state;
  for (const cell of cells) {
    const next = placeMark(s, cell, s.turn);
    assert.ok(next, `cell ${cell} should be playable`);
    s = next;
  }
  return s;
}

test('a new match starts with the chosen player and an empty board', () => {
  const s = fresh(B);
  assert.equal(s.turn, B);
  assert.equal(s.starter, B);
  assert.ok(s.board.every((c) => c === null));
  assert.deepEqual(s.score, { [A]: 0, [B]: 0, draws: 0 });
});

test('hearts belong to the first player and kisses to the second, whoever starts', () => {
  const s = fresh(B);
  assert.equal(markFor(s, A), '💖');
  assert.equal(markFor(s, B), '💋');
  assert.equal(markFor(s, 'stranger'), '');
});

test('a player cannot move out of turn — the bug that made it a one-phone game', () => {
  const s = fresh(A);
  assert.equal(placeMark(s, 0, B), null, 'Maya cannot place while it is Alex’s turn');
  const afterAlex = placeMark(s, 0, A);
  assert.ok(afterAlex);
  assert.equal(placeMark(afterAlex, 1, A), null, 'Alex cannot place twice in a row');
  assert.ok(placeMark(afterAlex, 1, B));
});

test('taken cells, strangers and out-of-range cells are refused', () => {
  const s = placeMark(fresh(), 4, A);
  assert.equal(placeMark(s, 4, B), null);
  assert.equal(placeMark(s, 9, B), null);
  assert.equal(placeMark(s, -1, B), null);
  assert.equal(placeMark(s, 0, 'stranger'), null);
});

test('three in a row wins, scores, highlights the line and ends the round', () => {
  // A: 0,1,2 across the top; B: 3,4.
  const s = play(fresh(A), [0, 3, 1, 4, 2]);
  assert.equal(s.winner, A);
  assert.deepEqual(s.winningLine, [0, 1, 2]);
  assert.equal(s.turn, null);
  assert.equal(s.score[A], 1);
  assert.ok(isRoundOver(s));
  assert.equal(placeMark(s, 5, B), null, 'no moves after the round is decided');
});

test('a full board with no line is a draw', () => {
  // A B A / A B B / B A A
  const s = play(fresh(A), [0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(s.winner, null);
  assert.equal(s.draw, true);
  assert.equal(s.score.draws, 1);
  assert.equal(s.turn, null);
});

test('the next round clears the board, keeps the score and hands the opening move over', () => {
  const won = play(fresh(A), [0, 3, 1, 4, 2]);
  const r2 = nextRound(won);
  assert.ok(r2.board.every((c) => c === null));
  assert.equal(r2.starter, B);
  assert.equal(r2.turn, B);
  assert.equal(r2.round, 2);
  assert.equal(r2.score[A], 1);
  assert.equal(nextRound(r2).starter, A);
});

test('the stake can change before the first move or after the round, never mid-round', () => {
  const s = fresh();
  assert.ok(canChangeStake(s));
  assert.equal(setStake(s, '  Winner picks the movie  ').stake, 'Winner picks the movie');
  const mid = placeMark(s, 0, A);
  assert.equal(canChangeStake(mid), false);
  assert.equal(setStake(mid, 'Something else'), null);
  const over = play(s, [0, 3, 1, 4, 2]);
  assert.ok(setStake(over, 'Rematch stakes'));
  assert.equal(setStake(over, '   '), null);
});

test('resetting the score starts again from round one', () => {
  const won = play(fresh(A), [0, 3, 1, 4, 2]);
  const reset = resetScore(won);
  assert.deepEqual(reset.score, { [A]: 0, [B]: 0, draws: 0 });
  assert.equal(reset.round, 1);
  assert.ok(reset.board.every((c) => c === null));
});

test('findHKWin spots every line and ignores mixed ones', () => {
  assert.deepEqual(findHKWin([A, null, null, null, A, null, null, null, A]), { winner: A, line: [0, 4, 8] });
  assert.equal(findHKWin([A, B, A, null, null, null, null, null, null]), null);
});
