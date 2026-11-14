import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SCENES,
  CROSSFADE_MS,
  nextSceneIndex,
  previousSceneIndex,
  timeWords,
  seededRandom,
  rainCount,
  makeRain,
  advanceStreak,
} from '../src/lib/features/barsaat.ts';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

test('scenes loop round in both directions', () => {
  assert.equal(nextSceneIndex(0), 1);
  assert.equal(nextSceneIndex(SCENES.length - 1), 0);
  assert.equal(previousSceneIndex(0), SCENES.length - 1);
  assert.equal(nextSceneIndex(5, 0), 0);
});

test('every scene holds long enough to finish writing before it fades', () => {
  for (const scene of SCENES) {
    const words = timeWords(scene.lines);
    const last = words.at(-1);
    // The last word lands, then gets at least a couple of seconds to be read.
    const done = last ? last.delay + 2000 : 0;
    assert.ok(done <= scene.duration, `${scene.id} ends before its words do`);
    assert.ok(scene.duration > CROSSFADE_MS);
  }
});

test('words are timed in order, with a breath between lines', () => {
  const words = timeWords(['एक दो', 'तीन'], { start: 100, perWord: 10, lineBreath: 50 });
  assert.deepEqual(
    words.map((w) => [w.text, w.line, w.delay]),
    [
      ['एक', 0, 100],
      ['दो', 0, 110],
      ['तीन', 1, 170],
    ]
  );
});

test('words keep their vowel signs and conjuncts whole', () => {
  const words = timeWords(['बूँदों में', 'काग़ज़']);
  assert.deepEqual(words.map((w) => w.text), ['बूँदों', 'में', 'काग़ज़']);
});

test('the rain is the same every time for the same seed', () => {
  assert.deepEqual(makeRain(400, 800, 3), makeRain(400, 800, 3));
  assert.notDeepEqual(makeRain(400, 800, 3), makeRain(400, 800, 4));
  const r = seededRandom(1);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1);
  }
});

test('rain stays sparse on a phone and bounded on a big screen', () => {
  assert.equal(rainCount(0, 0), 24);
  assert.ok(rainCount(390, 844) >= 24 && rainCount(390, 844) <= 30);
  assert.equal(rainCount(5000, 5000), 160);
});

test('a streak that falls off the bottom comes back above the top', () => {
  const s = { x: 100, y: 790, length: 20, speed: 1000, alpha: 0.2, width: 1 };
  const moved = advanceStreak(s, 0.1, 400, 800);
  assert.ok(moved.y < s.y, `expected it to wrap back up, got y=${moved.y}`);
  assert.ok(moved.x < s.x, 'and back to the left, so it falls along the same slant');
  const still = advanceStreak(s, 0.001, 400, 800);
  assert.ok(still.y > s.y && still.x > s.x, 'falls down and drifts with the slant');
});

test('the film is in the drawer and stills itself when motion is off', () => {
  assert.ok(read('src', 'components', 'layout', 'exploreNav.ts').includes("href: '/barsaat'"));
  assert.ok(read('src', 'lib', 'features', 'nav-groups.ts').includes("'/barsaat'"));
  const css = read('src', 'components', 'barsaat', 'barsaat.css');
  assert.ok(css.includes(':root[data-motion="off"]'));
});
