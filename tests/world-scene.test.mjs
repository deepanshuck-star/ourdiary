import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { WORLD_PLACES } from '../src/lib/world/world.ts';

const root = process.cwd();
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const SCENE = read('src', 'components', 'world', 'LivingWorld.tsx');
const CSS = read('src', 'styles', 'world.css');

test('every place in the world leads to a route that exists', () => {
  for (const place of WORLD_PLACES) {
    const page = path.join(root, 'src', 'app', place.href.slice(1), 'page.tsx');
    assert.ok(fs.existsSync(page), `${place.id} points at ${place.href}, which has no page`);
  }
});

test('nothing in the world animates unless motion is on', () => {
  const gate = ':root[data-motion="on"]';
  for (const rule of CSS.split('}')) {
    if (!/animation(-name)?\s*:/.test(rule)) continue;
    assert.ok(rule.includes(gate), `world.css animates outside the gate:\n${rule.trim().slice(0, 160)}`);
  }
});

test('keyframes are not trapped inside a style rule', () => {
  let depth = 0;
  for (let i = 0; i < CSS.length; i += 1) {
    if (CSS.startsWith('@keyframes', i)) assert.equal(depth, 0, `@keyframes nested at offset ${i}`);
    if (CSS[i] === '{') depth += 1;
    if (CSS[i] === '}') depth -= 1;
  }
});

test('the blanket reduced-motion rule leaves the world to data-motion', () => {
  // Otherwise "Always on" in Settings would be silently overruled.
  const globals = read('src', 'app', 'globals.css');
  assert.ok(globals.includes('.living-world, .living-world *'));
});

test('the scene does not roll dice or read the clock while rendering', () => {
  const src = code(SCENE);
  assert.equal(/Math\.random\s*\(/.test(src), false);
  assert.equal(/Date\.now\s*\(/.test(src), false);
  assert.equal(/new Date\s*\(\s*\)/.test(src), false);
  // Time comes from the hook that is null until mounted.
  assert.ok(src.includes('useNow('));
});

test('the world never shows the partner doing something they did not do', () => {
  const src = code(SCENE);
  // The envelope is drawn only for letters that are really waiting.
  assert.match(src, /\{waiting > 0 && \(/);
  assert.ok(src.includes('lettersWaiting(data.letters, data.activeProfileId'));
  // "Here now" only from presence, never from the picture.
  assert.match(src, /const partnerHere = presenceAvailable && partnerOnline/);
  assert.match(src, /\{partnerHere && \(/);
});

test('placement and animation never share an element', () => {
  // A CSS transform animation replaces an SVG element's own transform
  // attribute, so anything that animates must not also be positioned by one.
  const animatedClasses = ['lw-drift', 'lw-glide', 'lw-train', 'lw-sway', 'lw-breathe', 'lw-bob', 'lw-flutter', 'lw-firefly', 'lw-leaf', 'lw-rain', 'lw-snow', 'lw-fog', 'lw-ripple', 'lw-smoke', 'lw-wings', 'lw-wings-x', 'lw-shimmer', 'lw-startled'];
  const tags = SCENE.match(/<[a-z]+\b[^>]*>/g) || [];
  for (const tag of tags) {
    const cls = /className=(?:"([^"]*)"|\{[^}]*'([^']*)'[^}]*\})/.exec(tag);
    const names = cls ? (cls[1] || cls[2] || '').split(/\s+/) : [];
    if (!names.some((n) => animatedClasses.includes(n))) continue;
    assert.equal(/\stransform=/.test(tag), false, `animated element also carries a transform:\n${tag.slice(0, 140)}`);
  }
});

test('the world is wired into Today', () => {
  const dashboard = read('src', 'app', 'dashboard', 'page.tsx');
  assert.ok(dashboard.includes("import { LivingWorld } from '@/components/world/LivingWorld'"));
  assert.ok(dashboard.includes('<LivingWorld />'));
});
