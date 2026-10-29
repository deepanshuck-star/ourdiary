// Whether the environment animates. Stored per device, never synced — it is
// about this screen and this person's eyes, not about the couple.
//
// 'system' follows the device's reduced-motion setting, and is the default:
// someone who has asked their OS for less motion should get less motion
// without having to find a toggle. The other two are an explicit override in
// both directions, because a viewer whose OS says "reduce" for scrolling and
// menus may still want the scenery, and that was not expressible before —
// a media query is resolved by the browser and nothing on the page can
// re-open it.
//
// The resolved answer is written to data-motion on <html>, and the scene
// stylesheets key every animation on :root[data-motion="on"].

export type MotionPreference = 'system' | 'on' | 'off';

const STORAGE_KEY = 'ourdiary-motion';

export function getMotionPreference(): MotionPreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'on' || value === 'off' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Does the device itself ask for less motion? */
export function deviceAsksForLessMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolveMotion(preference: MotionPreference): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return !deviceAsksForLessMotion();
}

/** Writes the resolved answer where the stylesheets can see it. */
export function applyMotion(preference: MotionPreference) {
  document.documentElement.dataset.motion = resolveMotion(preference) ? 'on' : 'off';
}

export function setMotionPreference(value: MotionPreference) {
  applyMotion(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode or blocked storage: the choice still applies this visit.
  }
}

export const MOTION_OPTIONS: { id: MotionPreference; name: string; description: string }[] = [
  { id: 'system', name: 'Follow my device', description: 'Still if your device asks for less motion.' },
  { id: 'on', name: 'Always on', description: 'The scenery moves, whatever your device says.' },
  { id: 'off', name: 'Always still', description: 'A painted scene, with nothing moving.' },
];
