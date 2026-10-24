// UI-only preference: light / dark / follow the OS. Stored per device, never synced.
//
// Dark is the default on this branch. The design is built for an evening app
// — photographs against near-black, depth made of light — and opening in the
// light variant would show everyone the exception rather than the rule. The
// switcher still works; "light" is a daylight variant of the same language.
export type Appearance = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ourdiary-appearance';

export function getAppearance(): Appearance {
  if (typeof window === 'undefined') return 'dark';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'system' ? value : 'dark';
  } catch {
    return 'light';
  }
}

export function setAppearance(value: Appearance) {
  document.documentElement.dataset.appearance = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode / blocked storage: the choice still applies for this visit.
  }
}
