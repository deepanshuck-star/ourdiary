// Pure helpers for the gifts wardrobe. No React, no network — see
// tests/gifts.test.mjs.

export const MAX_GIFT_TITLE = 200;
export const MAX_GIFT_NOTE = 2000;

export const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Valentine’s',
  'Festival',
  'Just because',
  'Apology',
  'Celebration',
  'Other',
];

export interface GiftLike {
  id: string;
  fromUserId: string;
  toUserId: string;
  title: string;
  givenOn: string | null;
  createdAt: string;
}

/** Returns an error message, or null when the gift is fine to save. */
export function validateGift(title: string, note: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return 'What was the gift?';
  if (trimmed.length > MAX_GIFT_TITLE) return `Keep the name under ${MAX_GIFT_TITLE} characters.`;
  if (note.trim().length > MAX_GIFT_NOTE) return `That note is too long (max ${MAX_GIFT_NOTE} characters).`;
  return null;
}

/**
 * Newest first by the day it was given, falling back to when it was logged
 * — a gift with no date shouldn't jump to the top or disappear to the
 * bottom of the list.
 */
export function sortGifts<T extends GiftLike>(gifts: T[]): T[] {
  return [...gifts].sort((a, b) => {
    const aKey = a.givenOn || a.createdAt.slice(0, 10);
    const bKey = b.givenOn || b.createdAt.slice(0, 10);
    if (aKey !== bKey) return bKey.localeCompare(aKey);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * The same row read from both ends: what I was given, and what I gave.
 * A gift is never in both lists, because a row's giver and receiver differ
 * (enforced by a CHECK constraint in migration 17).
 */
export function splitByDirection<T extends GiftLike>(
  gifts: T[],
  myUserId: string | null
): { received: T[]; given: T[] } {
  const received: T[] = [];
  const given: T[] = [];
  for (const gift of gifts) {
    if (myUserId && gift.toUserId === myUserId) received.push(gift);
    else if (myUserId && gift.fromUserId === myUserId) given.push(gift);
    // A row for neither of us can only mean stale data; leaving it out of
    // both lists is better than showing it under the wrong heading.
  }
  return { received: sortGifts(received), given: sortGifts(given) };
}

/** "12 Oct 2026", or "Date not set". */
export function formatGiftDate(givenOn: string | null | undefined): string {
  if (!givenOn) return 'Date not set';
  // A bare YYYY-MM-DD parses as UTC midnight, which renders as the previous
  // day west of Greenwich — build a local date from the parts instead.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(givenOn);
  if (!match) return 'Date not set';
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface GiftTally {
  received: number;
  given: number;
}

export function tallyGifts(gifts: GiftLike[], myUserId: string | null): GiftTally {
  const split = splitByDirection(gifts, myUserId);
  return { received: split.received.length, given: split.given.length };
}
