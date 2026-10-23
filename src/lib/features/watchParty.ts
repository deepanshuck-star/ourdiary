// Starting a show at the same moment. Import-free so `node --test` can load
// it directly — see tests/watch-party.test.mjs.
//
// You cannot control Netflix from here, so drift after the first minute is
// not solvable and this does not pretend to solve it. The bit that actually
// ruins a shared film is the start: one of you presses play, says "go", the
// other presses eleven seconds later, and you spend the evening a scene
// apart. So: one presses ready, the other confirms, both screens count down
// from the same instant and hit zero together.
//
// Both devices read the same `startAt` (epoch ms), which assumes their clocks
// agree to within a second or so — true of any phone with network time. The
// lead-in below also exists for this reason: it gives the row time to reach
// the other device before the count starts, so nobody's countdown begins late.

/**
 * How long after the second "ready" the show begins.
 *
 * Long enough for the Realtime update to land on the other device and for a
 * thumb to reach the play button; short enough not to feel like waiting.
 */
export const READY_LEAD_MS = 5_000;

/** How long after zero the card still says "press play" rather than "that's gone". */
export const LIVE_GRACE_MS = 3 * 60 * 60_000;

export interface WatchPartyState {
  title: string;
  /** Player ids who have pressed ready. */
  ready: string[];
  /** Epoch ms at which both should press play; null until both are ready. */
  startAt: number | null;
  startedBy: string;
  /** Epoch ms of the last change, for display only. */
  updatedAt: number;
  [key: string]: unknown;
}

export type WatchPhase =
  /** Nothing set up. */
  | 'idle'
  /** Someone is waiting on the other person to say they're ready. */
  | 'waiting'
  /** Both ready, counting down. */
  | 'counting'
  /** Zero has passed — press play. */
  | 'playing'
  /** Long past; the card is stale. */
  | 'over';

export function createWatchParty(title: string, byId: string, nowMs: number): WatchPartyState {
  return {
    title: title.trim() || 'Movie night',
    // Setting one up is itself a statement that you're ready.
    ready: [byId],
    startAt: null,
    startedBy: byId,
    updatedAt: nowMs,
  };
}

export function isReady(state: WatchPartyState | null, userId: string | null): boolean {
  if (!state || !userId) return false;
  return state.ready.includes(userId);
}

/**
 * Flips one person's ready flag.
 *
 * The moment both are ready the clock is set, and it is set once: a third
 * press (someone un-readying and re-readying) must not slide the start time
 * out from under the other person, who may already be watching the count.
 */
export function toggleReady(
  state: WatchPartyState,
  userId: string,
  bothIds: Array<string | null>,
  nowMs: number
): WatchPartyState {
  const already = state.ready.includes(userId);
  const ready = already ? state.ready.filter((id) => id !== userId) : [...state.ready, userId];

  const participants = bothIds.filter((id): id is string => Boolean(id));
  const everyone = participants.length > 0 && participants.every((id) => ready.includes(id));

  let startAt = state.startAt;
  if (!everyone) {
    // Backing out before zero cancels the count; after zero it is too late to
    // matter and the start stands.
    if (startAt !== null && startAt > nowMs) startAt = null;
  } else if (startAt === null) {
    startAt = nowMs + READY_LEAD_MS;
  }

  return { ...state, ready, startAt, updatedAt: nowMs };
}

export function watchPhase(state: WatchPartyState | null, nowMs: number): WatchPhase {
  if (!state) return 'idle';
  if (state.startAt === null) return 'waiting';
  const sinceStart = nowMs - state.startAt;
  if (sinceStart < 0) return 'counting';
  if (sinceStart < LIVE_GRACE_MS) return 'playing';
  return 'over';
}

/**
 * The big number on screen: 5, 4, 3, 2, 1, then 0.
 *
 * Rounded up, so the instant the count begins it reads 5 rather than
 * flickering through it, and it reaches 0 exactly at `startAt`.
 */
export function countdownSeconds(state: WatchPartyState | null, nowMs: number): number {
  if (!state || state.startAt === null) return 0;
  return Math.max(0, Math.ceil((state.startAt - nowMs) / 1000));
}

/** Who we are still waiting on, for "waiting for Ritesh to be ready". */
export function waitingOn(
  state: WatchPartyState | null,
  bothIds: Array<string | null>
): string[] {
  if (!state) return [];
  return bothIds.filter((id): id is string => Boolean(id) && !state.ready.includes(id as string));
}
