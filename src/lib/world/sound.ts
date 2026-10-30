// What the world sounds like, as data. The audio engine (audio.ts) turns
// this into Web Audio; this file only decides which layers play and how
// loud, so the decision is testable without a browser.
//
// Every layer is synthesised in the browser — filtered noise for wind,
// water and rain, short tone sweeps for birdsong, bursts for a fire. No
// recordings, so nothing here carries a licence, and nothing is downloaded
// unless the viewer turns sound on.

import type { DayPhase, Season, Weather } from './world';

export const SOUND_LAYERS = ['wind', 'river', 'rain', 'birds', 'insects', 'fire', 'train', 'leaves'] as const;
export type SoundLayerId = (typeof SOUND_LAYERS)[number];

export const SOUND_PLACES = ['home', 'forest', 'river', 'mountains', 'starlight', 'journey'] as const;
export type SoundPlace = (typeof SOUND_PLACES)[number];

export interface SoundLayer {
  id: SoundLayerId;
  /** 0–1, before the master volume. */
  gain: number;
}

/** At most this many layers at once — a soundscape, not a din. */
export const MAX_LAYERS = 4;

export function soundscapeFor(place: SoundPlace, phase: DayPhase, season: Season, weather: Weather): SoundLayer[] {
  const night = phase === 'night';
  const wet = weather === 'rain' || weather === 'snow';
  const layers: SoundLayer[] = [];

  layers.push({ id: 'wind', gain: weather === 'windy' ? 0.6 : weather === 'snow' ? 0.35 : 0.18 });
  if (weather === 'rain') layers.push({ id: 'rain', gain: 0.65 });
  if (place === 'home' || place === 'river') layers.push({ id: 'river', gain: place === 'river' ? 0.55 : 0.3 });
  if (place === 'forest') layers.push({ id: 'leaves', gain: weather === 'windy' ? 0.5 : 0.32 });
  if (place === 'journey') layers.push({ id: 'train', gain: 0.45 });
  if (!night && !wet && weather !== 'fog') layers.push({ id: 'birds', gain: phase === 'morning' ? 0.5 : 0.3 });
  if (night && !wet && season !== 'winter') layers.push({ id: 'insects', gain: 0.28 });
  if ((season === 'winter' || night) && (place === 'home' || place === 'starlight')) layers.push({ id: 'fire', gain: 0.3 });

  return layers
    .filter((layer) => layer.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, MAX_LAYERS);
}

export interface SoundPreferences {
  /** Off until the viewer turns it on. Never autoplays. */
  enabled: boolean;
  /** 0–1 master volume. */
  volume: number;
}

export const DEFAULT_SOUND: SoundPreferences = { enabled: false, volume: 0.5 };

export function parseSoundPreferences(raw: unknown): SoundPreferences {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const volume = typeof v.volume === 'number' && Number.isFinite(v.volume) ? Math.min(1, Math.max(0, v.volume)) : DEFAULT_SOUND.volume;
  return { enabled: v.enabled === true, volume };
}
