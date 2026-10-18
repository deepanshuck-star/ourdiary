// Pure layout math for the 3D photo ring (photos placed on a cylinder around the Y axis).

const TAU = Math.PI * 2;

export type RingSlot = {
  index: number;
  angle: number; // radians around the Y axis
  x: number;
  z: number;
  rotationY: number; // plane faces outward from the axis
};

/** Radius big enough that `count` cards of `cardWidth` fit with `gap` between them. */
export function ringRadius(count: number, cardWidth = 1.6, gap = 0.35, minRadius = 2.6): number {
  if (count <= 0) return minRadius;
  return Math.max(minRadius, (count * (cardWidth + gap)) / TAU);
}

export function ringLayout(count: number, radius: number): RingSlot[] {
  const slots: RingSlot[] = [];
  if (count <= 0) return slots;
  const step = TAU / count;
  for (let i = 0; i < count; i++) {
    const angle = i * step;
    slots.push({
      index: i,
      angle,
      x: radius * Math.sin(angle),
      z: radius * Math.cos(angle),
      rotationY: angle,
    });
  }
  return slots;
}

/** Angular distance between neighbouring photos. */
export function ringStep(count: number): number {
  return count > 0 ? TAU / count : 0;
}

/**
 * Which photo faces the camera (camera on +Z) when the ring group is rotated by `rotationY`.
 * Slot i sits at world angle (i*step + rotationY); it faces front when that is ~0 mod 2PI.
 */
export function frontIndexForRotation(rotationY: number, count: number): number {
  if (count <= 0) return -1;
  const step = TAU / count;
  const raw = Math.round(-rotationY / step);
  return ((raw % count) + count) % count;
}

/** Ring rotation that brings slot `index` to the front, nearest to the current rotation. */
export function rotationForIndex(index: number, count: number, currentRotation: number): number {
  if (count <= 0) return currentRotation;
  const base = -index * (TAU / count);
  const turns = Math.round((currentRotation - base) / TAU);
  return base + turns * TAU;
}
