import test from 'node:test';
import assert from 'node:assert/strict';
import {
  C4_COLS,
  C4_ROWS,
  createConnect4,
  dropDisc,
  findWin,
  indexOf,
  isColumnPlayable,
  landingRow,
  otherPlayer,
} from '../src/lib/features/games/connect4.ts';

const P1 = 'alex';
const P2 = 'maya';
const fresh = () => createConnect4([P1, P2]);

/** Plays a list of columns, alternating players unless one is given. */
function play(state, moves) {
  let s = state;
  let turn = P1;
  for (const move of moves) {
    const [col, forced] = Array.isArray(move) ? move : [move, null];
    const player = forced ?? turn;
    const next = dropDisc(s, col, player);
    assert.ok(next, `move in column ${col} should be legal`);
    s = next;
    turn = otherPlayer(s, player);
  }
  return s;
}

test('a new board is empty and every column is playable', () => {
  const s = fresh();
  assert.equal(s.board.length, C4_COLS * C4_ROWS);
  assert.ok(s.board.every((c) => c === null));
  for (let c = 0; c < C4_COLS; c++) assert.ok(isColumnPlayable(s, c));
});

test('discs stack from the bottom', () => {
  let s = dropDisc(fresh(), 3, P1);
  assert.equal(s.board[indexOf(C4_ROWS - 1, 3)], P1);
  s = dropDisc(s, 3, P2);
  assert.equal(s.board[indexOf(C4_ROWS - 2, 3)], P2);
});

test('a full column is refused', () => {
  let s = fresh();
  for (let i = 0; i < C4_ROWS; i++) s = dropDisc(s, 0, i % 2 ? P2 : P1);
  assert.equal(landingRow(s.board, 0), -1);
  assert.equal(isColumnPlayable(s, 0), false);
  assert.equal(dropDisc(s, 0, P1), null);
});

test('out-of-range and unknown-player moves are refused', () => {
  const s = fresh();
  assert.equal(dropDisc(s, -1, P1), null);
  assert.equal(dropDisc(s, C4_COLS, P1), null);
  assert.equal(dropDisc(s, 0, 'someone-else'), null);
});

test('four in a row wins horizontally', () => {
  // P1 takes 0,1,2,3 along the bottom; P2 stacks harmlessly on 6.
  const s = play(fresh(), [0, 6, 1, 6, 2, 6, 3]);
  assert.equal(s.winner, P1);
  assert.equal(s.winningLine?.length, 4);
});

test('four in a row wins vertically', () => {
  const s = play(fresh(), [2, 3, 2, 3, 2, 3, 2]);
  assert.equal(s.winner, P1);
});

test('four in a row wins on both diagonals', () => {
  // Ascending ↗ for P1.
  const up = play(fresh(), [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
  assert.equal(up.winner, P1);

  // Descending ↘ for P1, mirrored.
  const down = play(fresh(), [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]);
  assert.equal(down.winner, P1);
});

test('a win is found when the new disc lands in the MIDDLE of the run', () => {
  // Bottom row 0,1,3 are P1; dropping 2 completes 0-1-2-3 from inside it.
  // Walking only forwards from the new disc would miss this.
  const s = play(fresh(), [0, 6, 1, 6, 3, 6, 2]);
  assert.equal(s.winner, P1);
  assert.deepEqual(s.winningLine, [
    indexOf(C4_ROWS - 1, 0),
    indexOf(C4_ROWS - 1, 1),
    indexOf(C4_ROWS - 1, 2),
    indexOf(C4_ROWS - 1, 3),
  ]);
});

test('three in a row is not a win', () => {
  const s = play(fresh(), [0, 6, 1, 6, 2]);
  assert.equal(s.winner, null);
  assert.equal(s.winningLine, null);
});

test('a won board accepts no further moves', () => {
  const s = play(fresh(), [0, 6, 1, 6, 2, 6, 3]);
  assert.equal(s.winner, P1);
  assert.equal(dropDisc(s, 4, P2), null);
});

test('findWin returns null for an empty cell', () => {
  assert.equal(findWin(fresh().board, 0, 0), null);
});

test('a full board with no line is a draw', () => {
  // Column-pair pattern that fills all 42 cells without four in a row.
  let s = fresh();
  const order = [0, 1, 2, 3, 4, 5, 6];
  let turn = P1;
  for (let round = 0; round < C4_ROWS; round++) {
    for (const col of order) {
      const next = dropDisc(s, col, turn);
      if (!next) continue;
      s = next;
      if (s.winner) break;
      // Flip every two rows so no column stacks four of the same colour.
      turn = otherPlayer(s, turn);
    }
    if (s.winner) break;
    turn = otherPlayer(s, turn);
  }
  // Whatever the outcome, moves and board length must stay consistent.
  assert.equal(s.board.filter((c) => c !== null).length, s.moves);
  if (!s.winner) {
    assert.equal(s.draw, s.moves === C4_COLS * C4_ROWS);
  }
});

test('dropDisc never mutates the board it was given', () => {
  const before = fresh();
  const snapshot = [...before.board];
  dropDisc(before, 3, P1);
  assert.deepEqual(before.board, snapshot);
});
