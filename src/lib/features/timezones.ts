// Long-distance time-zone logic. Import-free so `node --test` can load it directly.

export const WAKE_START_MIN = 7 * 60; // 07:00
export const WAKE_END_MIN = 23 * 60; // 23:00
const DAY_MIN = 1440;

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function zonedParts(ms: number, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') out[p.type] = parseInt(p.value, 10);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Minutes the zone is ahead of UTC at the given instant (e.g. +330 for Asia/Kolkata). */
export function offsetMinutes(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const flooredMs = Math.floor(ms / 1000) * 1000;
  return Math.round((asUtc - flooredMs) / 60000);
}

/** Convert a wall-clock time in `timeZone` to an epoch instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - offsetMinutes(guess, timeZone) * 60000;
  const corrected = guess - offsetMinutes(result, timeZone) * 60000;
  if (corrected !== result) result = corrected;
  return result;
}

export function isProbablyAsleep(hour: number): boolean {
  return hour >= 23 || hour < 7;
}

export function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 18;
}

export type Interval = [number, number]; // [start, end) in minutes of the UTC day

function normalize(m: number): number {
  return ((m % DAY_MIN) + DAY_MIN) % DAY_MIN;
}

/** A person's waking window expressed in UTC minutes-of-day (split if it wraps midnight). */
export function wakingIntervalsUtc(offsetMin: number, wakeStart = WAKE_START_MIN, wakeEnd = WAKE_END_MIN): Interval[] {
  const start = normalize(wakeStart - offsetMin);
  const length = normalize(wakeEnd - wakeStart) || DAY_MIN;
  const end = start + length;
  if (end <= DAY_MIN) return [[start, end]];
  return [
    [start, DAY_MIN],
    [0, end - DAY_MIN],
  ];
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [s1, e1] of a) {
    for (const [s2, e2] of b) {
      const s = Math.max(s1, s2);
      const e = Math.min(e1, e2);
      if (e > s) out.push([s, e]);
    }
  }
  out.sort((x, y) => x[0] - y[0]);
  // Merge touching pieces.
  const merged: Interval[] = [];
  for (const iv of out) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  // Join a window that wraps across UTC midnight.
  if (merged.length > 1 && merged[0][0] === 0 && merged[merged.length - 1][1] === DAY_MIN) {
    const first = merged.shift() as Interval;
    merged[merged.length - 1][1] = DAY_MIN + first[1];
  }
  return merged;
}

export interface Overlap {
  totalMinutes: number;
  /** Windows in UTC minutes; an end above 1440 means it continues past UTC midnight. */
  windowsUtc: Interval[];
}

export function wakingOverlap(offsetA: number, offsetB: number): Overlap {
  const windows = intersect(wakingIntervalsUtc(offsetA), wakingIntervalsUtc(offsetB));
  return {
    totalMinutes: windows.reduce((sum, [s, e]) => sum + (e - s), 0),
    windowsUtc: windows,
  };
}

/** Shift a UTC minutes-of-day value into a zone's local clock, as 'HH:MM'. */
export function formatMinutesInOffset(utcMinutes: number, offsetMin: number): string {
  const m = normalize(utcMinutes + offsetMin);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatOffset(offsetMin: number): string {
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export function hoursApart(offsetA: number, offsetB: number): number {
  return (offsetB - offsetA) / 60;
}

export function filterTimeZones(zones: string[], query: string, limit = 60): string[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '_');
  if (!q) return zones.slice(0, limit);
  return zones.filter((z) => z.toLowerCase().includes(q)).slice(0, limit);
}
