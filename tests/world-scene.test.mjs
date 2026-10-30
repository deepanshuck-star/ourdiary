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
  // Time comes from the hook that is null until mounted. Since the places
  // were added it lives in the shared kit, and every scene goes through it.
  assert.ok(read('src', 'components', 'world', 'kit.tsx').includes('useNow('));
  assert.ok(src.includes("useWorldState('home')"));
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

function worldFiles(dir = path.join(root, 'src', 'components', 'world')) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? worldFiles(path.join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(dir, entry.name)] : []
  );
}

test('placement and animation never share an element, in any place', () => {
  // A CSS transform animation replaces an SVG element's own transform
  // attribute, so anything that animates must not also be positioned by one.
  const animatedClasses = [
    'lw-drift', 'lw-glide', 'lw-train', 'lw-sway', 'lw-breathe', 'lw-bob', 'lw-flutter', 'lw-firefly',
    'lw-leaf', 'lw-rain', 'lw-snow', 'lw-fog', 'lw-ripple', 'lw-smoke', 'lw-wings', 'lw-wings-x',
    'lw-shimmer', 'lw-startled', 'lw-hang', 'lw-boat', 'lw-rock', 'lw-graze', 'lw-jump', 'lw-shooting',
    'lw-sunbeam', 'lw-chug', 'lw-ride', 'lw-twinkle', 'lw-flutter-flag', 'lw-glow',
  ];
  const files = worldFiles();
  assert.ok(files.length >= 8, 'expected the world components');
  for (const file of files) {
    const tags = fs.readFileSync(file, 'utf8').match(/<[a-z]+\b[^>]*>/g) || [];
    for (const tag of tags) {
      const cls = /className=(?:"([^"]*)"|\{[^}]*'([^']*)'[^}]*\})/.exec(tag);
      const names = cls ? (cls[1] || cls[2] || '').split(/\s+/) : [];
      if (!names.some((n) => animatedClasses.includes(n))) continue;
      assert.equal(/\stransform=/.test(tag), false, `${path.basename(file)}: animated element also carries a transform:\n${tag.slice(0, 140)}`);
    }
  }
});

test('no world component rolls dice or reads the clock while rendering', () => {
  for (const file of worldFiles()) {
    const src = code(fs.readFileSync(file, 'utf8'));
    assert.equal(/Math\.random\s*\(/.test(src), false, path.basename(file));
    assert.equal(/Date\.now\s*\(/.test(src), false, path.basename(file));
    assert.equal(/new Date\s*\(\s*\)/.test(src), false, path.basename(file));
  }
});

test('every place has a route, and the river credits the real author', () => {
  for (const slug of ['forest', 'river', 'mountains', 'starlight']) {
    assert.ok(fs.existsSync(path.join(root, 'src', 'app', 'world', slug, 'page.tsx')), slug);
  }
  assert.ok(fs.existsSync(path.join(root, 'src', 'app', 'world', 'page.tsx')));
  assert.ok(fs.existsSync(path.join(root, 'src', 'app', 'us', 'page.tsx')));
  const river = read('src', 'components', 'world', 'places', 'LoveRiver.tsx');
  assert.ok(river.includes("b.from === 'me' ? 'You' : partnerProfile.name"));
  // The river reads messages; it never writes one on anyone's behalf.
  assert.equal(/sendMessageRemote|insert\(/.test(river), false);
});

test('only your own figure can be edited', () => {
  const editor = read('src', 'components', 'world', 'AvatarEditor.tsx');
  assert.ok(editor.includes('updateOwnAvatar(avatars, mySlot, changes)'));
  const us = read('src', 'components', 'world', 'UsPage.tsx');
  assert.ok(us.includes('<AvatarEditor mySlot={mySlot}'));
  assert.equal((us.match(/<AvatarEditor/g) || []).length, 1, "the partner's figure is shown, not edited");
});

test('the bottom bar is Today, Us, Memories, Play, and nothing went missing', () => {
  const nav = read('src', 'components', 'layout', 'MobileNav.tsx');
  const main = nav.slice(nav.indexOf('const mainMobileItems'), nav.indexOf('];', nav.indexOf('const mainMobileItems')));
  assert.deepEqual([...main.matchAll(/name: '([^']+)'/g)].map((m) => m[1]), ['Today', 'Us', 'Memories', 'Play']);
  // What used to be on the bar is still one tap into More.
  assert.ok(nav.includes("href: '/journey'"));
  assert.ok(nav.includes("href: '/calendar'"));
});

test('the world is wired into Today', () => {
  const dashboard = read('src', 'app', 'dashboard', 'page.tsx');
  assert.ok(dashboard.includes("import { LivingWorld } from '@/components/world/LivingWorld'"));
  assert.ok(dashboard.includes('<LivingWorld />'));
});

test('important things stay inside the band every screen shape keeps', () => {
  // A 16:7 card shows roughly y 61-499 of the 560-tall scene. The trail's
  // lowest steps — the dreams already reached — once sat at y 520 and were
  // simply missing on a wide screen.
  const mountains = read('src', 'components', 'world', 'places', 'DreamMountains.tsx');
  const trail = mountains.slice(mountains.indexOf('const TRAIL'), mountains.indexOf('];', mountains.indexOf('const TRAIL')));
  const ys = [...trail.matchAll(/\[(\d+), (\d+)\]/g)].map((m) => Number(m[2]));
  assert.equal(ys.length, 12);
  for (const y of ys) assert.ok(y >= 70 && y <= 495, `trail step at y ${y} is cropped on some screens`);
  for (const file of [['places', 'LoveRiver.tsx'], ['places', 'DreamMountains.tsx'], ['places', 'MemoryForest.tsx'], ['places', 'StarlightHill.tsx']]) {
    const src = read('src', 'components', 'world', ...file);
    for (const m of src.matchAll(/<Figure[^>]*\sy=\{(\d+)\}[^>]*\/>/g)) {
      // A seated figure's legs end at y+16, a standing one's at y+22.
      const reach = /\bstanding\b/.test(m[0]) ? 22 : 16;
      assert.ok(Number(m[1]) + reach <= 499, `${file[1]}: a figure at y ${m[1]} loses its legs to the crop`);
    }
  }
});
