// Countdown math. Import-free so `node --test` can load it directly.
// Calendar dates ('YYYY-MM-DD') are interpreted as local midnight.

export const DAY_MS = 86_400_000;

export interface DurationParts {
  past: boolean;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitDuration(ms: number): DurationParts {
  const past = ms < 0;
  const abs = Math.abs(ms);
  const totalSeconds = Math.floor(abs / 1000);
  return {
    past,
    totalMs: ms,
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function parseLocalDate(dateStr: string, time?: string): Date {
  const [y, m, d] = dateStr.split('-').map((p) => parseInt(p, 10));
  let hh = 0;
  let mm = 0;
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [h, min] = time.split(':').map((p) => parseInt(p, 10));
    hh = h;
    mm = min;
  }
  return new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Month/day in a given year; Feb 29 falls back to Feb 28 in non-leap years. */
function annualDate(year: number, month: number, day: number): Date {
  const candidate = new Date(year, month, day);
  if (candidate.getMonth() !== month) return new Date(year, month + 1, 0);
  return candidate;
}

/** Next occurrence (today counts) of an annual date, plus how many years it marks. */
export function nextAnnual(dateStr: string, now: Date): { date: Date; years: number } {
  const base = parseLocalDate(dateStr);
  const today = startOfDay(now);
  let year = today.getFullYear();
  let candidate = annualDate(year, base.getMonth(), base.getDate());
  if (candidate.getTime() < today.getTime()) {
    year += 1;
    candidate = annualDate(year, base.getMonth(), base.getDate());
  }
  return { date: candidate, years: year - base.getFullYear() };
}

export const DAY_MILESTONES = [100, 200, 365, 500, 730, 1000, 1095, 1500, 1825, 2000, 2500, 3000, 3650, 5000, 7300, 10000];

/** Next "N days together" milestone that is today or later. */
export function nextDayMilestone(startDateStr: string, now: Date): { days: number; date: Date } | null {
  const start = parseLocalDate(startDateStr);
  const today = startOfDay(now);
  for (const days of DAY_MILESTONES) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days);
    if (date.getTime() >= today.getTime()) return { days, date };
  }
  return null;
}

/** Whole calendar days from today until the given date (negative if past). */
export function calendarDaysUntil(target: Date, now: Date): number {
  const a = startOfDay(now);
  const b = startOfDay(target);
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export type CountdownKind = 'anniversary' | 'milestone' | 'event' | 'custom';

export interface CountdownItem {
  id: string;
  title: string;
  subtitle?: string;
  target: number; // epoch ms
  kind: CountdownKind;
  icon?: string;
}

export interface CountdownEventInput {
  id: string;
  title: string;
  date: string;
  time?: string;
  category?: string;
}

export function buildAutoCountdowns(
  couple: { startDate: string; anniversaryDate?: string },
  events: CountdownEventInput[],
  now: Date,
  maxEvents = 4
): CountdownItem[] {
  const items: CountdownItem[] = [];
  const annivSource = couple.anniversaryDate || couple.startDate;
  if (annivSource) {
    const next = nextAnnual(annivSource, now);
    items.push({
      id: 'auto-anniversary',
      title: next.years > 0 ? `Anniversary no. ${next.years}` : 'Our anniversary',
      subtitle: 'Next anniversary',
      target: next.date.getTime(),
      kind: 'anniversary',
    });
  }
  if (couple.startDate) {
    const milestone = nextDayMilestone(couple.startDate, now);
    if (milestone) {
      items.push({
        id: 'auto-milestone',
        title: `${milestone.days.toLocaleString('en-US')} days together`,
        subtitle: 'Next milestone',
        target: milestone.date.getTime(),
        kind: 'milestone',
      });
    }
  }
  const nowMs = now.getTime();
  const todayMs = startOfDay(now).getTime();
  events
    .map((e) => ({ e, at: parseLocalDate(e.date, e.time).getTime() }))
    .filter(({ e, at }) => (e.time ? at >= nowMs : at >= todayMs))
    .sort((a, b) => a.at - b.at)
    .slice(0, maxEvents)
    .forEach(({ e, at }) => {
      items.push({
        id: `event-${e.id}`,
        title: e.title,
        subtitle: e.category ? `Calendar · ${e.category}` : 'Calendar',
        target: at,
        kind: 'event',
      });
    });
  return items;
}

/** Memories from an earlier year whose month/day match today ('YYYY-MM-DD'). */
export function memoriesOnThisDay<T extends { date: string }>(memories: T[], todayISO: string): T[] {
  const [ty, tm, td] = todayISO.split('-');
  return memories.filter((m) => {
    const [y, mo, d] = (m.date || '').split('-');
    return mo === tm && d === td && Number(y) < Number(ty);
  });
}
