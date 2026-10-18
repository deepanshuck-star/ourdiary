import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  tiltFromPointer,
  tiltFromOrientation,
  clearedFraction,
  shouldRevealScratch,
  addUniqueId,
  envelopeTimeline,
  NEUTRAL_TILT,
} from '../src/lib/features/fx-math.ts';

const rect = { left: 100, top: 50, width: 200, height: 100 };

test('clamp bounds values and handles NaN', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(clamp(-5, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(clamp(NaN, 0, 1), 0);
});

test('tiltFromPointer is neutral at the centre', () => {
  assert.deepEqual(tiltFromPointer(200, 100, rect, 8), { rx: 0, ry: 0, gx: 50, gy: 50 });
});

test('tiltFromPointer reaches max tilt at corners and never exceeds it', () => {
  const tl = tiltFromPointer(100, 50, rect, 8);
  assert.deepEqual(tl, { rx: 8, ry: -8, gx: 0, gy: 0 });
  const br = tiltFromPointer(300, 150, rect, 8);
  assert.deepEqual(br, { rx: -8, ry: 8, gx: 100, gy: 100 });
  const outside = tiltFromPointer(9999, -9999, rect, 8);
  assert.ok(Math.abs(outside.rx) <= 8 && Math.abs(outside.ry) <= 8);
});

test('tiltFromPointer is neutral for degenerate input', () => {
  assert.deepEqual(tiltFromPointer(1, 1, { left: 0, top: 0, width: 0, height: 10 }, 8), NEUTRAL_TILT);
  assert.deepEqual(tiltFromPointer(NaN, 1, rect, 8), NEUTRAL_TILT);
});

test('tiltFromOrientation maps and clamps angles', () => {
  assert.deepEqual(tiltFromOrientation(45, 0, 8), { rx: 0, ry: 0, gx: 50, gy: 50 });
  const tilted = tiltFromOrientation(120, 90, 8);
  assert.equal(tilted.rx, -8);
  assert.equal(tilted.ry, 8);
  assert.equal(tiltFromOrientation(null, 0, 8), null);
  assert.equal(tiltFromOrientation(10, undefined, 8), null);
  assert.equal(tiltFromOrientation(Infinity, 0, 8), null);
});

function makeImage(width, height, clearedPredicate) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = clearedPredicate(x, y) ? 0 : 255;
    }
  }
  return data;
}

test('clearedFraction measures transparent area', () => {
  const w = 40;
  const h = 20;
  assert.equal(clearedFraction(makeImage(w, h, () => false), w, h, 1), 0);
  assert.equal(clearedFraction(makeImage(w, h, () => true), w, h, 1), 1);
  const half = clearedFraction(makeImage(w, h, (x) => x < w / 2), w, h, 1);
  assert.equal(half, 0.5);
  const sampled = clearedFraction(makeImage(w, h, (x) => x < w / 2), w, h, 4);
  assert.ok(Math.abs(sampled - 0.5) < 0.05);
});

test('clearedFraction is safe on bad input', () => {
  assert.equal(clearedFraction(new Uint8ClampedArray(0), 10, 10), 0);
  assert.equal(clearedFraction(new Uint8ClampedArray(16), 0, 0), 0);
});

test('shouldRevealScratch uses a 55% threshold', () => {
  assert.equal(shouldRevealScratch(0.54), false);
  assert.equal(shouldRevealScratch(0.55), true);
  assert.equal(shouldRevealScratch(NaN), false);
});

test('addUniqueId avoids duplicates and tolerates bad stored values', () => {
  const list = ['a'];
  assert.equal(addUniqueId(list, 'a'), list);
  assert.deepEqual(addUniqueId(list, 'b'), ['a', 'b']);
  assert.deepEqual(addUniqueId(null, 'x'), ['x']);
  assert.deepEqual(addUniqueId('oops', 'x'), ['x']);
});

test('envelopeTimeline is ordered, short per stage, and instant for reduced motion', () => {
  assert.deepEqual(envelopeTimeline(true), [{ phase: 'done', at: 0 }]);
  const steps = envelopeTimeline(false);
  assert.equal(steps.at(-1).phase, 'done');
  for (let i = 1; i < steps.length; i++) {
    const gap = steps[i].at - steps[i - 1].at;
    assert.ok(gap > 0 && gap <= 500, `stage gap ${gap}ms`);
  }
});
