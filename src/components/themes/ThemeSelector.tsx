'use client';

import React from 'react';
import { THEMES, type Theme, type ThemeId } from '@/lib/themes';

/**
 * A miniature of the environment, built from the same tokens the real scene
 * uses — sky at the top, the three landscape bands below it, the light source
 * sitting in the sky. It is a small lie about the artwork and an honest one
 * about the colour and the light, which is what someone is choosing between.
 *
 * Legacy themes have no scene, so they show the header gradient they tint.
 */
function ThemePreview({ theme }: { theme: Theme }) {
  if (!theme.sceneTokens) {
    return (
      <div
        className="h-16 rounded-xl border border-black/5"
        style={{ backgroundImage: theme.heroGradient }}
      />
    );
  }

  const s = theme.sceneTokens;
  return (
    <div
      className="relative h-16 rounded-xl overflow-hidden border border-black/5"
      style={{ backgroundImage: `linear-gradient(${s.sky} 0%, ${s.skyLow} 100%)` }}
    >
      {/* The light source: moon, low sun, lantern glow. */}
      <span
        className="absolute rounded-full"
        style={{
          width: 14,
          height: 14,
          top: 8,
          right: 16,
          background: s.glow,
          boxShadow: `0 0 12px 4px ${s.glow}66`,
        }}
      />
      {/* Three landscape bands, far to near. */}
      <span className="absolute inset-x-0" style={{ bottom: 18, height: 16, background: s.far, borderRadius: '50% 50% 0 0 / 70% 70% 0 0' }} />
      <span className="absolute inset-x-0" style={{ bottom: 8, height: 16, background: s.mid, borderRadius: '50% 40% 0 0 / 60% 80% 0 0' }} />
      <span className="absolute inset-x-0 bottom-0" style={{ height: 12, background: s.near }} />
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: Theme;
  selected: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(theme.id)}
      className={`p-3 rounded-2xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        selected
          ? 'border-primary ring-2 ring-primary/30 bg-purple-50'
          : 'border-line hover:border-purple-300 bg-surface'
      }`}
    >
      <ThemePreview theme={theme} />
      <span className="mt-2 flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-ink leading-tight">{theme.name}</span>
        {/* A tick as well as colour: the selected state must not be carried
            by hue alone. */}
        {selected && (
          <span aria-hidden="true" className="text-primary text-xs font-bold shrink-0">
            ✓
          </span>
        )}
      </span>
      <span className="mt-1 block text-[11px] leading-snug text-ink-muted">
        {theme.description}
      </span>
    </button>
  );
}

export function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  const immersive = THEMES.filter((theme) => theme.kind === 'immersive');
  const classic = THEMES.filter((theme) => theme.kind === 'legacy');

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Your world
        </label>
        <p className="text-[11px] text-ink-muted mb-3">
          An environment for the two of you, with its own light, colours and lettering.
          Each one brings its own palette, so it looks the same on both your phones.
        </p>
        <div role="radiogroup" aria-label="Immersive themes" className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {immersive.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={value === theme.id}
              onSelect={onChange}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Header tint
        </label>
        <p className="text-[11px] text-ink-muted mb-3">
          The original look — these only tint the header and leave your chosen palette alone.
        </p>
        <div role="radiogroup" aria-label="Header tints" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {classic.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={value === theme.id}
              onSelect={onChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemeSelector;
