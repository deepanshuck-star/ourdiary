// The "good morning" handoff: what to show the one of you who is awake while
// the other is asleep. Import-free so `node --test` can load it directly —
// see tests/handoff.test.mjs.
//
// The app already knew who was asleep (isProbablyAsleep) and did nothing with
// it. The gap between two time zones is the one thing a long-distance app can
// actually soften, and the moment that matters is waking into their night:
// they are unreachable for hours, and the last thing they said is the only
// thing you have. This builds that card.
//
// Everything here takes `nowMs` and the two sleep states as arguments — no
// clock reads, no time-zone lookups — so a night eight time zones away is a
// test, not a thing you have to stay up to see.

/** Inside this window before their alarm, "asleep" becomes "waking soon". */
export const WAKING_SOON_MS = 90 * 60_000;

export interface HandoffMessage {
  id: string;
  content: string;
  /** ISO instant. */
  createdAt: string;
}

export interface HandoffInput {
  nowMs: number;
  partnerName: string;
  /** Am I awake? There is no handoff to make if we are both asleep. */
  iAmAwake: boolean;
  partnerAsleep: boolean;
  /** Epoch ms of their next morning. */
  partnerNextWakeUtc: number;
  /** The most recent thing they sent, whenever that was. */
  lastPartnerMessage?: HandoffMessage | null;
}

export interface HandoffCard {
  reason: 'asleep' | 'waking-soon';
  headline: string;
  detail: string;
  /** The last thing they said before going quiet, if they said anything. */
  lastWord: HandoffMessage | null;
  msUntilTheyWake: number;
  /**
   * Stable for one night and different the next, so "dismiss" means "not
   * again tonight" rather than "never show me this again".
   */
  dismissKey: string;
}

/**
 * "2h 40m" / "40m" / "any moment" — short enough to sit inside a sentence.
 *
 * Floored, not rounded: this counts time remaining, and "1h" that is really
 * 50 minutes would have the morning arrive late.
 */
export function formatGap(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return 'any moment';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** "5 hours ago" / "20 minutes ago" — for when they last said something. */
export function formatAgo(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/**
 * The card, or null when there is nothing worth saying: you're both up,
 * you're both asleep, or they're awake and can simply be messaged.
 */
export function buildHandoff(input: HandoffInput): HandoffCard | null {
  const { nowMs, partnerName, iAmAwake, partnerAsleep, partnerNextWakeUtc } = input;
  if (!iAmAwake || !partnerAsleep) return null;

  const msUntilTheyWake = Math.max(0, partnerNextWakeUtc - nowMs);
  const soon = msUntilTheyWake <= WAKING_SOON_MS;

  const lastWord = normalizeLastWord(input.lastPartnerMessage, nowMs);

  const quietFor = lastWord ? formatAgo(nowMs - Date.parse(lastWord.createdAt)) : null;
  const wakeIn = formatGap(msUntilTheyWake);

  return {
    reason: soon ? 'waking-soon' : 'asleep',
    headline: soon ? `${partnerName} is about to wake up` : `${partnerName} is asleep right now`,
    detail: soon
      ? `Their morning starts in ${wakeIn}. Leave something for them to open.`
      : quietFor
        ? `They went quiet ${quietFor}. Morning for them in ${wakeIn}.`
        : `Morning for them in ${wakeIn}.`,
    lastWord,
    msUntilTheyWake,
    // Keyed to the morning it belongs to: once that instant passes, the next
    // card gets a new key and shows again.
    dismissKey: `handoff:${partnerNextWakeUtc}`,
  };
}

/**
 * A message is only "the last thing they said before bed" if they actually
 * said it recently. A line from three weeks ago surfaced as tonight's parting
 * word would be a small lie, so anything older than a day is dropped.
 */
const LAST_WORD_MAX_AGE_MS = 24 * 60 * 60_000;

function normalizeLastWord(message: HandoffMessage | null | undefined, nowMs: number): HandoffMessage | null {
  if (!message || !message.content.trim()) return null;
  const sentAt = Date.parse(message.createdAt);
  if (!Number.isFinite(sentAt)) return null;
  if (sentAt > nowMs + 60_000) return null; // a clock ahead of ours
  if (nowMs - sentAt > LAST_WORD_MAX_AGE_MS) return null;
  return message;
}
