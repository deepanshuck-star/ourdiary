'use client';

import React from 'react';
import { CloudSun } from 'lucide-react';
import { DAY_PHASES, SEASONS, WEATHERS, type DayPhase, type Season, type Weather } from '@/lib/world/world';
import type { WorldPreferences } from '@/lib/world/preferences';

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
};

function Choice<T extends string>({
  label,
  hint,
  options,
  value,
  onPick,
}: {
  label: string;
  hint?: string;
  options: T[];
  value: T;
  onPick: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#5A4D44' }}>
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
              style={
                selected
                  ? { background: '#2A2420', color: '#FDFBF7', borderColor: '#2A2420' }
                  : { background: '#FDFBF7', color: '#2A2420', borderColor: '#DCCFBC' }
              }
            >
              {LABEL[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Pin the time, weather or season. Saved on this device only, so two
 * partners in different cities can each keep their own sky — or both pick
 * "Night" and sit under the same stars.
 */
export function WorldControls({
  prefs,
  onChange,
}: {
  prefs: WorldPreferences;
  onChange: (prefs: WorldPreferences) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm border focus:outline-none focus-visible:ring-2"
        style={{ background: '#FDFBF7', color: '#2A2420', borderColor: '#DCCFBC' }}
      >
        <CloudSun className="w-3.5 h-3.5" aria-hidden="true" />
        Sky
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close sky settings"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            // Solid on purpose: a menu floating over a see-through world
            // would let the scene show through the choices.
            className="absolute right-0 mt-2 z-50 w-72 max-w-[85vw] rounded-2xl border shadow-card p-4 space-y-4"
            style={{ background: '#FDFBF7', borderColor: '#DCCFBC' }}
          >
            <Choice<'auto' | DayPhase>
              label="Time of day"
              hint="Auto follows this device's clock."
              options={['auto', ...DAY_PHASES]}
              value={prefs.phase}
              onPick={(phase) => onChange({ ...prefs, phase })}
            />
            <Choice<Weather>
              label="Weather"
              options={WEATHERS}
              value={prefs.weather}
              onPick={(weather) => onChange({ ...prefs, weather })}
            />
            <Choice<'auto' | Season>
              label="Season"
              hint="Auto follows the month."
              options={['auto', ...SEASONS]}
              value={prefs.season}
              onPick={(season) => onChange({ ...prefs, season })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default WorldControls;
