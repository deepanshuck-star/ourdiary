// UI-only preference: light / dark / follow the OS. Stored per device, never synced.
export type Appearance = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ourdiary-appearance';

export function getAppearance(): Appearance {
  if (typeof window === 'undefined') return 'light';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'system' ? value : 'light';
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
