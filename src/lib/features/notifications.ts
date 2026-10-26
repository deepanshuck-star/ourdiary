// Pure helpers for the notification feed. No React, no network — see
// tests/notifications.test.mjs.

/**
 * The kinds the app raises today. `notifications.kind` is free text in the
 * database on purpose (migration 20), so this list is a hint for writers,
 * never a gate for readers: anything unknown falls back to a default icon
 * and a generic line rather than blowing up the feed.
 */
export const KINDS = [
  'memory',
  'note',
  'photo',
  'event',
  'mood',
  'ping',
  'hug',
  'message',
  'anniversary',
  'gift',
  'habit',
  'letter',
] as const;

export type NotificationKind = (typeof KINDS)[number];

export interface NotificationLike {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  actorId?: string | null;
  readAt?: string | null;
  createdAt: string; // ISO
}

/** Icon key for an unrecognised kind. */
export const DEFAULT_ICON = 'bell';

const ICONS: Record<NotificationKind, string> = {
  memory: 'sparkles',
  note: 'note',
  photo: 'camera',
  event: 'calendar',
  mood: 'pulse',
  ping: 'zap',
  hug: 'hug',
  message: 'message',
  anniversary: 'party',
  gift: 'gift',
  habit: 'habit',
  letter: 'letter',
};

/**
 * Generic lines, used when a row carries no body. `{actor}` is the person
 * who caused it; anniversaries have no actor because the app raises them.
 */
const PHRASES: Record<NotificationKind, string> = {
  memory: '{actor} added a new memory.',
  note: '{actor} left you a note.',
  photo: '{actor} shared a photo.',
  event: '{actor} added something to your calendar.',
  mood: '{actor} updated how they’re feeling.',
  ping: '{actor} is thinking of you.',
  hug: '{actor} sent you a hug.',
  message: '{actor} sent you a message.',
  anniversary: 'A date worth remembering is here.',
  gift: '{actor} added something to the gift wardrobe.',
  habit: '{actor} updated a habit.',
  letter: '{actor} wrote you a letter.',
};

const DEFAULT_PHRASE = '{actor} did something in your space.';
const UNKNOWN_ACTOR = 'Your partner';

export function isKnownKind(kind: string): kind is NotificationKind {
  return (KINDS as readonly string[]).includes(kind);
}

/** A stable icon key per kind; unknown kinds get the bell. */
export function iconFor(kind: string | null | undefined): string {
  if (typeof kind !== 'string') return DEFAULT_ICON;
  const key = kind.trim().toLowerCase();
  return isKnownKind(key) ? ICONS[key] : DEFAULT_ICON;
}

/**
 * The line shown under the title.
 *
 * A stored body wins, because for a chat message that body is the sender's
 * own preview and is the only thing this device is allowed to show. With no
 * body we fall back to a generic sentence for the kind — which is also what
 * an unknown kind gets.
 */
export function describe(notification: NotificationLike, actorName?: string | null): string {
  const body = typeof notification.body === 'string' ? notification.body.trim() : '';
  if (body) return body;

  const kind = typeof notification.kind === 'string' ? notification.kind.trim().toLowerCase() : '';
  const template = isKnownKind(kind) ? PHRASES[kind] : DEFAULT_PHRASE;
  const actor = (actorName || '').trim() || UNKNOWN_ACTOR;
  return template.replace('{actor}', actor);
}

/** How many are still unopened. */
export function unreadCount(list: NotificationLike[]): number {
  if (!Array.isArray(list)) return 0;
  return list.filter((n) => n && !n.readAt).length;
}

/** Ids worth stamping — already-read rows are left alone. */
export function unreadIds(list: NotificationLike[]): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((n) => n && !n.readAt).map((n) => n.id);
}

/** The badge text, or null when there is nothing to show. Capped at "9+". */
export function badgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 9 ? '9+' : String(Math.floor(count));
}

function localISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A human day label: "Today" / "Yesterday" / "Mon, 12 Oct". Same rule as the
 * chat thread — grouped on the viewer's local date, not UTC, so something
 * that arrived at 1am doesn't land under yesterday's heading.
 */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  const date = localISODate(d);
  if (date === localISODate(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === localISODate(yesterday)) return 'Yesterday';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export interface NotificationDayGroup<T> {
  /** YYYY-MM-DD in the viewer's local timezone. */
  date: string;
  label: string;
  items: T[];
}

/**
 * Splits the feed into day groups, preserving the order it was given (the
 * feed is newest-first). Rows with an unparseable timestamp are kept under
 * an "Unknown" heading rather than dropped — a missing notification is
 * worse than an odd heading.
 */
export function groupByDay<T extends { createdAt: string }>(
  list: T[],
  now: Date = new Date()
): NotificationDayGroup<T>[] {
  const groups: NotificationDayGroup<T>[] = [];
  for (const item of list || []) {
    const parsed = new Date(item.createdAt);
    const date = Number.isNaN(parsed.getTime()) ? 'unknown' : localISODate(parsed);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.items.push(item);
    } else {
      groups.push({ date, label: dayLabel(item.createdAt, now), items: [item] });
    }
  }
  return groups;
}

/** "just now" / "12m" / "5h" / "3d" — the compact stamp on a feed row. */
export function relativeTime(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor(Math.max(0, nowMs - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/**
 * Merges arrivals into the list, de-duplicated by id and kept newest-first.
 * Realtime can redeliver a row after a reconnect, and an insert can race the
 * initial fetch.
 */
export function mergeNotifications<T extends { id: string; createdAt: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const n of existing || []) byId.set(n.id, n);
  for (const n of incoming || []) byId.set(n.id, n);
  return Array.from(byId.values()).sort((a, b) => {
    const diff = b.createdAt.localeCompare(a.createdAt);
    // Two rows can share a timestamp; fall back to id so the order is at
    // least stable across re-renders.
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });
}
