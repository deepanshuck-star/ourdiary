// Mood history snapshots + chart series. Pure, import-free logic (node-testable).

export type PartnerKey = 'user_1' | 'user_2';

export interface MoodSnapshot {
  profileId: PartnerKey;
  mood: string;
  updatedAt: string; // ISO
  note?: string;
}

export const MAX_SNAPSHOTS = 800;

/** Chart rows, top to bottom: brighter moods first, heavier ones last. */
export const MOOD_ORDER = ['romantic', 'happy', 'cuddle', 'low_battery', 'hangry', 'stressed'];

/** Add a snapshot unless an identical one (same person + timestamp) is already stored. */
export function addSnapshot(history: MoodSnapshot[], snap: MoodSnapshot): MoodSnapshot[] {
  if (!snap.updatedAt || !snap.mood) return history;
  if (history.some((h) => h.profileId === snap.profileId && h.updatedAt === snap.updatedAt)) return history;
  const next = [...history, snap].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return next.length > MAX_SNAPSHOTS ? next.slice(next.length - MAX_SNAPSHOTS) : next;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shift(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export interface MoodSeriesDay {
  date: string;
  user_1: string | null;
  user_2: string | null;
}

/** One point per day per partner (that day's latest mood), oldest day first. */
export function moodSeries(history: MoodSnapshot[], today: string, days: number): MoodSeriesDay[] {
  const latest: Record<string, { user_1?: MoodSnapshot; user_2?: MoodSnapshot }> = {};
  for (const snap of history) {
    const day = localDay(snap.updatedAt);
    const slot = latest[day] || (latest[day] = {});
    const prev = slot[snap.profileId];
    if (!prev || prev.updatedAt <= snap.updatedAt) slot[snap.profileId] = snap;
  }
  const out: MoodSeriesDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shift(today, -i);
    out.push({
      date,
      user_1: latest[date]?.user_1?.mood ?? null,
      user_2: latest[date]?.user_2?.mood ?? null,
    });
  }
  return out;
}

/** How often each mood appeared for one partner in a series. */
export function moodTally(series: MoodSeriesDay[], who: PartnerKey): { mood: string; count: number }[] {
  const counts = new Map<string, number>();
  series.forEach((d) => {
    const m = d[who];
    if (m) counts.set(m, (counts.get(m) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count);
}
