// Live reactions: a tap on 😘 floats a kiss up both screens at once.
// Import-free so `node --test` can load it — see tests/reactions.test.mjs.
//
// Reactions travel as Realtime broadcasts, never rows. They are a feeling in
// the moment, not something to keep, so nothing is stored and a reaction sent
// while the other phone is closed is simply missed — the same as a wave
// across an empty room.

/** The only emoji a reaction may carry. Anything else on the wire is dropped. */
export const REACTION_EMOJIS = ['❤️', '😘', '😍', '🥰', '😂', '🔥', '😮', '👏', '🙈', '💋'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** How long a reaction stays on screen, matching the float animation. */
export const REACTION_TTL_MS = 2_600;
/** Minimum gap between two reactions from this device. */
export const REACTION_COOLDOWN_MS = 220;
/** Most reactions on screen at once, so a mashed button can't flood the page. */
export const MAX_ON_SCREEN = 24;

export interface LiveReaction {
  id: string;
  emoji: ReactionEmoji;
  /** The sender's player id. */
  from: string;
  /** When this device received or sent it, for expiry. */
  at: number;
  /** 0–1, where across the screen it rises. Chosen by the sender so both screens match. */
  x: number;
}

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return typeof value === 'string' && (REACTION_EMOJIS as readonly string[]).includes(value);
}

/**
 * A broadcast payload is whatever the other client chose to send. Accept it
 * only when every field has the expected shape; return null otherwise.
 */
export function parseReactionPayload(payload: unknown, receivedAt: number): LiveReaction | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (!isReactionEmoji(p.emoji)) return null;
  if (typeof p.from !== 'string' || !p.from || p.from.length > 64) return null;
  if (typeof p.id !== 'string' || !p.id || p.id.length > 64) return null;
  const x = typeof p.x === 'number' && Number.isFinite(p.x) ? Math.min(1, Math.max(0, p.x)) : 0.5;
  return { id: p.id, emoji: p.emoji, from: p.from, at: receivedAt, x };
}

/** Drops reactions that have finished their float, and keeps the newest MAX_ON_SCREEN. */
export function pruneReactions(list: LiveReaction[], now: number, ttl = REACTION_TTL_MS): LiveReaction[] {
  const alive = list.filter((r) => now - r.at < ttl && r.at <= now + ttl);
  return alive.length > MAX_ON_SCREEN ? alive.slice(alive.length - MAX_ON_SCREEN) : alive;
}

/** True when enough time has passed since this device last sent one. */
export function canSendReaction(lastSentAt: number | null, now: number, cooldown = REACTION_COOLDOWN_MS): boolean {
  return lastSentAt === null || now - lastSentAt >= cooldown;
}
