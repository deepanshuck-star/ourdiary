// Care-package tracking: something is physically in the post between you.
// Import-free so `node --test` can load it directly — see
// tests/care-packages.test.mjs.
//
// Calendar dates ('YYYY-MM-DD') throughout, compared as whole days. A parcel
// does not care what hour it is, and treating "expected Tuesday" as an
// instant would make it arrive at midnight in one time zone and not the other.

export interface CarePackage {
  id: string;
  title: string;
  /** Real auth user id in a live space, profile slot in demo mode. */
  fromId: string;
  toId: string;
  sentOn: string; // YYYY-MM-DD
  expectedOn: string; // YYYY-MM-DD
  carrier?: string;
  tracking?: string;
  note?: string;
  photoUrl?: string;
  photoPublicId?: string;
  arrivedOn?: string; // YYYY-MM-DD
  /** One emoji the recipient leaves when they open it. */
  reaction?: string;
  createdAt: string; // ISO
}

export type PackageStatus = 'arrived' | 'arriving-today' | 'on-the-way' | 'overdue';

/** Whole days from `fromISO` to `toISO`; negative when `toISO` is earlier. */
export function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = parseISODateUTC(fromISO);
  const b = parseISODateUTC(toISO);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / 86_400_000);
}

function parseISODateUTC(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ms = Date.UTC(year, month - 1, day);
  // Rejects 2026-02-31 and friends, which Date.UTC would happily roll over.
  const d = new Date(ms);
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return ms;
}

export function isValidISODate(value: string): boolean {
  return parseISODateUTC(value) !== null;
}

/** Days from today until it is expected; negative once that day has passed. */
export function daysUntilArrival(pkg: CarePackage, todayISO: string): number {
  return daysBetweenISO(todayISO, pkg.expectedOn);
}

export function packageStatus(pkg: CarePackage, todayISO: string): PackageStatus {
  if (pkg.arrivedOn) return 'arrived';
  const days = daysUntilArrival(pkg, todayISO);
  if (days > 0) return 'on-the-way';
  if (days === 0) return 'arriving-today';
  return 'overdue';
}

/** How long it actually took, once it has landed. */
export function transitDays(pkg: CarePackage): number | null {
  if (!pkg.arrivedOn) return null;
  return Math.max(0, daysBetweenISO(pkg.sentOn, pkg.arrivedOn));
}

/**
 * In the air first (soonest expected first), then everything that has landed,
 * most recently arrived first. Anything still out is more interesting than
 * anything already opened.
 */
export function sortPackages(packages: CarePackage[], todayISO: string): CarePackage[] {
  const live: CarePackage[] = [];
  const done: CarePackage[] = [];
  for (const pkg of packages) {
    (packageStatus(pkg, todayISO) === 'arrived' ? done : live).push(pkg);
  }
  live.sort((a, b) => a.expectedOn.localeCompare(b.expectedOn) || a.createdAt.localeCompare(b.createdAt));
  done.sort((a, b) => (b.arrivedOn || '').localeCompare(a.arrivedOn || ''));
  return [...live, ...done];
}

/** The one to put at the top of a dashboard card: the next thing landing. */
export function nextArrival(packages: CarePackage[], todayISO: string): CarePackage | null {
  const live = sortPackages(packages, todayISO).filter((p) => !p.arrivedOn);
  return live[0] ?? null;
}

export interface PackageDraft {
  title: string;
  sentOn: string;
  expectedOn: string;
}

export function validatePackage(draft: PackageDraft): string | null {
  if (!draft.title.trim()) return 'Give it a name — "a jumper and too much chocolate" counts.';
  if (draft.title.trim().length > 120) return 'That name is a bit long (max 120 characters).';
  if (!isValidISODate(draft.sentOn)) return 'Pick the day you posted it.';
  if (!isValidISODate(draft.expectedOn)) return 'Pick roughly when it should land.';
  if (daysBetweenISO(draft.sentOn, draft.expectedOn) < 0) {
    return 'It can’t arrive before you posted it.';
  }
  return null;
}

/** "lands tomorrow" / "3 days out" / "2 days late" / "arrived" — card subtitle. */
export function arrivalPhrase(pkg: CarePackage, todayISO: string): string {
  const status = packageStatus(pkg, todayISO);
  if (status === 'arrived') {
    const days = transitDays(pkg);
    return days === null ? 'Arrived' : days === 1 ? 'Arrived — 1 day in the post' : `Arrived — ${days} days in the post`;
  }
  const days = daysUntilArrival(pkg, todayISO);
  if (status === 'arriving-today') return 'Should land today';
  if (status === 'on-the-way') return days === 1 ? 'Lands tomorrow' : `${days} days out`;
  const late = Math.abs(days);
  return late === 1 ? '1 day late' : `${late} days late`;
}
