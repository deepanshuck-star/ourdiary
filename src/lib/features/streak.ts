// Couple streak with freeze tokens. Pure, import-free logic so it can be unit-tested with node.
//
// Rules:
// - A day counts when EITHER partner completed a ritual (daily spark answer or mood check-in).
// - Every 7th day of a streak earns a freeze token (max 2 held at once).
// - A freeze automatically covers a single missed day. Two or more missed days in a row end
//   the streak; any freeze spent on that gap is given back.
// - Today never breaks a streak — it is simply "still open" until midnight.

export type PartnerKey = 'user_1' | 'user_2';

export interface DayActivity {
  user_1: boolean;
  user_2: boolean;
}

export type ActivityMap = Record<string, DayActivity>;

export interface SparkLike {
  date: string;
  answers: Partial<Record<PartnerKey, { answeredAt?: string } | undefined>>;
}

export interface MoodSnapshotLike {
  profileId: PartnerKey;
  updatedAt: string;
}

export interface StreakDay {
  date: string;
  user_1: boolean;
  user_2: boolean;
  frozen: boolean;
  isToday: boolean;
}

export interface StreakResult {
  current: number;
  longest: number;
  freezes: number;
  frozenDays: string[];
  todayDone: boolean;
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;
export const STREAK_MILESTONES = [7, 30, 100, 365];

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day (YYYY-MM-DD) for an ISO timestamp or a plain day key. */
export function toDayKey(value: string): string | null {
  if (!value) return null;
  if (DAY_KEY.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateToDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a YYYY-MM-DD key by n calendar days (timezone-safe). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function mark(map: ActivityMap, day: string | null, who: PartnerKey) {
  if (!day) return;
  const entry = map[day] || { user_1: false, user_2: false };
  entry[who] = true;
  map[day] = entry;
}

/** Merge every ritual source into one per-day, per-partner activity map. */
export function collectActivity(input: {
  sparkAnswers?: SparkLike[];
  moodSnapshots?: MoodSnapshotLike[];
  currentMoods?: Partial<Record<PartnerKey, { updatedAt: string } | undefined>>;
}): ActivityMap {
  const map: ActivityMap = {};
  for (const spark of input.sparkAnswers || []) {
    for (const who of ['user_1', 'user_2'] as PartnerKey[]) {
      const answer = spark.answers?.[who];
      if (!answer) continue;
      mark(map, toDayKey(answer.answeredAt || spark.date), who);
    }
  }
  for (const snap of input.moodSnapshots || []) {
    mark(map, toDayKey(snap.updatedAt), snap.profileId);
  }
  for (const who of ['user_1', 'user_2'] as PartnerKey[]) {
    const mood = input.currentMoods?.[who];
    if (mood?.updatedAt) mark(map, toDayKey(mood.updatedAt), who);
  }
  return map;
}

function isActive(map: ActivityMap, day: string): boolean {
  const a = map[day];
  return !!a && (a.user_1 || a.user_2);
}

export function computeStreak(activity: ActivityMap, today: string): StreakResult {
  const days = Object.keys(activity)
    .filter((d) => d <= today && isActive(activity, d))
    .sort();
  const todayDone = isActive(activity, today);
  if (days.length === 0) {
    return { current: 0, longest: 0, freezes: 0, frozenDays: [], todayDone };
  }

  let current = 0;
  let longest = 0;
  let freezes = 0;
  let frozen: string[] = [];
  let pendingFreeze: string | null = null; // the freeze spent on yesterday, if any

  for (let day = days[0]; day <= today; day = addDays(day, 1)) {
    if (isActive(activity, day)) {
      current += 1;
      pendingFreeze = null;
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
      longest = Math.max(longest, current);
      continue;
    }
    if (day === today) break; // today is still open
    if (current === 0) continue;
    if (pendingFreeze) {
      // Second missed day in a row: the streak ends, the freeze is returned.
      freezes = Math.min(MAX_FREEZES, freezes + 1);
      frozen = frozen.filter((f) => f !== pendingFreeze);
      pendingFreeze = null;
      current = 0;
      continue;
    }
    if (freezes > 0) {
      freezes -= 1;
      pendingFreeze = day;
      frozen.push(day);
      continue;
    }
    current = 0;
  }

  return { current, longest, freezes, frozenDays: frozen, todayDone };
}

/** The last `count` days ending today, oldest first, for the dot strip. */
export function recentDays(
  activity: ActivityMap,
  today: string,
  frozenDays: string[],
  count = 7
): StreakDay[] {
  const out: StreakDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const a = activity[date];
    out.push({
      date,
      user_1: !!a?.user_1,
      user_2: !!a?.user_2,
      frozen: frozenDays.includes(date),
      isToday: i === 0,
    });
  }
  return out;
}

/** Highest milestone reached that has not been celebrated yet, or null. */
export function milestoneToCelebrate(current: number, celebrated: number[]): number | null {
  let hit: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (current >= m && !celebrated.includes(m)) hit = m;
  }
  return hit;
}

export function nextMilestone(current: number): number | null {
  return STREAK_MILESTONES.find((m) => m > current) ?? null;
}
