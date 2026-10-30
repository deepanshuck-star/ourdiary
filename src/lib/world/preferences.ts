// How this device wants the little world to look. Per device and never
// synced, like appearance and motion: two partners in different cities
// each see their own sky by default, and either can pin a time or weather
// without changing what the other sees. Your world mood lives here for the
// same reason — it is yours, and it is never sent anywhere.

import {
  DAY_PHASES,
  SEASONS,
  WEATHERS,
  type DayPhase,
  type Override,
  type Season,
  type Weather,
} from './world';
import { isWorldMood, type WorldMood } from './mood';
import { DEFAULT_SOUND, parseSoundPreferences, type SoundPreferences } from './sound';

export interface WorldPreferences {
  phase: Override<DayPhase>;
  season: Override<Season>;
  weather: Weather;
  mood: WorldMood;
  /** Whether the chosen mood is allowed to change the scene. */
  moodShapesWorld: boolean;
}

export const DEFAULT_WORLD_PREFERENCES: WorldPreferences = {
  phase: 'auto',
  season: 'auto',
  weather: 'clear',
  mood: 'none',
  moodShapesWorld: true,
};

const STORAGE_KEY = 'ourdiary-world';
const SOUND_KEY = 'ourdiary-world-sound';

/** Accepts anything and returns something valid — storage can hold junk. */
export function parseWorldPreferences(raw: unknown): WorldPreferences {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const phase = value.phase === 'auto' || DAY_PHASES.includes(value.phase as DayPhase)
    ? (value.phase as Override<DayPhase>)
    : DEFAULT_WORLD_PREFERENCES.phase;
  const season = value.season === 'auto' || SEASONS.includes(value.season as Season)
    ? (value.season as Override<Season>)
    : DEFAULT_WORLD_PREFERENCES.season;
  const weather = WEATHERS.includes(value.weather as Weather)
    ? (value.weather as Weather)
    : DEFAULT_WORLD_PREFERENCES.weather;
  const mood = isWorldMood(value.mood) ? value.mood : DEFAULT_WORLD_PREFERENCES.mood;
  const moodShapesWorld = value.moodShapesWorld === false ? false : true;
  return { phase, season, weather, mood, moodShapesWorld };
}

// A tiny store, so every scene and every Sky panel on a page agree, and a
// change in one tab reaches the others through the storage event.
const listeners = new Set<() => void>();
let cached: WorldPreferences | null = null;

export function loadWorldPreferences(): WorldPreferences {
  if (typeof window === 'undefined') return DEFAULT_WORLD_PREFERENCES;
  if (cached) return cached;
  try {
    cached = parseWorldPreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    cached = DEFAULT_WORLD_PREFERENCES;
  }
  return cached;
}

export function saveWorldPreferences(prefs: WorldPreferences) {
  cached = prefs;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or blocked storage: the choice still applies this visit.
  }
  listeners.forEach((fn) => fn());
}

export function subscribeWorldPreferences(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null;
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

// Sound: the volume is remembered; whether it is ON is not. Each visit
// starts silent, so the world never plays audio the viewer did not just ask
// for — browsers would block that anyway, and the brief rules it out.
let soundCached: SoundPreferences | null = null;
let soundOnThisVisit = false;
const soundListeners = new Set<() => void>();

export function loadSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') return DEFAULT_SOUND;
  if (!soundCached) {
    try {
      const stored = parseSoundPreferences(JSON.parse(window.localStorage.getItem(SOUND_KEY) || 'null'));
      soundCached = { enabled: false, volume: stored.volume };
    } catch {
      soundCached = DEFAULT_SOUND;
    }
  }
  return { ...soundCached, enabled: soundOnThisVisit };
}

let soundSnapshot: SoundPreferences = DEFAULT_SOUND;
export function soundSnapshotFor(): SoundPreferences {
  const next = loadSoundPreferences();
  if (next.enabled !== soundSnapshot.enabled || next.volume !== soundSnapshot.volume) soundSnapshot = next;
  return soundSnapshot;
}

export function saveSoundPreferences(prefs: SoundPreferences) {
  soundOnThisVisit = prefs.enabled;
  soundCached = { enabled: false, volume: prefs.volume };
  try {
    window.localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: prefs.volume }));
  } catch {
    // Volume simply resets next visit.
  }
  soundListeners.forEach((fn) => fn());
}

export function subscribeSoundPreferences(onChange: () => void): () => void {
  soundListeners.add(onChange);
  return () => soundListeners.delete(onChange);
}
