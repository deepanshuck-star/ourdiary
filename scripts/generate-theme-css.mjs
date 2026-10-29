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

function rule(theme) {
  const t = theme.tokens;
  const s = theme.sceneTokens;
  const k = theme.track;
  return `
/* ${theme.name} — ${theme.description} */
:root[data-theme="${theme.id}"],
[data-theme="${theme.id}"] {
  --hero-gradient: ${theme.heroGradient};

  --color-canvas: ${t.canvas};
  --color-surface: ${t.surface};
  --color-ink: ${t.onScene};
  --color-ink-muted: ${t.onSceneMuted};
  --color-primary: ${t.primary};
  --color-primary-hover: ${t.primaryHover};
  --color-on-primary: ${t.onPrimary};
  --color-secondary: ${t.secondary};
  --color-accent: ${t.accent};
  --color-line: ${t.line};
  --color-focus: ${t.primary};

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

/* Inside anything with a card background, ink goes back to the value tuned
   for that card. Declaring it on the element rather than on each piece of
   text means every heading, label and paragraph below it inherits the right
   colour without the page knowing a theme exists. */
:root[data-theme="${theme.id}"] :is(.bg-surface, .bg-white, .bg-snow, .bg-canvas),
[data-theme="${theme.id}"] :is(.bg-surface, .bg-white, .bg-snow, .bg-canvas) {
  --color-ink: ${t.ink};
  --color-ink-muted: ${t.inkMuted};
}`;
}

export function buildBlock() {
  return [START, ...IMMERSIVE_THEMES.map(rule), '', END].join('\n');
}

export function applyTo(css) {
  const block = buildBlock();
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
