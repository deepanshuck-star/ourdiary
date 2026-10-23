// One photo each, every day, archived into a strip you can scroll back
// through. Import-free so `node --test` can load it directly — see
// tests/photo-of-day.test.mjs.
//
// The constraint is the feature: one per person per day. Unlimited uploads is
// the gallery, which already exists. A single frame is what people send each
// other anyway, and a row of them turns into something neither of you would
// have made on purpose.
//
// Days are the poster's own local date, not UTC. Eight time zones apart, a
// shared UTC day would put one person's Tuesday evening in the other's
// Wednesday column.

export interface DayPhoto {
  id: string;
  /** Real auth user id in a live space, profile slot in demo mode. */
  authorId: string;
  /** YYYY-MM-DD in the poster's own local time. */
  day: string;
  url: string;
  publicId?: string;
  caption?: string;
  createdAt: string; // ISO
}

export const MAX_CAPTION_LENGTH = 140;

/** A Date's local calendar date as YYYY-MM-DD. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function photoFor(photos: DayPhoto[], authorId: string | null, day: string): DayPhoto | null {
  if (!authorId) return null;
  return photos.find((p) => p.authorId === authorId && p.day === day) ?? null;
}

export function hasPosted(photos: DayPhoto[], authorId: string | null, day: string): boolean {
  return photoFor(photos, authorId, day) !== null;
}

/**
 * Adds a photo, replacing that person's existing one for the same day.
 *
 * Replacing rather than rejecting is deliberate: "one a day" is a shape, not
 * a punishment, and the second photo is usually the one they meant.
 */
export function upsertPhoto(photos: DayPhoto[], photo: DayPhoto): DayPhoto[] {
  const without = photos.filter((p) => !(p.authorId === photo.authorId && p.day === photo.day));
  return [...without, photo].sort((a, b) => b.day.localeCompare(a.day) || a.authorId.localeCompare(b.authorId));
}

export function removePhoto(photos: DayPhoto[], id: string): DayPhoto[] {
  return photos.filter((p) => p.id !== id);
}

export interface StripDay {
  day: string;
  mine: DayPhoto | null;
  theirs: DayPhoto | null;
  /** Both of you posted — the days the strip is really for. */
  complete: boolean;
}

/**
 * The archive, newest day first: one row per day either of you posted.
 *
 * Days nobody posted are skipped rather than rendered empty — a strip mostly
 * made of gaps reads as a scolding.
 */
export function buildStrip(
  photos: DayPhoto[],
  myId: string | null,
  partnerId: string | null,
  limit = 60
): StripDay[] {
  const days = Array.from(new Set(photos.map((p) => p.day))).sort((a, b) => b.localeCompare(a));
  return days.slice(0, limit).map((day) => {
    const mine = photoFor(photos, myId, day);
    const theirs = photoFor(photos, partnerId, day);
    return { day, mine, theirs, complete: Boolean(mine && theirs) };
  });
}

/**
 * Consecutive days, counting back from today, where you BOTH posted.
 *
 * Today is allowed to be incomplete without breaking the run — it is still
 * in progress until midnight, and resetting someone's streak at 00:01 for a
 * day they have not had yet would be wrong.
 */
export function bothPostedStreak(
  photos: DayPhoto[],
  myId: string | null,
  partnerId: string | null,
  todayKey: string
): number {
  if (!myId || !partnerId) return 0;
  const complete = new Set(
    buildStrip(photos, myId, partnerId, Number.MAX_SAFE_INTEGER)
      .filter((d) => d.complete)
      .map((d) => d.day)
  );

  let streak = 0;
  let cursor = todayKey;
  if (!complete.has(cursor)) cursor = shiftDay(cursor, -1);
  while (complete.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/** YYYY-MM-DD shifted by whole days, via UTC so no DST hour sneaks in. */
export function shiftDay(dayKey: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + delta * 86_400_000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

/** "Today" / "Yesterday" / "Mon, 12 Oct" for a day column. */
export function dayHeading(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return 'Today';
  if (dayKey === shiftDay(todayKey, -1)) return 'Yesterday';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!m) return dayKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const sameYear = m[1] === todayKey.slice(0, 4);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Keeps the shared blob from growing forever; the gallery is the archive. */
export function prunePhotos(photos: DayPhoto[], todayKey: string, keepDays = 180): DayPhoto[] {
  const cutoff = shiftDay(todayKey, -keepDays);
  return photos.filter((p) => p.day >= cutoff);
}
