// How this device wants the little world to look. Per device and never
// synced, like appearance and motion: two partners in different cities
// each see their own sky by default, and either can pin a time or weather
// without changing what the other sees.

import {
  DAY_PHASES,
  SEASONS,
  WEATHERS,
  type DayPhase,
  type Override,
  type Season,
  type Weather,
} from './world';

export interface WorldPreferences {
  phase: Override<DayPhase>;
  season: Override<Season>;
  weather: Weather;
}

export const DEFAULT_WORLD_PREFERENCES: WorldPreferences = {
  phase: 'auto',
  season: 'auto',
  weather: 'clear',
};

const STORAGE_KEY = 'ourdiary-world';

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
  return { phase, season, weather };
}

export function loadWorldPreferences(): WorldPreferences {
  if (typeof window === 'undefined') return DEFAULT_WORLD_PREFERENCES;
  try {
    return parseWorldPreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return DEFAULT_WORLD_PREFERENCES;
  }
}

export function saveWorldPreferences(prefs: WorldPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or blocked storage: the choice still applies this visit.
  }
}
