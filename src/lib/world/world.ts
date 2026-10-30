// The rules of the little world: what time it is there, what season, what
// weather, who is about, and which real things from the diary show up in it.
//
// Import-free and renderer-agnostic. The prototype draws with SVG, but none
// of these decisions belong to SVG — a later 3D version should be able to
// sit on exactly this module. It is also what lets the rules be tested
// (tests/world.test.mjs) without a browser.
//
// Two principles run through everything here:
//
//   The world never pretends. Ambient life — birds, a sleeping dog, a train
//   in the valley — is scenery, and is drawn as scenery. Anything that
//   suggests the PARTNER did something (a letter in the mailbox, them being
//   here right now) is only ever derived from real data.
//
//   The world never punishes. Memories and finished dreams add to it; a
//   quiet month removes nothing.

export type DayPhase = 'morning' | 'afternoon' | 'evening' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow' | 'windy';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Hemisphere = 'north' | 'south';

export const DAY_PHASES: DayPhase[] = ['morning', 'afternoon', 'evening', 'night'];
export const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'fog', 'snow', 'windy'];
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

// --------------------------------------------------------------- time ---

/**
 * Local hour to a phase of the day. Evening is short on purpose — it is the
 * golden hour, and stretching it would make it ordinary.
 */
export function phaseForHour(hour: number): DayPhase {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

/** Meteorological seasons, flipped for the southern hemisphere. */
export function seasonForMonth(month0: number, hemisphere: Hemisphere = 'north'): Season {
  const m = ((Math.floor(month0) % 12) + 12) % 12;
  const shifted = hemisphere === 'south' ? (m + 6) % 12 : m;
  if (shifted >= 2 && shifted <= 4) return 'spring';
  if (shifted >= 5 && shifted <= 7) return 'summer';
  if (shifted >= 8 && shifted <= 10) return 'autumn';
  return 'winter';
}

export type Override<T> = 'auto' | T;

export function resolvePhase(override: Override<DayPhase>, hour: number): DayPhase {
  return override === 'auto' ? phaseForHour(hour) : override;
}

export function resolveSeason(override: Override<Season>, month0: number, hemisphere: Hemisphere = 'north'): Season {
  return override === 'auto' ? seasonForMonth(month0, hemisphere) : override;
}

// -------------------------------------------------------- deterministic ---

/**
 * A string to a 32-bit seed. Used so the world's "random" details — where a
 * butterfly is, which greeting you get — are stable for a couple on a given
 * day, rather than reshuffling on every render (which React's purity rule
 * forbids anyway, and which would flicker).
 */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for scattering fireflies. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Scatter {
  x: number;
  y: number;
  /** Animation duration in seconds — every creature on its own clock. */
  duration: number;
  /** Negative delay so the loop starts mid-flight, never in formation. */
  delay: number;
  scale: number;
}

/**
 * Bounded randomness: `count` points inside a box, each with its own timing.
 * The brief asks for "randomized but bounded" so nothing moves in lockstep;
 * seeding it keeps that true without the scene changing under the viewer.
 */
export function scatter(
  seed: number,
  count: number,
  box: { x: number; y: number; w: number; h: number },
  timing: { min: number; max: number } = { min: 6, max: 14 }
): Scatter[] {
  const rand = seededRandom(seed);
  const out: Scatter[] = [];
  for (let i = 0; i < count; i += 1) {
    const duration = timing.min + rand() * (timing.max - timing.min);
    out.push({
      x: Math.round(box.x + rand() * box.w),
      y: Math.round(box.y + rand() * box.h),
      duration: Math.round(duration * 10) / 10,
      delay: -Math.round(rand() * duration * 10) / 10,
      scale: Math.round((0.7 + rand() * 0.5) * 100) / 100,
    });
  }
  return out;
}

// ----------------------------------------------------------- what lives ---

export interface WorldLife {
  sun: boolean;
  moon: boolean;
  stars: boolean;
  birds: number;
  butterflies: number;
  fireflies: number;
  ducks: boolean;
  flowers: boolean;
  windowLights: boolean;
  lampLit: boolean;
  /** 0 = barely a wisp, 1 = a proper winter fire. */
  chimneySmoke: number;
  fallingLeaves: boolean;
  snowOnRoofs: boolean;
}

/**
 * Which creatures and lights belong in the scene right now. Curated, as the
 * brief asks — not every species everywhere, and nothing out of its hour:
 * no butterflies in the rain, no fireflies at noon.
 */
export function lifeFor(phase: DayPhase, season: Season, weather: Weather): WorldLife {
  const daylight = phase === 'morning' || phase === 'afternoon';
  const wet = weather === 'rain' || weather === 'snow';
  const clearSky = weather === 'clear' || weather === 'windy';
  const dark = phase === 'night';
  const dusk = phase === 'evening';

  return {
    sun: !dark && weather !== 'fog' && weather !== 'rain' && weather !== 'snow',
    moon: dark && weather !== 'fog',
    stars: dark && clearSky,
    birds: daylight && !wet && weather !== 'fog' ? (phase === 'morning' ? 4 : 3) : dusk && !wet ? 2 : 0,
    butterflies: daylight && !wet && weather !== 'windy' && (season === 'spring' || season === 'summer') ? 3 : 0,
    fireflies: (dark || (dusk && season === 'summer')) && !wet && season !== 'winter' ? 7 : 0,
    ducks: !dark && season !== 'winter' && weather !== 'snow',
    flowers: season === 'spring' || season === 'summer',
    windowLights: dark || dusk || weather === 'rain' || weather === 'fog',
    lampLit: dark || dusk || weather === 'fog',
    chimneySmoke: season === 'winter' ? 1 : dark || dusk ? 0.6 : 0.25,
    fallingLeaves: season === 'autumn' && !wet,
    snowOnRoofs: season === 'winter' || weather === 'snow',
  };
}

// -------------------------------------------------------------- palette ---

export interface PhaseLight {
  skyTop: string;
  skyBottom: string;
  /** Multiplied over the whole landscape to relight it. */
  tint: string;
  tintOpacity: number;
  /** Sun or moon height in the sky, 0 = horizon, 1 = high. */
  lightHeight: number;
}

// Built around the brief's palette — sky blue #A8CAD7, sunlight gold
// #E9C785, warm night #252A30 — rather than generic game blues.
export const PHASE_LIGHT: Record<DayPhase, PhaseLight> = {
  morning: { skyTop: '#A8CAD7', skyBottom: '#F3E2C0', tint: '#E9C785', tintOpacity: 0.12, lightHeight: 0.45 },
  afternoon: { skyTop: '#8DB8CB', skyBottom: '#D9EAEF', tint: '#FFFFFF', tintOpacity: 0, lightHeight: 0.85 },
  evening: { skyTop: '#6E7FA0', skyBottom: '#E9B07A', tint: '#C46F57', tintOpacity: 0.22, lightHeight: 0.12 },
  night: { skyTop: '#1B1F26', skyBottom: '#33404F', tint: '#252A30', tintOpacity: 0.55, lightHeight: 0.7 },
};

export const SEASON_FOLIAGE: Record<Season, { canopy: string; canopyLight: string; grass: string; accent: string }> = {
  spring: { canopy: '#6F9A6B', canopyLight: '#9DBF8F', grass: '#8FB47F', accent: '#E8B4B8' },
  summer: { canopy: '#56775C', canopyLight: '#7FA176', grass: '#7EA56C', accent: '#E9C785' },
  autumn: { canopy: '#B5733F', canopyLight: '#D9A05B', grass: '#A9A36A', accent: '#C46F57' },
  winter: { canopy: '#6E7C78', canopyLight: '#A5B2AE', grass: '#C9D3CF', accent: '#FDFBF7' },
};

/** Weather darkens or mists the sky without touching the phase logic. */
export function weatherVeil(weather: Weather): { color: string; opacity: number } {
  switch (weather) {
    case 'cloudy':
      return { color: '#8E98A0', opacity: 0.18 };
    case 'rain':
      return { color: '#5E6A75', opacity: 0.32 };
    case 'fog':
      return { color: '#DDE3E4', opacity: 0.38 };
    case 'snow':
      return { color: '#E7ECEF', opacity: 0.2 };
    default:
      return { color: '#FFFFFF', opacity: 0 };
  }
}

// ------------------------------------------------------------ greetings ---

const GREETING_TITLE: Record<DayPhase, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
};

// Hinglish, as the brief's own example is. Each line describes the WORLD,
// never the partner — "it's raining here", not "she's thinking of you".
const GREETING_LINES: Record<DayPhase, string[]> = {
  morning: [
    'Bahar halki hawa chal rahi hai, aur tumhari chhoti si duniya ek naye din ke liye taiyaar hai.',
    'Panchhi jaag gaye hain. Aaj ka din tum dono ka hai.',
    'Subah ki dhoop ghar ki khidki tak aa gayi hai.',
  ],
  afternoon: [
    'Badal dheere dheere chal rahe hain, nadi apni raah par hai.',
    'Dopahar shaant hai. Thodi der yahan baith jao.',
    'Duniya apni raftaar mein hai — koi jaldi nahi.',
  ],
  evening: [
    'Suraj dhal raha hai, aur ghar ki batti jal gayi hai.',
    'Shaam ki sunehri roshni pahadon par ruki hui hai.',
    'Panchhi ghar laut rahe hain.',
  ],
  night: [
    'Taare nikal aaye hain. Duniya so rahi hai, ghar abhi bhi roshan hai.',
    'Raat shaant hai, aur jugnu bench ke paas hain.',
    'Chaand nikal aaya hai. Aaram se.',
  ],
};

const WEATHER_LINES: Partial<Record<Weather, string>> = {
  rain: 'Baarish ho rahi hai — ghar ke andar chai ka mausam hai.',
  fog: 'Halka kohra hai. Duniya thodi dhundhli, thodi pyaari.',
  snow: 'Barf gir rahi hai. Chimney se dhuan uth raha hai.',
  windy: 'Aaj hawa tez hai — ghaas aur pedon ko dekho.',
};

export function greetingFor(
  name: string,
  phase: DayPhase,
  weather: Weather,
  daySeed: number
): { title: string; line: string } {
  const weatherLine = WEATHER_LINES[weather];
  const lines = GREETING_LINES[phase];
  const line = weatherLine ?? lines[daySeed % lines.length];
  const who = name.trim();
  return { title: who ? `${GREETING_TITLE[phase]}, ${who} ♡` : `${GREETING_TITLE[phase]} ♡`, line };
}

// ------------------------------------------------- real data in the world ---

export interface LetterLike {
  toId: string;
  unlockDate: string;
  isDraft: boolean;
  readAt?: string;
}

/**
 * Letters waiting in the mailbox: addressed to me, sent rather than drafted,
 * past their unlock date, and not yet read. Only these raise the envelope —
 * a mailbox that looked full when nothing was there would be a small lie.
 */
export function lettersWaiting(letters: LetterLike[], me: string, todayIso: string): number {
  return letters.filter(
    (letter) => !letter.isDraft && letter.toId === me && letter.unlockDate <= todayIso && !letter.readAt
  ).length;
}

/** Finished dreams become flags on the far hills — up to five, then it stays full. */
export function dreamFlags(items: { completed: boolean }[]): number {
  return Math.min(5, items.filter((item) => item.completed).length);
}

/**
 * Saplings on the hill, one per memory up to six. Grows, never shrinks:
 * deleting nothing and doing nothing for a month leaves the hill as it was.
 */
export function memorySaplings(memoryCount: number): number {
  return Math.max(0, Math.min(6, Math.floor(memoryCount)));
}

// --------------------------------------------------------------- places ---

export interface WorldPlace {
  id: string;
  label: string;
  /** What tapping it does, for the accessible list and the tooltip. */
  description: string;
  href: string;
}

/** Every interactive object leads somewhere real. */
export const WORLD_PLACES: WorldPlace[] = [
  { id: 'window', label: 'The house', description: "Today's question", href: '/daily-spark' },
  { id: 'mailbox', label: 'Mailbox', description: 'Your letters', href: '/letters' },
  { id: 'frames', label: 'Photo frames', description: 'Your memories', href: '/memories' },
  { id: 'bench', label: 'The bench', description: 'Talk to each other', href: '/chat' },
  { id: 'train', label: 'The train', description: 'Your journey', href: '/journey' },
  { id: 'hills', label: 'Far hills', description: 'Dreams and plans', href: '/bucket-list' },
  { id: 'calendar', label: 'Calendar', description: 'Dates that matter', href: '/calendar' },
];
