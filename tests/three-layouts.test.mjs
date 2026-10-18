import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ringRadius,
  ringLayout,
  ringStep,
  frontIndexForRotation,
  rotationForIndex,
} from '../src/lib/features/ring-layout.ts';
import {
  trackControlPoints,
  stationPointIndices,
  wrapProgress,
  controlPointParam,
  MIN_TRACK_POINTS,
} from '../src/lib/features/track-layout.ts';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('ringRadius grows with photo count and respects the minimum', () => {
  assert.equal(ringRadius(0), 2.6);
  assert.equal(ringRadius(2), 2.6);
  assert.ok(ringRadius(40) > ringRadius(20));
});

test('ringLayout spaces slots evenly on the circle, facing outward', () => {
  const r = 4;
  const slots = ringLayout(4, r);
  assert.equal(slots.length, 4);
  close(slots[0].x, 0);
  close(slots[0].z, r);
  close(slots[1].x, r);
  close(slots[1].z, 0);
  close(slots[2].z, -r);
  for (const s of slots) {
    close(Math.hypot(s.x, s.z), r);
    assert.equal(s.rotationY, s.angle);
  }
  assert.deepEqual(ringLayout(0, r), []);
});

test('frontIndexForRotation / rotationForIndex round-trip', () => {
  const n = 7;
  const current = 3 * Math.PI * 2 + 0.2;
  for (let i = 0; i < n; i++) {
    const rot = rotationForIndex(i, n, current);
    assert.equal(frontIndexForRotation(rot, n), i);
    assert.ok(Math.abs(rot - current) <= Math.PI + 1e-9);
  }
  assert.equal(frontIndexForRotation(0, 5), 0);
  assert.equal(frontIndexForRotation(-ringStep(5), 5), 1);
  assert.equal(frontIndexForRotation(ringStep(5), 5), 4);
  assert.equal(frontIndexForRotation(0, 0), -1);
});

test('trackControlPoints returns a closed loop with at least MIN_TRACK_POINTS', () => {
  assert.equal(trackControlPoints(2).length, MIN_TRACK_POINTS);
  const pts = trackControlPoints(9);
  assert.equal(pts.length, 9);
  for (const p of pts) {
    assert.equal(p.length, 3);
    assert.ok(p.every(Number.isFinite));
    assert.ok(Math.abs(p[0]) <= 7 * 1.15 + 1e-6);
    assert.ok(Math.abs(p[2]) <= 4.2 * 1.15 + 1e-6);
  }
  const keys = new Set(pts.map((p) => p.join(',')));
  assert.equal(keys.size, pts.length);
});

test('stationPointIndices spreads stations over the loop', () => {
  assert.deepEqual(stationPointIndices(9), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(stationPointIndices(3), [0, 2, 4]);
  assert.deepEqual(stationPointIndices(0), []);
});

test('wrapProgress and controlPointParam stay in [0,1)', () => {
  close(wrapProgress(1.25), 0.25);
  close(wrapProgress(-0.25), 0.75);
  assert.equal(controlPointParam(0, 6), 0);
  close(controlPointParam(3, 6), 0.5);
  assert.equal(controlPointParam(6, 6), 0);
});
