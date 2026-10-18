// Surprise-note unlock logic. Import-free so `node --test` can load it directly.

export type NoteAuthor = 'user_1' | 'user_2';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SurpriseNote {
  id: string;
  fromId: NoteAuthor;
  toId: NoteAuthor;
  teaser: string;
  message: string;
  createdAt: string; // ISO
  unlockAt?: string; // ISO instant
  place?: LatLng & { label?: string };
  radiusM?: number;
  /** 'all' = every condition must hold, 'any' = one is enough. */
  rule: 'all' | 'any';
  /** Set once the place condition has been confirmed by an on-demand check. */
  placeConfirmedAt?: string;
  unlockedAt?: string;
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export interface UnlockState {
  hasTime: boolean;
  hasPlace: boolean;
  timeOk: boolean;
  placeOk: boolean;
  unlocked: boolean;
  distanceM?: number;
}

/**
 * Evaluate a note's unlock conditions.
 * `position` is only supplied right after an explicit "Check if I'm there" tap.
 */
export function evaluateUnlock(note: SurpriseNote, nowMs: number, position?: LatLng | null): UnlockState {
  const hasTime = Boolean(note.unlockAt);
  const hasPlace = Boolean(note.place);
  const timeOk = hasTime ? nowMs >= Date.parse(note.unlockAt as string) : false;

  let distanceM: number | undefined;
  let placeOk = Boolean(note.placeConfirmedAt);
  if (hasPlace && position && note.place) {
    distanceM = haversineMeters(position, note.place);
    if (distanceM <= (note.radiusM ?? 100)) placeOk = true;
  }
  if (!hasPlace) placeOk = false;

  let unlocked: boolean;
  if (note.unlockedAt) unlocked = true;
  else if (!hasTime && !hasPlace) unlocked = true;
  else if (note.rule === 'any') unlocked = (hasTime && timeOk) || (hasPlace && placeOk);
  else unlocked = (!hasTime || timeOk) && (!hasPlace || placeOk);

  return { hasTime, hasPlace, timeOk, placeOk, unlocked, distanceM };
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}
