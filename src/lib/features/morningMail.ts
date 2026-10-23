// "Deliver when they wake" — a note written into the other person's night
// that stays sealed until their morning. Import-free so `node --test` can
// load it directly; see tests/morning-mail.test.mjs.
//
// HOW DELIVERY ACTUALLY WORKS, because the honest version matters here:
// there is no background job in this app. A queued note is stored with the
// instant it is due, and the RECIPIENT'S app reveals it at or after that
// instant — which is the only moment it could be read anyway. What this does
// NOT do is keep the text away from a determined reader before then: it lives
// in the same shared row as everything else in the space. It is a sealed
// envelope on the kitchen table, not a safe. The UI says so too.

export const MAX_NOTE_LENGTH = 2000;

export interface MorningNote {
  id: string;
  /** Real auth user id in a live space, profile slot in demo mode. */
  fromId: string;
  toId: string;
  content: string;
  createdAt: string; // ISO
  /** The instant it becomes readable — their next morning. */
  deliverAt: string; // ISO
  openedAt?: string; // ISO
}

export function validateNote(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Write something first.';
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return `That note is too long (max ${MAX_NOTE_LENGTH} characters).`;
  }
  return null;
}

export function isDue(note: MorningNote, nowMs: number): boolean {
  const at = Date.parse(note.deliverAt);
  // An unparseable due date would otherwise seal the note forever; treat it
  // as already due rather than losing it.
  return !Number.isFinite(at) || at <= nowMs;
}

export interface MailboxView {
  /** Due notes addressed to me, newest first. */
  arrived: MorningNote[];
  /** Due and still unopened — what the dashboard badge counts. */
  unopened: MorningNote[];
  /** Notes I sent that have not landed yet, soonest first. */
  queued: MorningNote[];
  /** Notes I sent that have landed, newest first. */
  delivered: MorningNote[];
}

/**
 * Splits the shared pile into the four lists one person can see.
 *
 * Notes addressed to me that are not due yet appear in none of them — that
 * is the whole feature.
 */
export function mailboxFor(notes: MorningNote[], myId: string | null, nowMs: number): MailboxView {
  const empty: MailboxView = { arrived: [], unopened: [], queued: [], delivered: [] };
  if (!myId) return empty;

  const newestFirst = (a: MorningNote, b: MorningNote) => b.createdAt.localeCompare(a.createdAt);
  const soonestFirst = (a: MorningNote, b: MorningNote) => a.deliverAt.localeCompare(b.deliverAt);

  const arrived = notes.filter((n) => n.toId === myId && isDue(n, nowMs)).sort(newestFirst);
  const mine = notes.filter((n) => n.fromId === myId);

  return {
    arrived,
    unopened: arrived.filter((n) => !n.openedAt),
    queued: mine.filter((n) => !isDue(n, nowMs)).sort(soonestFirst),
    delivered: mine.filter((n) => isDue(n, nowMs)).sort(newestFirst),
  };
}

/**
 * When a note written now should land.
 *
 * If they are already awake there is nothing to wait for — it lands straight
 * away rather than being held until tomorrow morning, which would be a
 * strange thing to do to a message sent at lunchtime.
 */
export function deliveryInstant(nowMs: number, partnerAsleep: boolean, partnerNextWakeUtc: number): number {
  if (!partnerAsleep) return nowMs;
  return Math.max(nowMs, partnerNextWakeUtc);
}

export function markOpened(notes: MorningNote[], ids: string[], nowISO: string): MorningNote[] {
  if (ids.length === 0) return notes;
  const set = new Set(ids);
  return notes.map((n) => (set.has(n.id) && !n.openedAt ? { ...n, openedAt: nowISO } : n));
}

/**
 * Drops notes that landed long ago so the shared blob does not grow without
 * limit — it is one JSON row, not a table.
 */
export function pruneNotes(notes: MorningNote[], nowMs: number, keepDays = 30): MorningNote[] {
  const cutoff = nowMs - keepDays * 86_400_000;
  return notes.filter((n) => {
    if (!isDue(n, nowMs)) return true;
    const at = Date.parse(n.deliverAt);
    return !Number.isFinite(at) || at >= cutoff;
  });
}
