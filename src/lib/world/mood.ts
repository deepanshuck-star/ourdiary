// How you feel, and what the world does about it.
//
// Import-free apart from erased type imports, so it loads under node --test.
//
// Three rules from the brief, all enforced here:
//
//   Opt-in. A mood is only ever something you picked. Nothing here reads
//   usage, streaks or silence and decides how you are.
//   Private. The mood lives on your device and changes only your view. The
//   app's mood beacon is the way to SHARE a mood with your partner; this is
//   not that, and never sends anything.
//   Never punishing, never manipulative. A sad day gets a quieter world and
//   no forced cheer; "missing you" gets a way to your letters, not a nudge.

import type { DayPhase } from './world';

export const WORLD_MOODS = ['none', 'happy', 'peaceful', 'excited', 'missing', 'tired', 'sad', 'space'] as const;
export type WorldMood = (typeof WORLD_MOODS)[number];

export const MOOD_LABEL: Record<WorldMood, string> = {
  none: 'Just here',
  happy: 'Happy',
  peaceful: 'Peaceful',
  excited: 'Excited',
  missing: 'Missing you',
  tired: 'Tired',
  sad: 'Sad',
  space: 'Need some space',
};

export interface MoodAmbience {
  /** Suggested light. Only used when the time of day is on Auto. */
  phaseHint: DayPhase | null;
  /** Multiplies how many creatures are about. */
  lifeScale: number;
  /** Multiplies animation speed: below 1 is slower and calmer. */
  pace: number;
  /** Small lift or dip in overall light, -0.1 to 0.1. */
  brightness: number;
  /** Replaces the rotating greeting line when set. */
  line: string | null;
  /** A gentle way somewhere useful, never a demand. */
  shortcut: { label: string; href: string } | null;
}

const NEUTRAL: MoodAmbience = { phaseHint: null, lifeScale: 1, pace: 1, brightness: 0, line: null, shortcut: null };

const AMBIENCE: Record<WorldMood, MoodAmbience> = {
  none: NEUTRAL,
  happy: { ...NEUTRAL, lifeScale: 1.25, brightness: 0.05, line: 'Aaj duniya bhi thodi khush lag rahi hai.' },
  peaceful: { ...NEUTRAL, lifeScale: 0.8, pace: 0.75, line: 'Sab shaant hai. Saans lo, aaram se.' },
  excited: { ...NEUTRAL, lifeScale: 1.4, pace: 1.2, brightness: 0.08, line: 'Hawa mein kuch khushi si hai.' },
  missing: {
    ...NEUTRAL,
    phaseHint: 'evening',
    pace: 0.85,
    line: 'Doori hai, par yeh duniya tum dono ki hai. Purane khat yahan rakhe hain.',
    shortcut: { label: 'Read your letters', href: '/world/starlight' },
  },
  tired: { ...NEUTRAL, phaseHint: 'evening', lifeScale: 0.6, pace: 0.6, line: 'Thak gaye ho toh ruk jao. Duniya intezaar kar legi.' },
  sad: { ...NEUTRAL, lifeScale: 0.5, pace: 0.7, brightness: -0.04, line: 'Koi baat nahi. Yahan jitni der chaho, baith sakte ho.' },
  space: { ...NEUTRAL, lifeScale: 0.4, pace: 0.6, line: 'Thodi shaanti. Yahan koi kuch nahi poochhega.' },
};

export function ambienceFor(mood: WorldMood, enabled: boolean): MoodAmbience {
  return enabled ? AMBIENCE[mood] ?? NEUTRAL : NEUTRAL;
}

export function isWorldMood(value: unknown): value is WorldMood {
  return typeof value === 'string' && (WORLD_MOODS as readonly string[]).includes(value);
}

/** Creature counts, scaled and rounded, never negative. */
export function scaleLife(count: number, scale: number): number {
  return Math.max(0, Math.round(count * scale));
}
