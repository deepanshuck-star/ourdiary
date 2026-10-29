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
  // The global reduced-motion rule in globals.css neutralises durations, but
  // the elements would still be told to animate and the compositor would
  // still wake for them. Gating at the source means a viewer who asked for
  // less motion gets a still picture, not a fast one.
  for (const theme of IMMERSIVE_THEMES) {
    const css = read(STYLES(theme.id));
    const guard = '@media (prefers-reduced-motion: no-preference)';
    const guarded = css.slice(css.indexOf(guard));
    const before = css.slice(0, css.indexOf(guard));
    assert.ok(css.includes(guard), `${theme.id}.css has no reduced-motion guard`);
    // `animation:` and `animation-name:` outside the guard are the problem;
    // `animation-delay` on a static element is harmless but pointless, so
    // catch the shorthand and the name specifically.
    const stray = before.match(/animation(-name)?\s*:/g) || [];
    assert.deepEqual(stray, [], `${theme.id}.css animates outside the guard`);
    assert.ok(guarded.length > 0);
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
