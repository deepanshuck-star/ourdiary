import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

function keyframe(css, name) {
  const at = css.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
  assert.ok(at !== -1, `missing @keyframes ${name}`);
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}' && --depth === 0) return css.slice(at, i + 1);
  }
  throw new Error('unbalanced');
}

const SHEETS = {
  world: read('src', 'styles', 'world.css'),
  blossom: read('src', 'styles', 'themes', 'blossom.css'),
  forest: read('src', 'styles', 'themes', 'forest.css'),
  lantern: read('src', 'styles', 'themes', 'lantern.css'),
  moonlit: read('src', 'styles', 'themes', 'moonlit.css'),
  ocean: read('src', 'styles', 'themes', 'ocean.css'),
  rooftop: read('src', 'styles', 'themes', 'rooftop.css'),
};
const STRENGTH = 'var(--ourdiary-motion-strength, 1)';

test('both knobs live at the top of globals.css, outside anything generated', () => {
  const css = read('src', 'app', 'globals.css');
  const speed = /--ourdiary-motion-speed:\s*([\d.]+);/.exec(css);
  const strength = /--ourdiary-motion-strength:\s*([\d.]+);/.exec(css);
  assert.ok(speed && strength);
  assert.ok(Number(speed[1]) > 1, 'livelier than the original pace');
  assert.ok(Number(strength[1]) > 1, 'more noticeable than the original sway');
  assert.ok(css.indexOf('--ourdiary-motion-speed') < css.indexOf('GENERATED: immersive theme tokens'));
});

test('swaying, bobbing and wandering follow the strength knob', () => {
  for (const [sheet, name] of [
    ['world', 'lw-sway'], ['world', 'lw-bob'], ['world', 'lw-firefly'], ['world', 'lw-breathe'],
    ['blossom', 'blossom-sway-wide'], ['forest', 'fr-sway'], ['lantern', 'lantern-sway'],
    ['moonlit', 'od-moonlit-sway'], ['moonlit', 'od-moonlit-wander-a'], ['ocean', 'ocean-sway'], ['rooftop', 'rooftop-sway'],
  ]) {
    assert.ok(keyframe(SHEETS[sheet], name).includes(STRENGTH), `${sheet}/${name} ignores the strength knob`);
  }
});

test('things that travel keep the distance they were designed with', () => {
  // A lantern's rise is short so it fades before crossing the middle of the
  // diary; cloud loops wrap seamlessly only at their authored distance.
  // Stretching these would break both, so only their pace may change.
  for (const [sheet, name] of [
    ['lantern', 'lantern-rise'], ['lantern', 'lantern-drift'], ['blossom', 'blossom-fall'],
    ['ocean', 'ocean-boat-cross'], ['ocean', 'ocean-cloud-drift'], ['moonlit', 'od-moonlit-drift'],
    ['rooftop', 'rooftop-drift'], ['world', 'lw-drift'], ['world', 'lw-rain'], ['world', 'lw-snow'],
    ['world', 'lw-boat'], ['world', 'lw-shooting'], ['world', 'lw-leaf'], ['world', 'lw-ripple'],
  ]) {
    assert.equal(keyframe(SHEETS[sheet], name).includes('motion-strength'), false, `${sheet}/${name} would travel further than designed`);
  }
});

test('nothing is scaled twice', () => {
  for (const [sheet, css] of Object.entries(SHEETS)) {
    assert.equal(css.includes(`${STRENGTH})) * ${STRENGTH}`), false, sheet);
    assert.equal(css.includes(`* ${STRENGTH}) * ${STRENGTH}`), false, sheet);
  }
});

test('the speed knob reaches both kinds of scenery, including scenes that load late', () => {
  const motion = read('src', 'lib', 'motion.ts');
  assert.ok(motion.includes("getPropertyValue('--ourdiary-motion-speed')"));
  assert.match(motion, /Math\.min\(4, Math\.max\(0\.25, value\)\)/, 'clamped so a typo cannot freeze or strobe');
  const kit = read('src', 'components', 'world', 'kit.tsx');
  assert.ok(kit.includes('applyPlaybackRate(el, pace * motionSpeed())'));
  const scene = read('src', 'components', 'themes', 'ThemeScene.tsx');
  assert.ok(scene.includes('new MutationObserver(apply)'));
  assert.ok(scene.includes("attributeFilter: ['data-motion']"));
});

test('glows breathe deeper with the strength knob, without dimming their peak', () => {
  for (const [sheet, name] of [['rooftop', 'rooftop-breathe'], ['rooftop', 'rooftop-lamp-pulse'], ['forest', 'fr-halo'], ['forest', 'fr-ember'], ['lantern', 'lantern-flicker'], ['world', 'lw-twinkle'], ['world', 'lw-glow']]) {
    const kf = keyframe(SHEETS[sheet], name);
    assert.ok(kf.includes(`* ${STRENGTH})`), `${sheet}/${name} glow ignores the knob`);
  }
  // The peak of a breathing light is a literal, so a stronger setting
  // deepens the dim moment rather than lowering the bright one.
  assert.match(keyframe(SHEETS.rooftop, 'rooftop-breathe'), /opacity: 1\b/);
});
