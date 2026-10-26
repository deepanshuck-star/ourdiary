import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISPLAY_MAX_EDGE,
  DISPLAY_QUALITY,
  THUMB_MAX_EDGE,
  THUMB_QUALITY,
  canCompressInBrowser,
  fitWithin,
  isCompressibleImage,
} from '../src/lib/crypto/image.ts';

// Only the DOM-free half of image.ts is testable here: the sizing maths and
// the format rules. createImageBitmap/OffscreenCanvas are browser-only, which
// is exactly why the maths was pulled out of them.

test('an image smaller than the limit is left alone, never upscaled', () => {
  // Blowing a 120px avatar up to 1600px would cost bytes and add no detail.
  assert.deepEqual(fitWithin(120, 90, DISPLAY_MAX_EDGE), { width: 120, height: 90 });
  assert.deepEqual(fitWithin(400, 400, THUMB_MAX_EDGE), { width: 400, height: 400 });
  assert.deepEqual(fitWithin(1, 1, 1600), { width: 1, height: 1 });
});

test('a large photo is scaled so its longest edge hits the limit', () => {
  // A 4032x3024 phone photo, landscape then portrait.
  assert.deepEqual(fitWithin(4032, 3024, DISPLAY_MAX_EDGE), { width: 1600, height: 1200 });
  assert.deepEqual(fitWithin(3024, 4032, DISPLAY_MAX_EDGE), { width: 1200, height: 1600 });
  assert.deepEqual(fitWithin(4032, 3024, THUMB_MAX_EDGE), { width: 400, height: 300 });
});

test('aspect ratio survives the scale, to within a rounded pixel', () => {
  for (const [w, h] of [
    [4032, 3024],
    [1920, 1080],
    [1080, 1920],
    [2000, 1333],
    [5000, 37],
  ]) {
    for (const maxEdge of [THUMB_MAX_EDGE, DISPLAY_MAX_EDGE, 64]) {
      const out = fitWithin(w, h, maxEdge);
      assert.equal(Math.max(out.width, out.height), maxEdge, `${w}x${h} -> ${maxEdge}`);
      // Allowed drift is one pixel of rounding on the shorter edge, which is
      // all a whole-pixel canvas size can promise.
      const ratio = w / h;
      const drift = Math.abs(out.width / out.height - ratio) / ratio;
      const tolerance = 1 / Math.min(out.width, out.height);
      assert.ok(drift <= tolerance, `aspect drifted by ${drift} for ${w}x${h} -> ${maxEdge}`);
    }
  }
});

test('an extreme panorama still keeps at least one row of pixels', () => {
  // 20000x3 scaled to 400 wants 0.06px of height. A canvas cannot draw that.
  const out = fitWithin(20000, 3, THUMB_MAX_EDGE);
  assert.equal(out.width, 400);
  assert.equal(out.height, 1);
});

test('results are whole pixels', () => {
  const out = fitWithin(1333, 999, 500);
  assert.equal(out.width, Math.round(out.width));
  assert.equal(out.height, Math.round(out.height));
  assert.deepEqual(out, { width: 500, height: 375 });
});

test('nonsense dimensions come back as 0x0 rather than NaN', () => {
  // The caller skips the file; a NaN would reach a canvas and throw there.
  const zero = { width: 0, height: 0 };
  assert.deepEqual(fitWithin(0, 100, 400), zero);
  assert.deepEqual(fitWithin(100, 0, 400), zero);
  assert.deepEqual(fitWithin(-100, 100, 400), zero);
  assert.deepEqual(fitWithin(100, 100, 0), zero);
  assert.deepEqual(fitWithin(NaN, 100, 400), zero);
  assert.deepEqual(fitWithin(100, Infinity, 400), zero);
});

test('fitting an already-fitted size is a no-op', () => {
  // compressImage() draws both variants from the source bitmap, so the
  // function has to be idempotent for the sizes it produces.
  const display = fitWithin(4032, 3024, DISPLAY_MAX_EDGE);
  assert.deepEqual(fitWithin(display.width, display.height, DISPLAY_MAX_EDGE), display);
});

test('only formats a canvas can honestly re-encode are compressed', () => {
  assert.equal(isCompressibleImage('image/jpeg'), true);
  assert.equal(isCompressibleImage('image/png'), true);
  assert.equal(isCompressibleImage('image/webp'), true);
  assert.equal(isCompressibleImage('image/heic'), true);
  // A canvas keeps only the first frame of a GIF, and rasterising an SVG
  // throws away the thing that makes it an SVG.
  assert.equal(isCompressibleImage('image/gif'), false);
  assert.equal(isCompressibleImage('image/svg+xml'), false);
  assert.equal(isCompressibleImage('video/mp4'), false);
  assert.equal(isCompressibleImage('application/pdf'), false);
  assert.equal(isCompressibleImage(''), false);
  assert.equal(isCompressibleImage(null), false);
  assert.equal(isCompressibleImage(undefined), false);
});

test('the mime check tolerates what browsers actually send', () => {
  assert.equal(isCompressibleImage('IMAGE/JPEG'), true);
  assert.equal(isCompressibleImage('image/jpeg; charset=binary'), true);
  assert.equal(isCompressibleImage(' image/png '), true); // stray whitespace, not a different format
});

test('the variant limits and qualities are sane', () => {
  assert.ok(THUMB_MAX_EDGE < DISPLAY_MAX_EDGE);
  for (const q of [THUMB_QUALITY, DISPLAY_QUALITY]) {
    assert.ok(q > 0 && q <= 1, `quality ${q} is out of range`);
  }
  // Thumbnails are shown small, so they can afford to be rougher.
  assert.ok(THUMB_QUALITY <= DISPLAY_QUALITY);
});

test('compression is reported as unavailable outside a browser', () => {
  // Node has no OffscreenCanvas, so the upload path must fall back rather
  // than throw — the same branch an old Safari takes.
  assert.equal(canCompressInBrowser(), false);
});
