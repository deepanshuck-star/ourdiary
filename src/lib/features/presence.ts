// Presence and typing helpers for the couple channel. Import-free so
// `node --test` can load it directly — see tests/presence.test.mjs.
//
// Supabase Realtime gives us two primitives on one channel: `presence` (who
// has the app open) and `broadcast` (ephemeral pings nobody needs stored).
// Typing is broadcast, deliberately: a typing flag that outlived the tab that
// set it would leave "typing…" hanging on the other side forever.

/** How long a typing ping stays true without a refresh. */
export const TYPING_TTL_MS = 5_000;
/** How often a still-typing sender re-sends the ping, comfortably inside the TTL. */
export const TYPING_PING_INTERVAL_MS = 2_000;

/** The shape `channel.presenceState()` returns: one key per tracked client. */
export type PresenceStateLike = Record<string, Array<Record<string, unknown>>>;

/**
 * Every distinct user id currently tracked on the channel.
 *
 * One person with the app open on a phone and a laptop appears twice, so the
 * ids are de-duplicated — "online" is about the person, not the tab.
 */
export function onlineUserIds(state: PresenceStateLike | null | undefined): string[] {
  if (!state) return [];
  const ids = new Set<string>();
  for (const entries of Object.values(state)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const id = entry?.userId;
      if (typeof id === 'string' && id) ids.add(id);
    }
  }
  return Array.from(ids);
}

export function isUserOnline(state: PresenceStateLike | null | undefined, userId: string | null): boolean {
  if (!userId) return false;
  return onlineUserIds(state).includes(userId);
}

/** A typing ping is only believed for TYPING_TTL_MS after it was sent. */
export function isTypingNow(
  lastPingAt: number | null | undefined,
  nowMs: number,
  ttl = TYPING_TTL_MS
): boolean {
  if (!lastPingAt) return false;
  // A clock skewed into the future would otherwise pin the indicator on.
  if (lastPingAt > nowMs + ttl) return false;
  return nowMs - lastPingAt < ttl;
}

export type PresenceLabelTone = 'online' | 'recent' | 'offline' | 'unknown';

export interface PresenceLabel {
  tone: PresenceLabelTone;
  text: string;
}

/**
 * What to show under the partner's name.
 *
 * `lastSeenAt` is null when this device has not watched them leave — on a
 * fresh page load we genuinely do not know, and saying "offline" would be a
 * guess dressed as a fact.
 */
export function presenceLabel(
  online: boolean,
  lastSeenAt: number | null,
  nowMs: number
): PresenceLabel {
  if (online) return { tone: 'online', text: 'Online now' };
  if (lastSeenAt === null) return { tone: 'unknown', text: 'Not here right now' };

  const ms = Math.max(0, nowMs - lastSeenAt);
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return { tone: 'recent', text: 'Just left' };
  if (minutes < 60) return { tone: 'recent', text: `Last here ${minutes} min ago` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { tone: 'offline', text: `Last here ${hours}h ago` };
  const days = Math.floor(hours / 24);
  return { tone: 'offline', text: `Last here ${days}d ago` };
}
