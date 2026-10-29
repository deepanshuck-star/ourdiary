// Writes the immersive themes' CSS tokens into src/app/globals.css, between
// two markers, from the single source of truth in src/lib/themes.ts.
//
// Run it after editing a theme:   node scripts/generate-theme-css.mjs
// tests/themes.test.mjs fails if the block is stale, so the two cannot drift.
//
// The block goes at the END of globals.css on purpose. Appearance and palette
// are matched as :root[data-appearance="dark"] — specificity (0,2,0) — so a
// plain [data-theme="…"] rule would lose to them on the <html> element. The
// generated rule lists :root[data-theme="…"] to tie on specificity and then
// wins on source order, and lists the bare attribute as well so it also
// applies when AppShell carries it on a wrapper div.
//
// An immersive theme deliberately overrides BOTH palette and appearance: it
// brings its own colours, fonts and light. That is what makes six themes a
// six-screen design problem instead of a twenty-four-screen one, and it is
// why Lantern Festival Night cannot come out peach.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMMERSIVE_THEMES } from '../src/lib/themes.ts';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CSS = path.join(root, 'src', 'app', 'globals.css');

const START = '/* === GENERATED: immersive theme tokens — scripts/generate-theme-css.mjs === */';
const END = '/* === END GENERATED === */';

/**
 * The colour ramp the app's dark appearance already uses.
 *
 * Roughly 420 of the app's text colours are written as text-slate-600 and
 * friends rather than as theme tokens. @theme static folds those ramps onto
 * the brand palette, which is tuned for a light page — so on a dark canvas
 * they come out dark on dark. The dark appearance solves this by restating
 * the whole ramp, and a theme with a dark canvas needs exactly the same
 * foundation.
 *
 * Lifted from that block at generate time rather than copied into this file,
 * so retuning dark mode and regenerating keeps the themes in step instead of
 * leaving a second set of values to forget about.
 */
function darkRamp(css) {
  const start = css.indexOf(':root[data-appearance="dark"],');
  if (start === -1) throw new Error('globals.css has no dark appearance block to read.');
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const body = css.slice(open + 1, close);
  const out = new Map();
  for (const m of body.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/**
 * The light ramp, as @theme static declares it.
 *
 * A dark-canvas theme restates the dark ramp at its root so the fixed
 * text-slate-* classes work against the scenery. But cards on these themes
 * stay light, and inside one of those the dark ramp is the wrong way round:
 * a text-slate-600 paragraph came out pale on cream at 1.53:1. So the card
 * override puts the light ramp back, and a card behaves exactly as it does
 * in the app's ordinary light appearance.
 */
function lightRamp(css) {
  const start = css.indexOf('@theme static');
  if (start === -1) throw new Error('globals.css has no @theme static block to read.');
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  const body = css.slice(open + 1, close);
  const out = new Map();
  for (const m of body.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

/** Relative luminance, to decide whether a canvas reads as dark. */
function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  return l < 0.2;
}

/**
 * Everything that counts as a light card.
 *
 * The opacity variants matter: Tailwind writes bg-surface/90 as a class
 * literally named `bg-surface/90`, which .bg-surface does not match. Twenty
 * or so elements use those, including the dashboard's "Our journey" button,
 * and each one was light ink on a near-white pill — invisible rather than
 * merely low contrast.
 *
 * bg-hero-soft is 62% surface over the hero gradient, so it also reads as a
 * light card on every theme.
 */
const CARD_SURFACES = [
  '.bg-surface',
  '.bg-white',
  '.bg-snow',
  '.bg-hero-soft',
  // Each variant is matched only where it is unprefixed: either at the start
  // of the class attribute, or preceded by a space. A plain substring match
  // also catches `hover:bg-surface/70`, which is not a light card — it is a
  // sidebar link on a dark canvas that happens to light up under the cursor.
  // Treating those as cards put dark ink on the dark sidebar again.
  '[class^="bg-surface/"]',
  '[class*=" bg-surface/"]',
  '[class^="bg-white/"]',
  '[class*=" bg-white/"]',
  '[class^="bg-snow/"]',
  '[class*=" bg-snow/"]',
].join(', ');

// Tokens the theme states for itself; the ramp must not fight them.
const OWN = new Set([
  '--color-canvas', '--color-surface', '--color-ink', '--color-ink-muted',
  '--color-primary', '--color-primary-hover', '--color-on-primary',
  '--color-secondary', '--color-accent', '--color-line', '--color-focus',
]);

function rule(theme, ramp, light) {
  const t = theme.tokens;
  const s = theme.sceneTokens;
  const k = theme.track;
  const dark = isDark(theme.tokens.canvas);
  const inherited = dark
    ? [...ramp.entries()]
        .filter(([name]) => !OWN.has(name))
        .map(([name, value]) => `  ${name}: ${value};`)
        .join('\n')
    : '';

  return `
/* ${theme.name} — ${theme.description} */
:root[data-theme="${theme.id}"],
[data-theme="${theme.id}"] {
  --hero-gradient: ${theme.heroGradient};
${dark ? `
  /* The app's dark ramp, so the ~420 fixed text-slate-* classes stay
     readable on this theme's dark canvas. Lifted from the dark appearance
     block by the generator. */
${inherited}
` : ''}
  --color-canvas: ${t.canvas};
  /* Cards let the environment through. The knob is --ourdiary-card-opacity,
     set once near the top of globals.css and read here, so changing it
     retunes every immersive theme at once and survives regeneration. */
  --color-surface: color-mix(in srgb, ${t.surface} var(--ourdiary-card-opacity, 88%), transparent);
  --color-ink: ${t.onScene};
  --color-ink-muted: ${t.onSceneMuted};
  --color-primary: ${dark ? t.primaryOnScene : t.primary};
  --color-primary-hover: ${dark ? t.primaryOnScene : t.primaryHover};
  --color-on-primary: ${dark ? t.canvas : t.onPrimary};
  --color-secondary: ${t.secondary};
  --color-accent: ${dark ? t.accentOnScene : t.accent};
  --color-line: ${t.line};
  --color-focus: ${dark ? t.primaryOnScene : t.primary};

  --font-display-face: ${theme.fonts.display};
  --font-body: ${theme.fonts.body};

  --scene-sky: ${s.sky};
  --scene-sky-low: ${s.skyLow};
  --scene-far: ${s.far};
  --scene-mid: ${s.mid};
  --scene-near: ${s.near};
  --scene-glow: ${s.glow};
  --scene-particle: ${s.particle};

  --track-rail: ${k.rail};
  --track-tie: ${k.tie};
  --station-fill: ${k.stationFill};
  --station-stroke: ${k.stationStroke};
  --station-active: ${k.stationActive};

  color-scheme: ${theme.mood === 'night' ? 'dark' : 'light'};
}

/* Inside anything with a CARD background, ink goes back to the value tuned
   for that card. Declaring it on the element rather than on each piece of
   text means every heading, label and paragraph below it inherits the right
   colour without the page knowing a theme exists.

   .bg-canvas is deliberately NOT in this list. Canvas is the page colour —
   the dark sky on five of the six themes — so an element painted with it
   needs the light scene ink, not the dark card ink. Including it put dark
   navy text on a dark navy sidebar, which measured about 1:1. */
:root[data-theme="${theme.id}"] :is(${CARD_SURFACES}),
[data-theme="${theme.id}"] :is(${CARD_SURFACES}) {
${dark ? `  /* The light ramp restored: this card is light, whatever the sky is doing. */
${[...light.entries()].filter(([n]) => !OWN.has(n)).map(([n, v]) => `  ${n}: ${v};`).join('\n')}

` : ''}  --color-ink: ${t.ink};
  --color-ink-muted: ${t.inkMuted};
  --color-primary: ${t.primary};
  --color-primary-hover: ${t.primaryHover};
  --color-on-primary: ${t.onPrimary};
  --color-accent: ${t.accent};
  --color-focus: ${t.primary};
}`;
}

export function buildBlock(css) {
  const ramp = darkRamp(css);
  const light = lightRamp(css);
  return [START, ...IMMERSIVE_THEMES.map((theme) => rule(theme, ramp, light)), '', END].join('\n');
}

export function applyTo(css) {
  const block = buildBlock(css);
  const from = css.indexOf(START);
  if (from === -1) return `${css.replace(/\s*$/, '')}\n\n${block}\n`;
  const to = css.indexOf(END, from);
  if (to === -1) throw new Error('globals.css has a start marker with no end marker.');
  return css.slice(0, from) + block + css.slice(to + END.length);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const before = fs.readFileSync(CSS, 'utf8');
  const after = applyTo(before);
  if (before === after) {
    console.log('globals.css already up to date.');
  } else {
    fs.writeFileSync(CSS, after);
    console.log(`Wrote ${IMMERSIVE_THEMES.length} theme blocks into src/app/globals.css.`);
  }
}
