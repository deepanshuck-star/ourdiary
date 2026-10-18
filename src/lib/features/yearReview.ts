// "Year in Review" stats. Pure, import-free logic (node-testable).

export interface ReviewMemory {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  location?: string;
  mood?: string;
  photos?: { url: string }[];
}

export interface ReviewLetter {
  createdAt: string; // ISO
  isDraft?: boolean;
}

export interface YearReviewStats {
  year: number | 'all';
  memoriesCount: number;
  photosCount: number;
  topPlaces: { place: string; count: number }[];
  busiestMonth: { month: number; count: number } | null; // month is 0-11
  favouriteMood: { mood: string; count: number } | null;
  longestStreak: number;
  lettersWritten: number;
  firstMemory: ReviewMemory | null;
  highlightPhotos: string[];
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function yearOf(date: string): number {
  return Number(String(date).slice(0, 4));
}

function inYear(date: string, year: number | 'all'): boolean {
  return year === 'all' || yearOf(date) === year;
}

/** Years with at least one memory or letter, newest first. */
export function availableYears(memories: { date: string }[], letters: { createdAt: string }[] = []): number[] {
  const set = new Set<number>();
  memories.forEach((m) => {
    const y = yearOf(m.date);
    if (y > 0) set.add(y);
  });
  letters.forEach((l) => {
    const y = yearOf(l.createdAt);
    if (y > 0) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** Longest run of consecutive calendar days in a list of YYYY-MM-DD keys. */
export function longestRun(dayKeys: string[]): number {
  const nums = Array.from(new Set(dayKeys.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map(dayNumber))).sort(
    (a, b) => a - b
  );
  let best = 0;
  let run = 0;
  let prev = Number.NaN;
  for (const n of nums) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  return best;
}

function topCounts(values: string[]): { key: string; count: number }[] {
  const map = new Map<string, { key: string; count: number; first: number }>();
  values.forEach((v, i) => {
    const existing = map.get(v.toLowerCase());
    if (existing) existing.count += 1;
    else map.set(v.toLowerCase(), { key: v, count: 1, first: i });
  });
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .map(({ key, count }) => ({ key, count }));
}

export function computeYearReview(input: {
  year: number | 'all';
  memories: ReviewMemory[];
  letters?: ReviewLetter[];
  activityDays?: string[];
}): YearReviewStats {
  const { year } = input;
  const memories = input.memories
    .filter((m) => inYear(m.date, year))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const places = topCounts(
    memories.map((m) => (m.location || '').trim()).filter((p) => p.length > 0)
  )
    .slice(0, 3)
    .map(({ key, count }) => ({ place: key, count }));

  const monthCounts = new Array(12).fill(0) as number[];
  memories.forEach((m) => {
    const month = Number(m.date.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) monthCounts[month] += 1;
  });
  let busiestMonth: YearReviewStats['busiestMonth'] = null;
  monthCounts.forEach((count, month) => {
    if (count > 0 && (!busiestMonth || count > busiestMonth.count)) busiestMonth = { month, count };
  });

  const moods = topCounts(memories.map((m) => m.mood || '').filter(Boolean));
  const photos = memories.flatMap((m) => (m.photos || []).map((p) => p.url)).filter(Boolean);

  return {
    year,
    memoriesCount: memories.length,
    photosCount: photos.length,
    topPlaces: places,
    busiestMonth,
    favouriteMood: moods[0] ? { mood: moods[0].key, count: moods[0].count } : null,
    longestStreak: longestRun((input.activityDays || []).filter((d) => inYear(d, year))),
    lettersWritten: (input.letters || []).filter((l) => !l.isDraft && inYear(l.createdAt, year)).length,
    firstMemory: memories[0] || null,
    highlightPhotos: photos.slice(0, 6),
  };
}
