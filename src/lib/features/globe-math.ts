// Pure helpers for the cobe-based Memory Globe. Import-free so node tests can load it directly.

export const TAU = Math.PI * 2;

/**
 * Convert a latitude/longitude (degrees) into the cobe `phi` / `theta` rotation that
 * puts that point at the centre of the visible hemisphere.
 * Matches cobe's internal projection: lng is offset by -PI, so phi = 3PI/2 - lng.
 */
export function latLngToGlobeAngles(lat: number, lng: number): { phi: number; theta: number } {
  const phi = Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2);
  const theta = (lat * Math.PI) / 180;
  return { phi: normalizeAngle(phi), theta: clampTheta(theta) };
}

/** Wrap any angle into [0, 2PI). */
export function normalizeAngle(angle: number): number {
  const wrapped = angle % TAU;
  return wrapped < 0 ? wrapped + TAU : wrapped;
}

/** Keep the tilt away from the poles so the globe never flips over. */
export function clampTheta(theta: number, limit = 1.2): number {
  return Math.max(-limit, Math.min(limit, theta));
}

/**
 * Given the current (unbounded) phi and a target angle, return the equivalent target
 * closest to `current`, so the globe takes the short way round instead of spinning back.
 */
export function nearestEquivalentAngle(current: number, target: number): number {
  const delta = normalizeAngle(target - current);
  return delta > Math.PI ? current + delta - TAU : current + delta;
}

/**
 * Frame-rate independent exponential easing toward a target.
 * `rate` is roughly "fraction per second" stiffness; dtSeconds is the frame delta.
 */
export function dampTowards(current: number, target: number, rate: number, dtSeconds: number): number {
  const t = 1 - Math.exp(-rate * dtSeconds);
  const next = current + (target - current) * t;
  return Math.abs(target - next) < 1e-4 ? target : next;
}

/** "#BE185D" / "#fff" / "rgb(190, 24, 93)" -> [r, g, b] in 0..1, or the fallback when unparseable. */
export function cssColorToRgb01(
  value: string,
  fallback: [number, number, number]
): [number, number, number] {
  const v = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)/i.exec(v);
  if (rgb) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255];
  }
  return fallback;
}
