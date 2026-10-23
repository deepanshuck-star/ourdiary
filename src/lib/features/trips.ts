// The next visit: a countdown and what it costs, split between you.
// Import-free so `node --test` can load it directly — see tests/trips.test.mjs.
//
// This joins the two things the app already had separately: a countdown with
// nothing at stake, and a budget with no event attached. The thing a
// long-distance couple actually plans around is one date and one number —
// "47 days, flights £240, you owe me £120".
//
// Money is held in integer minor units for the same reason src/lib/features/
// budget.ts does: 0.1 + 0.2 is not 0.3, and a split that is a penny out looks
// like a bug in a page about trust.

export interface TripCost {
  id: string;
  label: string;
  amount: number; // major units, e.g. 240.5
  /** Who actually paid — real user id live, profile slot in demo mode. */
  paidBy: string;
  createdAt: string; // ISO
}

export interface Trip {
  id: string;
  title: string;
  destination?: string;
  /** YYYY-MM-DD, local. The day you're finally in the same place. */
  startDate: string;
  /** YYYY-MM-DD, optional. The day one of you leaves again. */
  endDate?: string;
  /** Who is doing the travelling, when it is one of you rather than both. */
  travellerId?: string;
  notes?: string;
  costs: TripCost[];
  createdBy: string;
  createdAt: string; // ISO
}

export type TripStatus = 'upcoming' | 'together-now' | 'past';

const toMinor = (n: number) => Math.round(n * 100);
const toMajor = (n: number) => n / 100;

function parseISODateUTC(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(ms);
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return ms;
}

export function isValidISODate(value: string): boolean {
  return parseISODateUTC(value) !== null;
}

/** Whole days between two calendar dates; negative when `toISO` is earlier. */
export function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = parseISODateUTC(fromISO);
  const b = parseISODateUTC(toISO);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Days until you're in the same room. Zero means today. */
export function daysUntilTrip(trip: Trip, todayISO: string): number {
  return daysBetweenISO(todayISO, trip.startDate);
}

export function tripStatus(trip: Trip, todayISO: string): TripStatus {
  const until = daysUntilTrip(trip, todayISO);
  if (until > 0) return 'upcoming';
  const lastDay = trip.endDate && isValidISODate(trip.endDate) ? trip.endDate : trip.startDate;
  return daysBetweenISO(todayISO, lastDay) >= 0 ? 'together-now' : 'past';
}

/** Nights the visit covers; a same-day trip is 0. */
export function tripNights(trip: Trip): number {
  if (!trip.endDate || !isValidISODate(trip.endDate)) return 0;
  return Math.max(0, daysBetweenISO(trip.startDate, trip.endDate));
}

/** Soonest first for anything still ahead, then the past most-recent first. */
export function sortTrips(trips: Trip[], todayISO: string): Trip[] {
  const ahead: Trip[] = [];
  const behind: Trip[] = [];
  for (const trip of trips) {
    (tripStatus(trip, todayISO) === 'past' ? behind : ahead).push(trip);
  }
  ahead.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt));
  behind.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return [...ahead, ...behind];
}

/** The one the counter counts down to. */
export function nextTrip(trips: Trip[], todayISO: string): Trip | null {
  const ahead = sortTrips(trips, todayISO).filter((t) => tripStatus(t, todayISO) !== 'past');
  return ahead[0] ?? null;
}

export interface TripSplit {
  total: number;
  /** What each person actually put in, keyed by payer id. */
  paid: Record<string, number>;
  /** Half the total — what each person's share is. */
  fairShare: number;
  /** Null when you're already even. */
  owes: { from: string; to: string; amount: number } | null;
}

/**
 * Splits a trip's costs 50/50 between the two people and works out who tops
 * the other up. Costs paid by someone who is not one of the two ids given
 * (a stale row from a previous partner, say) still count toward the total but
 * cannot be settled, so they are left out of `paid`.
 */
export function splitTrip(trip: Trip, idA: string | null, idB: string | null): TripSplit {
  let totalMinor = 0;
  let aMinor = 0;
  let bMinor = 0;

  for (const cost of trip.costs) {
    const minor = toMinor(cost.amount);
    totalMinor += minor;
    if (idA && cost.paidBy === idA) aMinor += minor;
    else if (idB && cost.paidBy === idB) bMinor += minor;
  }

  const diff = aMinor - bMinor; // positive: A has paid more
  const owedMinor = Math.round(Math.abs(diff) / 2);
  const paid: Record<string, number> = {};
  if (idA) paid[idA] = toMajor(aMinor);
  if (idB) paid[idB] = toMajor(bMinor);

  return {
    total: toMajor(totalMinor),
    paid,
    fairShare: toMajor(Math.round(totalMinor / 2)),
    owes:
      owedMinor === 0 || !idA || !idB
        ? null
        : diff > 0
          ? { from: idB, to: idA, amount: toMajor(owedMinor) }
          : { from: idA, to: idB, amount: toMajor(owedMinor) },
  };
}

export interface TripDraft {
  title: string;
  startDate: string;
  endDate?: string;
}

export function validateTrip(draft: TripDraft): string | null {
  if (!draft.title.trim()) return 'Name the visit — "Ritesh comes to London" works.';
  if (draft.title.trim().length > 120) return 'That name is a bit long (max 120 characters).';
  if (!isValidISODate(draft.startDate)) return 'Pick the day you arrive.';
  if (draft.endDate && draft.endDate.trim()) {
    if (!isValidISODate(draft.endDate)) return 'That leaving date isn’t a real date.';
    if (daysBetweenISO(draft.startDate, draft.endDate) < 0) {
      return 'The visit can’t end before it starts.';
    }
  }
  return null;
}

/** Shares budget.ts's parser so both money inputs accept exactly the same thing. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}
