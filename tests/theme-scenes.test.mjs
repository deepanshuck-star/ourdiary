import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { IMMERSIVE_THEMES } from '../src/lib/themes.ts';

const COMPONENT = (id) =>
  path.join(process.cwd(), 'src', 'components', 'themes', `${id[0].toUpperCase()}${id.slice(1)}Scene.tsx`);
const STYLES = (id) => path.join(process.cwd(), 'src', 'styles', 'themes', `${id}.css`);

const read = (file) => fs.readFileSync(file, 'utf8');

/**
 * Source with comments removed.
 *
 * The checks below look for things the code must not DO. Grepping raw text
 * also hits the comments that explain why those things are banned, which
 * pushed one scene into rewording an accurate comment to satisfy a test —
 * exactly backwards.
 */
function code(file) {
  return read(file)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

test('every immersive theme has a scene component and a stylesheet', () => {
  for (const theme of IMMERSIVE_THEMES) {
    assert.ok(fs.existsSync(COMPONENT(theme.id)), `missing component for ${theme.id}`);
    assert.ok(fs.existsSync(STYLES(theme.id)), `missing stylesheet for ${theme.id}`);
  }
});

test('no scene animates unless the viewer allows motion', () => {
  // Motion is gated on an attribute rather than a media query. A media query
  // is resolved by the browser and nothing on the page can re-open it, so a
  // viewer whose OS asks for less motion could never choose to see the
  // scenery move. lib/motion.ts resolves the OS preference together with
  // their own choice and writes the answer to data-motion, so "reduce" still
  // wins by default.
  for (const theme of IMMERSIVE_THEMES) {
    const css = read(STYLES(theme.id));
    const gate = ':root[data-motion="on"]';
    assert.ok(css.includes(gate), `${theme.id}.css has no motion gate`);

    // Every rule that sets an animation must sit behind the gate. Split on
    // rule boundaries and check each one that animates.
    for (const rule of css.split('}')) {
      if (!/animation(-name)?\s*:/.test(rule)) continue;
      if (/@keyframes/.test(rule)) continue; // a keyframe step, not a rule
      assert.ok(
        rule.includes(gate),
        `${theme.id}.css animates outside the gate:\n${rule.trim().slice(0, 160)}`
      );
    }
  }
});

test('keyframes are not trapped inside a style rule', () => {
  // @keyframes is only legal at the top level or inside @media. Nesting it
  // under the gate selector would silently drop every animation.
  for (const theme of IMMERSIVE_THEMES) {
    const css = read(STYLES(theme.id));
    const at = css.indexOf('@keyframes');
    if (at === -1) continue;
    const before = css.slice(0, at);
    const depth = (before.match(/\{/g) || []).length - (before.match(/\}/g) || []).length;
    assert.equal(depth, 0, `${theme.id}.css nests @keyframes ${depth} level(s) deep`);
  }
});

test('no scene rolls dice while React is rendering', () => {
  // react-hooks/purity fails the build on these, and a scene that reshuffles
  // itself on every render would also flicker. Positions must be literals.
  for (const theme of IMMERSIVE_THEMES) {
    const src = code(COMPONENT(theme.id));
    assert.equal(/Math\.random\s*\(/.test(src), false, `${theme.id} uses Math.random`);
    assert.equal(/Date\.now\s*\(/.test(src), false, `${theme.id} uses Date.now`);
    assert.equal(/new Date\s*\(\s*\)/.test(src), false, `${theme.id} reads the clock`);
  }
});

test('scenes are inert decoration, not something you can click', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const src = read(COMPONENT(theme.id));
    assert.ok(src.startsWith("'use client';"), `${theme.id} is not a client component`);
    assert.ok(src.includes('aria-hidden="true"'), `${theme.id} is not hidden from screen readers`);
    assert.ok(src.includes('ourdiary-scene'), `${theme.id} does not use the shared scene class`);
    const css = read(STYLES(theme.id));
    assert.ok(/pointer-events\s*:\s*none/.test(css), `${theme.id} can swallow clicks`);
  }
});

test('scenes paint with theme variables, not baked-in colours', () => {
  // A hardcoded hex here would survive a theme switch and look wrong in five
  // of the six environments.
  for (const theme of IMMERSIVE_THEMES) {
    const src = code(COMPONENT(theme.id));
    const css = read(STYLES(theme.id));
    const hexes = [...src.match(/#[0-9A-Fa-f]{6}\b/g) || [], ...css.match(/#[0-9A-Fa-f]{6}\b/g) || []];
    assert.deepEqual(hexes, [], `${theme.id} hardcodes ${hexes.join(', ')}`);
    // Either place is fine: inline on the element, or on a class in the
    // scene's own stylesheet. What matters is that the colour comes from
    // the active theme and not from a literal.
    assert.ok(
      src.includes('var(--scene-') || css.includes('var(--scene-'),
      `${theme.id} never reads a scene token`
    );
  }
});

test('no scene carries so much DOM that it costs more than it gives', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const src = read(COMPONENT(theme.id));
    const elements = (src.match(/<[a-zA-Z]/g) || []).length;
    assert.ok(elements < 200, `${theme.id} renders roughly ${elements} elements`);
  }
});
