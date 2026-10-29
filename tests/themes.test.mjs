import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  THEMES,
  THEME_IDS,
  IMMERSIVE_THEMES,
  DEFAULT_THEME_ID,
  isThemeId,
  themeById,
} from '../src/lib/themes.ts';
import { applyTo } from '../scripts/generate-theme-css.mjs';

// --- WCAG relative luminance and contrast, per the 2.x definition ----------

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  assert.ok(m, `not a 6-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

test('the contrast helper matches known values', () => {
  // Black on white is exactly 21:1, and a colour against itself is 1:1.
  assert.equal(Math.round(contrast('#000000', '#FFFFFF')), 21);
  assert.equal(Math.round(contrast('#777777', '#777777')), 1);
  // A published reference point: #767676 on white is the canonical 4.54:1.
  assert.ok(Math.abs(contrast('#767676', '#FFFFFF') - 4.54) < 0.05);
});

// --- The part that actually protects the user ------------------------------

test('every theme id is unique and the four original ids survive', () => {
  assert.equal(new Set(THEME_IDS).size, THEME_IDS.length);
  // Couples already have these stored in couples.theme. Dropping one would
  // silently restyle their diary.
  for (const id of ['candy', 'sunset', 'lavender', 'mint']) {
    assert.ok(THEME_IDS.includes(id), `legacy id ${id} disappeared`);
  }
  assert.equal(IMMERSIVE_THEMES.length, 6);
});

test('legacy themes still only tint the header', () => {
  for (const theme of THEMES.filter((t) => t.kind === 'legacy')) {
    // The whole promise of "we did not change your diary": no token
    // overrides, no fonts, no scene.
    assert.equal(theme.tokens, null, theme.id);
    assert.equal(theme.fonts, null, theme.id);
    assert.equal(theme.scene, null, theme.id);
    assert.ok(theme.heroGradient.startsWith('linear-gradient'), theme.id);
  }
});

test('body text clears WCAG AA on its own surface', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const { ink, surface } = theme.tokens;
    const ratio = contrast(ink, surface);
    assert.ok(ratio >= 4.5, `${theme.id}: ink on surface is ${ratio.toFixed(2)}:1, needs 4.5`);
  }
});

test('secondary text and accents clear AA too', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const { inkMuted, accent, surface } = theme.tokens;
    const muted = contrast(inkMuted, surface);
    assert.ok(muted >= 4.5, `${theme.id}: muted ink is ${muted.toFixed(2)}:1`);
    // Accents carry links and small labels, so they are held to the same bar
    // rather than the 3:1 large-text allowance.
    const acc = contrast(accent, surface);
    assert.ok(acc >= 4.5, `${theme.id}: accent is ${acc.toFixed(2)}:1`);
  }
});

test('button labels are readable on their buttons', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const { primary, onPrimary, primaryHover } = theme.tokens;
    const rest = contrast(onPrimary, primary);
    assert.ok(rest >= 4.5, `${theme.id}: on-primary is ${rest.toFixed(2)}:1`);
    // Hovering must not make the label harder to read than it was.
    const hover = contrast(onPrimary, primaryHover);
    assert.ok(hover >= 4.5, `${theme.id}: on-primary over hover is ${hover.toFixed(2)}:1`);
  }
});

test('text on the scenery itself is readable', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const { onScene, onSceneMuted, canvas } = theme.tokens;
    // A page heading sits on the environment, not on a card. On a night
    // theme the card ink would be dark navy on a dark sky.
    const main = contrast(onScene, canvas);
    assert.ok(main >= 4.5, `${theme.id}: scene text is ${main.toFixed(2)}:1`);
    const muted = contrast(onSceneMuted, canvas);
    assert.ok(muted >= 4.5, `${theme.id}: muted scene text is ${muted.toFixed(2)}:1`);
  }
});

test('brand colours used as text on the scenery are readable there', () => {
  for (const theme of IMMERSIVE_THEMES) {
    const { primaryOnScene, accentOnScene, canvas } = theme.tokens;
    // text-primary and text-accent are written throughout the app for
    // section labels and inline links, which sit on the canvas rather than
    // on a card. The button-fill value measured about 1.5:1 there.
    const prim = contrast(primaryOnScene, canvas);
    assert.ok(prim >= 4.5, `${theme.id}: primary on scene is ${prim.toFixed(2)}:1`);
    const acc = contrast(accentOnScene, canvas);
    assert.ok(acc >= 4.5, `${theme.id}: accent on scene is ${acc.toFixed(2)}:1`);
  }
});

test('the card override is emitted for every immersive theme', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
  for (const theme of IMMERSIVE_THEMES) {
    // Without this rule, flipping ink light for the scene would make every
    // card unreadable instead.
    assert.ok(
      css.includes(`[data-theme="${theme.id}"] :is(.bg-surface, .bg-white, .bg-snow, .bg-hero-soft`),
      `${theme.id} has no card ink override`
    );
    // Tailwind writes bg-surface/90 as a class named `bg-surface/90`, which
    // .bg-surface does not match. Those elements were light ink on a
    // near-white pill.
    for (const variant of ['bg-surface/', 'bg-white/', 'bg-snow/']) {
      assert.ok(
        css.includes(`[class^="${variant}"]`) && css.includes(`[class*=" ${variant}"]`),
        `${theme.id} misses the ${variant}* opacity variants`
      );
      // The bare substring form also matches hover:bg-surface/70, which is a
      // dark sidebar link, not a light card.
      assert.equal(
        css.includes(`[class*="${variant}"]`),
        false,
        `${theme.id} matches ${variant} with a prefix like hover:`
      );
    }
    // bg-canvas is the PAGE colour — the dark sky on most of these themes.
    // It once sat in that list, which put dark navy text on the dark navy
    // sidebar at roughly 1:1. Measured in a browser, invisible in review.
    assert.equal(
      /:is\([^)]*\.bg-canvas/.test(css),
      false,
      `${theme.id} treats the page canvas as a card again`
    );
  }
});

test('every immersive theme is fully specified', () => {
  const tokenKeys = [
    'canvas', 'surface', 'ink', 'inkMuted', 'primary',
    'primaryHover', 'onPrimary', 'secondary', 'accent', 'line',
    'onScene', 'onSceneMuted', 'primaryOnScene', 'accentOnScene',
  ];
  const sceneKeys = ['sky', 'skyLow', 'far', 'mid', 'near', 'glow', 'particle'];
  const trackKeys = ['rail', 'tie', 'stationFill', 'stationStroke', 'stationActive'];

  for (const theme of IMMERSIVE_THEMES) {
    assert.ok(theme.name && theme.description, theme.id);
    assert.ok(theme.scene, `${theme.id} has no scene component key`);
    assert.ok(['day', 'night'].includes(theme.mood), theme.id);
    for (const key of tokenKeys) {
      assert.match(theme.tokens[key], /^#[0-9A-Fa-f]{6}$/, `${theme.id}.tokens.${key}`);
    }
    for (const key of sceneKeys) {
      assert.match(theme.sceneTokens[key], /^#[0-9A-Fa-f]{6}$/, `${theme.id}.scene.${key}`);
    }
    for (const key of trackKeys) {
      assert.match(theme.track[key], /^#[0-9A-Fa-f]{6}$/, `${theme.id}.track.${key}`);
    }
    assert.ok(theme.fonts.display.includes('var(--font-'), theme.id);
    assert.ok(theme.fonts.body.includes('var(--font-'), theme.id);
  }
});

test('an unknown theme falls back instead of rendering unstyled', () => {
  // A hand-edited database row, or a couple who picked a theme in a newer
  // build, must not produce a blank page.
  assert.equal(themeById('not-a-theme').id, DEFAULT_THEME_ID);
  assert.equal(themeById(undefined).id, DEFAULT_THEME_ID);
  assert.equal(themeById(null).id, DEFAULT_THEME_ID);
  assert.equal(themeById(42).id, DEFAULT_THEME_ID);
  assert.equal(themeById('moonlit').id, 'moonlit');

  assert.equal(isThemeId('moonlit'), true);
  assert.equal(isThemeId('candy'), true);
  assert.equal(isThemeId('nope'), false);
  assert.equal(isThemeId(null), false);
});

test('the generated CSS block in globals.css is up to date', () => {
  // Guards the one failure mode that is invisible in review: a token edited
  // in themes.ts and never regenerated into the stylesheet.
  const file = path.join(process.cwd(), 'src', 'app', 'globals.css');
  const css = fs.readFileSync(file, 'utf8');
  assert.equal(
    css,
    applyTo(css),
    'globals.css is stale — run: node scripts/generate-theme-css.mjs'
  );
});

test('the generated CSS wins over appearance and palette', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
  for (const theme of IMMERSIVE_THEMES) {
    // Both selectors: :root[...] to tie specificity with the appearance
    // rules, the bare attribute for AppShell's wrapper div.
    assert.ok(css.includes(`:root[data-theme="${theme.id}"]`), theme.id);
    assert.ok(css.includes(`\n[data-theme="${theme.id}"] {`), theme.id);
  }
  // Source order is the tiebreak, so the block must come last.
  const generated = css.indexOf('GENERATED: immersive theme tokens');
  assert.ok(generated > css.lastIndexOf(':root[data-appearance="dark"]'));
  assert.ok(generated > css.lastIndexOf(':root[data-palette="peach"]'));
});
