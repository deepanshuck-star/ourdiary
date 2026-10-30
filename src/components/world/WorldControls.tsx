'use client';

import React from 'react';
import { CloudSun, Volume2, VolumeX } from 'lucide-react';
import { DAY_PHASES, SEASONS, WEATHERS, type DayPhase, type Season, type Weather } from '@/lib/world/world';
import { MOOD_LABEL, WORLD_MOODS, type WorldMood } from '@/lib/world/mood';
import { useSoundPreferences, useWorldPreferences } from './kit';

const LABEL: Record<string, string> = {
  auto: 'Auto',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
  clear: 'Clear',
  cloudy: 'Cloudy',
  rain: 'Rain',
  fog: 'Fog',
  snow: 'Snow',
  windy: 'Windy',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
  ...MOOD_LABEL,
};

const INK = '#2A2420';
const PAPER = '#FDFBF7';
const SOFT = '#5A4D44';
const EDGE = '#DCCFBC';

function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint?: string;
  options: readonly T[];
  value: T;
  onPick: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>
        {label}
      </p>
      {hint && (
        <p className="text-[11px] mt-0.5" style={{ color: '#7A6D63' }}>
          {hint}
        </p>
      )}
      <div role="radiogroup" aria-label={label} className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(option)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2"
              style={selected ? { background: INK, color: PAPER, borderColor: INK } : { background: PAPER, color: INK, borderColor: EDGE }}
            >
              {LABEL[option] ?? option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The world's settings, all per device: time, weather, season, your mood,
 * and sound. Nothing here is sent to your partner.
 */
export function WorldControls() {
  const [prefs, setPrefs] = useWorldPreferences();
  const [sound, setSound] = useSoundPreferences();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        aria-pressed={sound.enabled}
        aria-label={sound.enabled ? 'Turn world sound off' : 'Turn world sound on'}
        // Turning sound on is this click — the gesture browsers require, and
        // the only way sound ever starts.
        onClick={() => setSound({ ...sound, enabled: !sound.enabled })}
        className="inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm border focus:outline-none focus-visible:ring-2"
        style={{ background: PAPER, color: INK, borderColor: EDGE }}
      >
        {sound.enabled ? <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> : <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm border focus:outline-none focus-visible:ring-2"
        style={{ background: PAPER, color: INK, borderColor: EDGE }}
      >
        <CloudSun className="w-3.5 h-3.5" aria-hidden="true" />
        Sky
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close sky settings" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div
            id={panelId}
            // Solid on purpose: choices floating over a see-through world
            // would let the scene show through them.
            className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[88vw] max-h-[70vh] overflow-y-auto rounded-2xl border shadow-card p-4 space-y-4"
            style={{ background: PAPER, borderColor: EDGE }}
          >
            <Choice<'auto' | DayPhase>
              label="Time of day"
              hint="Auto follows this device's clock."
              options={['auto', ...DAY_PHASES]}
              value={prefs.phase}
              onPick={(phase) => setPrefs({ ...prefs, phase })}
            />
            <Choice<Weather> label="Weather" options={WEATHERS} value={prefs.weather} onPick={(weather) => setPrefs({ ...prefs, weather })} />
            <Choice<'auto' | Season>
              label="Season"
              hint="Auto follows the month."
              options={['auto', ...SEASONS]}
              value={prefs.season}
              onPick={(season) => setPrefs({ ...prefs, season })}
            />
            <div className="pt-3 border-t" style={{ borderColor: EDGE }}>
              <Choice<WorldMood>
                label="How I feel"
                hint="Only on this device. Your partner never sees this — use your mood beacon to share."
                options={WORLD_MOODS}
                value={prefs.mood}
                onPick={(mood) => setPrefs({ ...prefs, mood })}
              />
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{ color: INK }}>
                <input
                  type="checkbox"
                  checked={prefs.moodShapesWorld}
                  onChange={(e) => setPrefs({ ...prefs, moodShapesWorld: e.target.checked })}
                />
                Let my mood change my world
              </label>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: EDGE }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: SOFT }}>
                Sound
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: '#7A6D63' }}>
                Wind, water, birds — made in your browser. Off each visit until you turn it on.
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-pressed={sound.enabled}
                  onClick={() => setSound({ ...sound, enabled: !sound.enabled })}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border focus:outline-none focus-visible:ring-2"
                  style={sound.enabled ? { background: INK, color: PAPER, borderColor: INK } : { background: PAPER, color: INK, borderColor: EDGE }}
                >
                  {sound.enabled ? 'On' : 'Off'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(sound.volume * 100)}
                  aria-label="World sound volume"
                  onChange={(e) => setSound({ ...sound, volume: Number(e.target.value) / 100 })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WorldControls;
