'use client';

import { useSyncExternalStore } from 'react';

// Shared browser-capability hooks for the 3D features (globe, photo ring, train).
// All return a safe "no 3D" answer during SSR.

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );
}

let webglSupport: boolean | null = null;

export function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement('canvas');
    webglSupport = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

const noopSubscribe = () => () => {};

/** null while unknown (SSR / first paint), then true/false. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => null);
}

// --- Theme colours read from the CSS design tokens, kept live across light/dark switches ---

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  canvas: string;
  surface: string;
  ink: string;
  inkMuted: string;
  line: string;
  dark: boolean;
};

const LIGHT_FALLBACK: ThemeColors = {
  primary: '#BE185D',
  secondary: '#F9A8D4',
  accent: '#E11D48',
  canvas: '#FFF7FA',
  surface: '#FFFFFF',
  ink: '#2A1520',
  inkMuted: '#6B4A5A',
  line: '#F3D3E0',
  dark: false,
};

let themeCache: { key: string; value: ThemeColors } | null = null;

function readThemeColors(): ThemeColors {
  const root = document.documentElement;
  const css = getComputedStyle(root);
  const get = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
  const appearance = root.dataset.appearance;
  // An immersive theme declares its own color-scheme, and most of them are
  // night scenes. Without this, picking Moonlit Garden while the device is in
  // light mode left the 3D journey lighting the model for daylight against a
  // midnight sky.
  const themeScheme = css.getPropertyValue('color-scheme').trim();
  const dark =
    themeScheme === 'dark' ||
    (themeScheme !== 'light' &&
      (appearance === 'dark' ||
        (appearance === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)));
  const value: ThemeColors = {
    primary: get('--color-primary', LIGHT_FALLBACK.primary),
    secondary: get('--color-secondary', LIGHT_FALLBACK.secondary),
    accent: get('--color-accent', LIGHT_FALLBACK.accent),
    canvas: get('--color-canvas', LIGHT_FALLBACK.canvas),
    surface: get('--color-surface', LIGHT_FALLBACK.surface),
    ink: get('--color-ink', LIGHT_FALLBACK.ink),
    inkMuted: get('--color-ink-muted', LIGHT_FALLBACK.inkMuted),
    line: get('--color-line', LIGHT_FALLBACK.line),
    dark,
  };
  // useSyncExternalStore needs a stable reference while nothing changed.
  const key = JSON.stringify(value);
  if (!themeCache || themeCache.key !== key) themeCache = { key, value };
  return themeCache.value;
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-appearance', 'data-palette', 'data-theme', 'class', 'style'],
  });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    mq.removeEventListener('change', onChange);
  };
}

export function useThemeColors(): ThemeColors {
  return useSyncExternalStore(subscribeTheme, readThemeColors, () => LIGHT_FALLBACK);
}
