// Pure, import-free helpers for the 3D / tactile UI effects (tilt cards, scratch cards,
// envelope timeline). Kept framework-free so they can be unit-tested with plain Node.

export interface TiltRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TiltState {
  /** rotateX in degrees (positive tips the top edge away from the viewer). */
  rx: number;
  /** rotateY in degrees (positive turns the right edge away from the viewer). */
  ry: number;
  /** Glare highlight position, 0–100 (%). */
  gx: number;
  gy: number;
}

export const NEUTRAL_TILT: TiltState = { rx: 0, ry: 0, gx: 50, gy: 50 };

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round2(n: number): number {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r; // normalise -0
}

/** Tilt for a pointer at (x, y) over `rect`; the card leans toward the pointer. */
export function tiltFromPointer(x: number, y: number, rect: TiltRect, maxDeg: number): TiltState {
  if (!(rect.width > 0) || !(rect.height > 0) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NEUTRAL_TILT;
  }
  const nx = clamp((x - rect.left) / rect.width, 0, 1);
  const ny = clamp((y - rect.top) / rect.height, 0, 1);
  const max = Math.abs(maxDeg);
  return {
    rx: round2((0.5 - ny) * 2 * max),
    ry: round2((nx - 0.5) * 2 * max),
    gx: round2(nx * 100),
    gy: round2(ny * 100),
  };
}

/**
 * Tilt from DeviceOrientation angles. `beta` is front/back (phones are usually held
 * around 45°), `gamma` is left/right. Returns null for missing / non-finite readings.
 */
export function tiltFromOrientation(
  beta: number | null | undefined,
  gamma: number | null | undefined,
  maxDeg: number,
  restingBeta = 45
): TiltState | null {
  if (typeof beta !== 'number' || typeof gamma !== 'number') return null;
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const max = Math.abs(maxDeg);
  const fx = clamp(gamma / 30, -1, 1);
  const fy = clamp((beta - restingBeta) / 30, -1, 1);
  return {
    rx: round2(-fy * max),
    ry: round2(fx * max),
    gx: round2(50 + fx * 50),
    gy: round2(50 + fy * 50),
  };
}

/**
 * Fraction (0–1) of sampled pixels whose alpha is below `alphaThreshold`, i.e. how much
 * of a scratch-off layer has been cleared. `data` is RGBA (ImageData.data layout).
 * Samples every `step`-th pixel in both directions to keep it cheap.
 */
export function clearedFraction(
  data: ArrayLike<number>,
  width: number,
  height: number,
  step = 4,
  alphaThreshold = 128
): number {
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w <= 0 || h <= 0 || data.length < w * h * 4) return 0;
  const s = Math.max(1, Math.floor(step));
  let total = 0;
  let cleared = 0;
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      total += 1;
      if (data[(y * w + x) * 4 + 3] < alphaThreshold) cleared += 1;
    }
  }
  return total === 0 ? 0 : cleared / total;
}

export const SCRATCH_REVEAL_THRESHOLD = 0.55;

export function shouldRevealScratch(fraction: number, threshold = SCRATCH_REVEAL_THRESHOLD): boolean {
  return Number.isFinite(fraction) && fraction >= threshold;
}

/** Adds an id to a "seen" list without duplicates; returns the same array if unchanged. */
export function addUniqueId(list: readonly string[] | null | undefined, id: string): string[] {
  const base = Array.isArray(list) ? list : [];
  if (base.includes(id)) return base as string[];
  return [...base, id];
}

export type EnvelopePhase = 'closed' | 'crack' | 'flap' | 'slide' | 'done';

export interface EnvelopeStep {
  phase: EnvelopePhase;
  /** ms after mount at which this phase begins. */
  at: number;
}

/** Timeline for the envelope opening; each stage stays within ~400ms. */
export function envelopeTimeline(reducedMotion: boolean): EnvelopeStep[] {
  if (reducedMotion) return [{ phase: 'done', at: 0 }];
  return [
    { phase: 'closed', at: 0 },
    { phase: 'crack', at: 200 },
    { phase: 'flap', at: 500 },
    { phase: 'slide', at: 900 },
    { phase: 'done', at: 1400 },
  ];
}
