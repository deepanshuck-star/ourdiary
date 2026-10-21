// Pure helpers for the bad-habits list. No React, no network — see
// tests/habits.test.mjs.

export const MAX_HABIT_TITLE = 200;
export const MAX_HABIT_NOTE = 2000;

export type Severity = 1 | 2 | 3;

export const SEVERITIES: { value: Severity; label: string; blurb: string }[] = [
  { value: 1, label: 'Mildly annoying', blurb: 'I’ll live' },
  { value: 2, label: 'Genuinely annoying', blurb: 'Please stop' },
  { value: 3, label: 'We need to talk', blurb: 'This one matters' },
];

export function severityLabel(severity: number): string {
  return SEVERITIES.find((s) => s.value === severity)?.label ?? 'Mildly annoying';
}

export function clampSeverity(value: number): Severity {
  if (value <= 1) return 1;
  if (value >= 3) return 3;
  return 2;
}

export interface HabitLike {
  id: string;
  aboutUserId: string;
  title: string;
  severity: number;
  forgiven: boolean;
  createdAt: string;
}

/** Returns an error message, or null when the habit is fine to save. */
export function validateHabit(title: string, note: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return 'Give the habit a name first.';
  if (trimmed.length > MAX_HABIT_TITLE) return `Keep the name under ${MAX_HABIT_TITLE} characters.`;
  if (note.trim().length > MAX_HABIT_NOTE) return `That note is too long (max ${MAX_HABIT_NOTE} characters).`;
  return null;
}

/**
 * Unforgiven first (that's the list you act on), then most severe, then
 * newest. Forgiven habits sink to the bottom but are never dropped — keeping
 * them is the point.
 */
export function sortHabits<T extends HabitLike>(habits: T[]): T[] {
  return [...habits].sort((a, b) => {
    if (a.forgiven !== b.forgiven) return a.forgiven ? 1 : -1;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Splits the list into "my habits" and "theirs", for the two columns. */
export function splitByPerson<T extends HabitLike>(
  habits: T[],
  myUserId: string | null
): { mine: T[]; theirs: T[] } {
  const mine: T[] = [];
  const theirs: T[] = [];
  for (const habit of habits) {
    // With no signed-in user there is no "mine" to speak of, so everything
    // is listed as the partner's rather than silently vanishing.
    if (myUserId && habit.aboutUserId === myUserId) mine.push(habit);
    else theirs.push(habit);
  }
  return { mine: sortHabits(mine), theirs: sortHabits(theirs) };
}

export interface HabitTally {
  total: number;
  forgiven: number;
  outstanding: number;
}

export function tallyHabits(habits: HabitLike[]): HabitTally {
  const forgiven = habits.filter((h) => h.forgiven).length;
  return { total: habits.length, forgiven, outstanding: habits.length - forgiven };
}
