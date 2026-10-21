// Pure helpers for the couple chat. No React, no network — see
// tests/chat.test.mjs.

/** Matches the CHECK constraint on chat_messages.content in migration 15. */
export const MAX_MESSAGE_LENGTH = 4000;

export interface ChatMessageLike {
  id: string;
  senderId: string;
  content: string;
  createdAt: string; // ISO
  readAt?: string | null;
}

/** Returns an error message, or null when the message is fine to send. */
export function validateMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Type something first.';
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `That message is too long (max ${MAX_MESSAGE_LENGTH} characters).`;
  }
  return null;
}

export interface ChatDayGroup<T> {
  /** YYYY-MM-DD in the viewer's local timezone. */
  date: string;
  label: string;
  messages: T[];
}

function localISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A human day label: "Today" / "Yesterday" / "Mon, 12 Oct". Grouping uses the
 * viewer's local date, not UTC, so a message sent at 1am doesn't land under
 * the previous day's heading.
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

/**
 * Splits an oldest-first message list into day groups, preserving order.
 * Messages with an unparseable timestamp are kept (under an "Unknown" group)
 * rather than silently dropped — losing a message would be worse than an
 * odd heading.
 */
export function groupMessagesByDay<T extends { createdAt: string }>(
  messages: T[],
  now: Date = new Date()
): ChatDayGroup<T>[] {
  const groups: ChatDayGroup<T>[] = [];
  for (const message of messages) {
    const parsed = new Date(message.createdAt);
    const date = Number.isNaN(parsed.getTime()) ? 'unknown' : localISODate(parsed);
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.messages.push(message);
    } else {
      groups.push({ date, label: dayLabel(message.createdAt, now), messages: [message] });
    }
  }
  return groups;
}

/** "9:41 PM" in the viewer's locale. */
export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** How many of my partner's messages I haven't opened yet. */
export function unreadCount(messages: ChatMessageLike[], myUserId: string | null): number {
  if (!myUserId) return 0;
  return messages.filter((m) => m.senderId !== myUserId && !m.readAt).length;
}

/** Ids of my partner's unread messages — exactly the rows RLS lets me stamp. */
export function unreadIdsToMark(messages: ChatMessageLike[], myUserId: string | null): string[] {
  if (!myUserId) return [];
  return messages.filter((m) => m.senderId !== myUserId && !m.readAt).map((m) => m.id);
}

/**
 * Merges newly arrived messages into the list, de-duplicated by id and kept
 * oldest-first. Realtime can deliver a message this device already inserted
 * optimistically, and can deliver the same row twice after a reconnect.
 */
export function mergeMessages<T extends { id: string; createdAt: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => {
    const diff = a.createdAt.localeCompare(b.createdAt);
    // Two messages can share a timestamp; fall back to id so the order is
    // at least stable across re-renders.
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}
