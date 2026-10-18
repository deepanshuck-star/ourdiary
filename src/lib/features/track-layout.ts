// Pure layout math for the 3D toy-train track: a closed, gently wobbling oval with one
// station per milestone. Station i sits exactly on control point i of a closed Catmull-Rom curve.

export type Vec3 = [number, number, number];

export type TrackOptions = {
  radiusX?: number;
  radiusZ?: number;
  wobble?: number; // fraction of the radius the track bends in/out
  lobes?: number; // how many bends around the loop
  hill?: number; // gentle height variation
};

/** At least this many control points, so a curve with very few stations still looks round. */
export const MIN_TRACK_POINTS = 6;

export function trackControlPoints(stationCount: number, opts: TrackOptions = {}): Vec3[] {
  const radiusX = opts.radiusX ?? 7;
  const radiusZ = opts.radiusZ ?? 4.2;
  const wobble = opts.wobble ?? 0.14;
  const lobes = opts.lobes ?? 3;
  const hill = opts.hill ?? 0.35;
  const n = Math.max(MIN_TRACK_POINTS, stationCount);
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 1 + wobble * Math.sin(lobes * a);
    const x = radiusX * r * Math.cos(a);
    const z = radiusZ * r * Math.sin(a);
    const y = hill * Math.sin(2 * a + 0.6);
    pts.push([round4(x), round4(y), round4(z)]);
  }
  return pts;
}

/**
 * Index of the control point each station uses. With fewer stations than points
 * they are spread evenly round the loop.
 */
export function stationPointIndices(stationCount: number): number[] {
  const n = Math.max(MIN_TRACK_POINTS, stationCount);
  const out: number[] = [];
  for (let i = 0; i < stationCount; i++) out.push(Math.floor((i * n) / stationCount));
  return out;
}

/** Keep a looping progress value in [0, 1). */
export function wrapProgress(p: number): number {
  const w = p % 1;
  return w < 0 ? w + 1 : w;
}

/** Parameter (0..1) of a control point on a closed Catmull-Rom curve with `pointCount` points. */
export function controlPointParam(pointIndex: number, pointCount: number): number {
  return pointCount > 0 ? wrapProgress(pointIndex / pointCount) : 0;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
