import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_MOODS, ambienceFor, scaleLife, isWorldMood } from '../src/lib/world/mood.ts';
import { soundscapeFor, MAX_LAYERS, DEFAULT_SOUND, parseSoundPreferences, SOUND_PLACES } from '../src/lib/world/sound.ts';
import { DAY_PHASES, SEASONS, WEATHERS } from '../src/lib/world/world.ts';

test('a mood changes nothing when the viewer has not allowed it', () => {
  for (const mood of WORLD_MOODS) {
    const off = ambienceFor(mood, false);
    assert.equal(off.lifeScale, 1);
    assert.equal(off.pace, 1);
    assert.equal(off.line, null);
    assert.equal(off.phaseHint, null);
  }
});

test('mood lines describe the world, never the partner', () => {
  for (const mood of WORLD_MOODS) {
    const { line } = ambienceFor(mood, true);
    if (!line) continue;
    assert.equal(/thinking of you|misses you|sent you|is waiting|loves you|wants you/i.test(line), false, line);
  }
});

test('a sad day gets a quieter world and no forced cheer', () => {
  const sad = ambienceFor('sad', true);
  assert.ok(sad.lifeScale < 1, 'fewer creatures');
  assert.ok(sad.pace < 1, 'slower');
  assert.ok(sad.brightness <= 0, 'not brightened');
  assert.equal(/!/.test(sad.line), false, 'no exclamation-mark cheer');
  // Need-some-space likewise asks nothing of you.
  const space = ambienceFor('space', true);
  assert.equal(space.shortcut, null);
  assert.ok(space.lifeScale < 1);
});

test('missing you offers a way to your letters, and nothing more', () => {
  const missing = ambienceFor('missing', true);
  assert.ok(missing.shortcut);
  assert.match(missing.shortcut.href, /^\/world\/starlight$/);
});

test('creature counts scale but never go negative or fractional', () => {
  assert.equal(scaleLife(4, 1.25), 5);
  assert.equal(scaleLife(3, 0.4), 1);
  assert.equal(scaleLife(0, 2), 0);
  assert.equal(scaleLife(5, -1), 0);
  assert.equal(isWorldMood('sad'), true);
  assert.equal(isWorldMood('furious'), false);
});

test('sound is off until asked for, and the volume is clamped', () => {
  assert.equal(DEFAULT_SOUND.enabled, false);
  assert.equal(parseSoundPreferences(null).enabled, false);
  assert.equal(parseSoundPreferences({ enabled: 'yes' }).enabled, false);
  assert.equal(parseSoundPreferences({ volume: 7 }).volume, 1);
  assert.equal(parseSoundPreferences({ volume: -2 }).volume, 0);
  assert.equal(parseSoundPreferences({ volume: NaN }).volume, DEFAULT_SOUND.volume);
});

test('every soundscape is small, finite and fits its moment', () => {
  for (const place of SOUND_PLACES) {
    for (const phase of DAY_PHASES) {
      for (const season of SEASONS) {
        for (const weather of WEATHERS) {
          const layers = soundscapeFor(place, phase, season, weather);
          assert.ok(layers.length >= 1 && layers.length <= MAX_LAYERS, `${place}/${phase}/${season}/${weather}`);
          for (const l of layers) assert.ok(l.gain > 0 && l.gain <= 1);
          assert.equal(new Set(layers.map((l) => l.id)).size, layers.length, 'no layer twice');
          if (phase === 'night') assert.equal(layers.some((l) => l.id === 'birds'), false, 'birdsong at night');
        }
      }
    }
  }
  assert.ok(soundscapeFor('home', 'afternoon', 'summer', 'rain').some((l) => l.id === 'rain'));
  assert.ok(soundscapeFor('journey', 'afternoon', 'summer', 'clear').some((l) => l.id === 'train'));
  assert.ok(soundscapeFor('river', 'afternoon', 'summer', 'clear').some((l) => l.id === 'river'));
});
