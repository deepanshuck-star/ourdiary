// The Barsaat film: a short, looping rain story drawn in ink on old paper.
//
// Import-free so tests/barsaat.test.mjs can load it directly. Everything the
// film decides — which scene plays for how long, when each word lands, where
// each raindrop starts — lives here, and the component only draws it.

export type SceneId = 'title' | 'umbrella' | 'city' | 'window' | 'together';

export interface Scene {
  id: SceneId;
  /** How long the scene holds before the next one fades in, in ms. */
  duration: number;
  /** Lines that write themselves in, word by word. Empty for a picture-only scene. */
  lines: string[];
}

// Original lines, written for this diary — not lyrics from any song.
export const SCENES: Scene[] = [
  { id: 'title', duration: 7000, lines: [] },
  { id: 'umbrella', duration: 8000, lines: ['एक छतरी, दो दिल'] },
  { id: 'city', duration: 9000, lines: ['बूँदों में लिखी है', 'हमारी कहानी'] },
  { id: 'window', duration: 9000, lines: ['भीगे काग़ज़ पे', 'तेरा नाम लिखा है'] },
  { id: 'together', duration: 9000, lines: ['चल, इस बारिश में', 'साथ भीगें'] },
];

/** How long one scene takes to fade into the next, in ms. */
export const CROSSFADE_MS = 1400;

export function nextSceneIndex(index: number, count: number = SCENES.length): number {
  if (count <= 0) return 0;
  return (((index + 1) % count) + count) % count;
}

export function previousSceneIndex(index: number, count: number = SCENES.length): number {
  if (count <= 0) return 0;
  return (((index - 1) % count) + count) % count;
}

export interface TimedWord {
  text: string;
  /** Which line it belongs to. */
  line: number;
  /** When it starts to bleed into the paper, in ms after the scene begins. */
  delay: number;
}

/**
 * Splits lines into words and gives each one its moment.
 *
 * Words, not letters: Devanagari joins letters into conjuncts and hangs
 * vowel signs off them, and cutting a word into separately animated pieces
 * can break that shaping. A whole word always renders correctly.
 *
 * A line break holds a beat longer than the gap between words, the way a
 * singer breathes before the next line.
 */
export function timeWords(
  lines: string[],
  { start = 900, perWord = 420, lineBreath = 650 }: { start?: number; perWord?: number; lineBreath?: number } = {}
): TimedWord[] {
  const out: TimedWord[] = [];
  let t = start;
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) t += lineBreath;
    const words = line.split(/\s+/).filter(Boolean);
    for (const word of words) {
      out.push({ text: word, line: lineIndex, delay: t });
      t += perWord;
    }
  });
  return out;
}

/** A small seeded random, so the rain falls the same way on both phones. */
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

export interface RainStreak {
  x: number;
  y: number;
  length: number;
  /** Pixels per second, straight down; the slant is applied when drawn. */
  speed: number;
  alpha: number;
  width: number;
}

/** How far a streak drifts sideways for each pixel it falls. */
export const RAIN_SLANT = 0.16;

/**
 * Sparse, thin streaks, like pencil marks on the paper rather than a storm.
 * One streak per ~22,000 px², never fewer than 24, never more than 160.
 */
export function rainCount(width: number, height: number): number {
  const area = Math.max(0, width) * Math.max(0, height);
  return Math.min(160, Math.max(24, Math.round(area / 22000)));
}

export function makeRain(width: number, height: number, seed = 7): RainStreak[] {
  const random = seededRandom(seed);
  const count = rainCount(width, height);
  const streaks: RainStreak[] = [];
  for (let i = 0; i < count; i++) {
    const near = random();
    streaks.push({
      // Start a little left of the screen too, since the slant carries
      // streaks to the right as they fall.
      x: random() * (width + height * RAIN_SLANT) - height * RAIN_SLANT,
      y: random() * height,
      length: 14 + near * 30,
      speed: 260 + near * 420,
      alpha: 0.1 + near * 0.26,
      width: 0.8 + near * 1.3,
    });
  }
  return streaks;
}

/** Moves a streak on by `dt` seconds, wrapping it back above the top. */
export function advanceStreak(s: RainStreak, dt: number, width: number, height: number): RainStreak {
  const fall = s.speed * dt;
  let x = s.x + fall * RAIN_SLANT;
  let y = s.y + fall;
  if (y - s.length > height) {
    y -= height + s.length * 2;
    x -= (height + s.length * 2) * RAIN_SLANT;
  }
  if (x > width + 40) x -= width + 80;
  return { ...s, x, y };
}
