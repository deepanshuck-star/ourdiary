import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDots,
  dotsWinner,
  drawLine,
  isBoxComplete,
  isComplete,
  isLineDrawn,
  scores,
} from '../src/lib/features/games/dotsAndBoxes.ts';

const P1 = 'alex';
const P2 = 'maya';

test('a new board has no lines and no boxes', () => {
  const s = createDots([P1, P2], 2);
  assert.ok(s.horizontal.every((v) => v === false));
  assert.ok(s.vertical.every((v) => v === false));
  assert.ok(s.boxes.every((b) => b === null));
  assert.equal(isComplete(s), false);
});

test('a drawn line stays drawn and cannot be redrawn', () => {
  const s = drawLine(createDots([P1, P2], 2), 'h', 0, 0, P1).state;
  assert.ok(isLineDrawn(s, 'h', 0, 0));
  assert.equal(drawLine(s, 'h', 0, 0, P2), null);
});

test('out-of-range lines and unknown players are refused', () => {
  const s = createDots([P1, P2], 2);
  assert.equal(drawLine(s, 'h', -1, 0, P1), null);
  assert.equal(drawLine(s, 'h', 0, 2, P1), null); // col must be < size
  assert.equal(drawLine(s, 'v', 2, 0, P1), null); // row must be < size
  assert.equal(drawLine(s, 'v', 0, 3, P1), null);
  assert.equal(drawLine(s, 'h', 0, 0, 'stranger'), null);
});

test('closing a box claims it and keeps the turn', () => {
  let s = createDots([P1, P2], 2);
  s = drawLine(s, 'h', 0, 0, P1).state; // top
  s = drawLine(s, 'v', 0, 0, P1).state; // left
  s = drawLine(s, 'v', 0, 1, P1).state; // right
  const result = drawLine(s, 'h', 1, 0, P1); // bottom — closes box (0,0)

  assert.equal(result.claimed, 1);
  assert.equal(result.state.boxes[0], P1);
  assert.ok(isBoxComplete(result.state, 0, 0));
  // Claiming earns another go — the rule that gives this game its endgame.
  assert.equal(result.nextPlayer, P1);
  assert.equal(result.state.claimedLast, true);
});

test('a move that closes nothing passes the turn', () => {
  const result = drawLine(createDots([P1, P2], 2), 'h', 0, 0, P1);
  assert.equal(result.claimed, 0);
  assert.equal(result.nextPlayer, P2);
  assert.equal(result.state.claimedLast, false);
});

test('one line can close TWO boxes at once', () => {
  // The classic bug: only checking one side of the line. Build both boxes of
  // a 1x2 strip so the shared wall completes both.
  let s = createDots([P1, P2], 2);
  // Box (0,0): top, left, bottom. Box (1,0): left, bottom, top is the shared wall.
  s = drawLine(s, 'h', 0, 0, P1).state; // top of (0,0)
  s = drawLine(s, 'v', 0, 0, P1).state; // left of (0,0)
  s = drawLine(s, 'v', 0, 1, P1).state; // right of (0,0)
  s = drawLine(s, 'v', 1, 0, P1).state; // left of (1,0)
  s = drawLine(s, 'v', 1, 1, P1).state; // right of (1,0)
  s = drawLine(s, 'h', 2, 0, P1).state; // bottom of (1,0)

  const result = drawLine(s, 'h', 1, 0, P2); // the shared wall
  assert.equal(result.claimed, 2);
  assert.equal(result.state.boxes[0], P2);
  assert.equal(result.state.boxes[2], P2); // box (1,0) in a 2x2 grid
});

test('scores count each player’s boxes', () => {
  let s = createDots([P1, P2], 2);
  s = drawLine(s, 'h', 0, 0, P1).state;
  s = drawLine(s, 'v', 0, 0, P1).state;
  s = drawLine(s, 'v', 0, 1, P1).state;
  s = drawLine(s, 'h', 1, 0, P1).state;
  assert.deepEqual(scores(s), { [P1]: 1, [P2]: 0 });
});

test('the winner is only known once the board is full', () => {
  let s = createDots([P1, P2], 2);
  assert.equal(dotsWinner(s), null);

  // Fill every line; P1 takes every box by always being the one to close.
  for (let r = 0; r <= 2; r++) for (let c = 0; c < 2; c++) {
    const res = drawLine(s, 'h', r, c, P1);
    if (res) s = res.state;
  }
  for (let r = 0; r < 2; r++) for (let c = 0; c <= 2; c++) {
    const res = drawLine(s, 'v', r, c, P1);
    if (res) s = res.state;
  }
  assert.ok(isComplete(s));
  assert.equal(dotsWinner(s), P1);
});

test('equal boxes is a draw', () => {
  const s = createDots([P1, P2], 2);
  const drawn = { ...s, boxes: [P1, P1, P2, P2] };
  assert.ok(isComplete(drawn));
  assert.equal(dotsWinner(drawn), 'draw');
});

test('a finished board accepts no more lines', () => {
  const s = { ...createDots([P1, P2], 2), boxes: [P1, P1, P2, P2] };
  assert.equal(drawLine(s, 'h', 0, 0, P1), null);
});

test('drawLine never mutates the state it was given', () => {
  const before = createDots([P1, P2], 2);
  const h = [...before.horizontal];
  const boxes = [...before.boxes];
  drawLine(before, 'h', 0, 0, P1);
  assert.deepEqual(before.horizontal, h);
  assert.deepEqual(before.boxes, boxes);
});
