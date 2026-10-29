'use client';

import type { CSSProperties } from 'react';

import '@/styles/themes/lantern.css';

/*
 * Lantern Festival Night — a still lake at dusk, lanterns rising over the banks.
 *
 * Every number here is a literal. Nothing is sampled at render time: the scene
 * must be byte-identical on the server and the client, and the purity lint rule
 * rejects random values and clock reads in a component body outright.
 */

type Lantern = {
  /* Horizontal anchor, viewport percent. Kept under 25% or over 75% so the
   * centre column — where the app's own content sits — stays dark. */
  x: number;
  /* Resting height. Also the bottom of the rise, so the reduced-motion still
   * is composed from these values alone. */
  y: number;
  size: number;
  /* Rise distance in vh, deliberately short: a lantern fades out well before it
   * could reach the top of the viewport. */
  rise: number;
  dur: number;
  /* Negative, and mutually prime-ish, so the group never rises in formation. */
  delay: number;
  sway: number;
  swayDelay: number;
  flicker: number;
  flickerDelay: number;
  /* Only the large, low lanterns cast a reflection; the high distant ones
   * would be a smudge at this scale. */
  reflect: boolean;
};

const LANTERNS: readonly Lantern[] = [
  { x: 6, y: 36, size: 1, rise: 26, dur: 54, delay: -11, sway: 23, swayDelay: -4, flicker: 7.5, flickerDelay: -2.1, reflect: true },
  { x: 15, y: 46, size: 0.72, rise: 21, dur: 68, delay: -39, sway: 29, swayDelay: -17, flicker: 9.4, flickerDelay: -5.6, reflect: true },
  { x: 22, y: 27, size: 0.52, rise: 17, dur: 61, delay: -24, sway: 19, swayDelay: -9, flicker: 11.3, flickerDelay: -8.2, reflect: false },
  { x: 91, y: 39, size: 0.94, rise: 25, dur: 58, delay: -6, sway: 26, swayDelay: -21, flicker: 8.1, flickerDelay: -3.4, reflect: true },
  { x: 82, y: 48, size: 0.68, rise: 20, dur: 73, delay: -46, sway: 31, swayDelay: -13, flicker: 10.6, flickerDelay: -7.9, reflect: true },
  { x: 76, y: 29, size: 0.48, rise: 16, dur: 64, delay: -31, sway: 21, swayDelay: -2, flicker: 12.9, flickerDelay: -4.7, reflect: false },
  { x: 11, y: 21, size: 0.4, rise: 13, dur: 79, delay: -57, sway: 34, swayDelay: -26, flicker: 14.2, flickerDelay: -11.3, reflect: false },
];

/* Faint, very slow, and wide enough that the drift never exposes an edge. */
const CLOUDS = [
  { left: -8, top: 9, width: 48, height: 9, amp: 1.4, dur: 240, delay: -30, low: false },
  { left: 42, top: 17, width: 54, height: 8, amp: 1.1, dur: 300, delay: -120, low: false },
  { left: 8, top: 30, width: 42, height: 6, amp: 1.6, dur: 270, delay: -75, low: true },
  { left: 56, top: 38, width: 46, height: 5, amp: 0.9, dur: 330, delay: -190, low: true },
];

/* Low amplitude on purpose: still water, not a current. */
const RIPPLES = [
  { top: 64, left: 4, width: 44, amp: 7, dur: 19, delay: -3 },
  { top: 72, left: 28, width: 60, amp: 5, dur: 23, delay: -11 },
  { top: 81, left: 2, width: 52, amp: 8, dur: 17, delay: -6 },
  { top: 90, left: 36, width: 58, amp: 6, dur: 26, delay: -15 },
];

const TREE_SPAN = 3600;
const TREE_BASE = 240;

/*
 * The treeline SVG is `slice`-cropped, so at 360px only the middle ~800 user
 * units are visible while a desktop sees the full span. Generating the
 * silhouette from a crown table keeps the shape varied everywhere, so any crop
 * window reads as a treeline rather than as one repeated bump.
 */
function treelineD(crowns: readonly number[], valleyRatio: number): string {
  const step = TREE_SPAN / crowns.length;
  let d = `M 0 ${TREE_BASE} L 0 ${TREE_BASE - crowns[0] * valleyRatio}`;

  for (let i = 0; i < crowns.length; i += 1) {
    const x = i * step;
    const next = crowns[(i + 1) % crowns.length];
    const valley = TREE_BASE - Math.min(crowns[i], next) * valleyRatio;
    d += ` Q ${x + step / 2} ${TREE_BASE - crowns[i]} ${x + step} ${valley}`;
  }

  return `${d} L ${TREE_SPAN} ${TREE_BASE} Z`;
}

const FAR_TREES = treelineD(
  [128, 96, 150, 110, 74, 134, 160, 102, 88, 142, 118, 166, 92, 126, 108, 154, 80, 138, 112, 98, 146, 120, 84, 132],
  0.55,
);

const NEAR_BANK = treelineD(
  [64, 92, 52, 78, 100, 60, 86, 70, 108, 56, 94, 74, 66, 98, 58, 82],
  0.45,
);

export function LanternScene() {
  return (
    <div aria-hidden="true" className="ourdiary-scene scene-lantern">
      <div className="lantern-sky" />

      {CLOUDS.map((c) => (
        <div
          key={`cloud-${c.left}-${c.top}`}
          className={c.low ? 'lantern-cloud lantern-cloud-low' : 'lantern-cloud'}
          style={
            {
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: `${c.width}%`,
              height: `${c.height}%`,
              '--amp': `${c.amp}vw`,
              '--dur': `${c.dur}s`,
              '--delay': `${c.delay}s`,
            } as CSSProperties
          }
        />
      ))}

      {/* xMidYMax slice: the baseline is pinned to the waterline and the band
          crops from the top and sides instead of stretching the trees. */}
      <svg
        className="lantern-treeline"
        viewBox={`0 0 ${TREE_SPAN} ${TREE_BASE}`}
        preserveAspectRatio="xMidYMax slice"
      >
        <path d={FAR_TREES} fill="var(--scene-far)" />
        <path d={NEAR_BANK} fill="var(--scene-mid)" />
      </svg>

      <div className="lantern-water">
        {RIPPLES.map((r) => (
          <div
            key={`ripple-${r.top}`}
            className="lantern-ripple"
            style={
              {
                top: `${r.top}%`,
                left: `${r.left}%`,
                width: `${r.width}%`,
                '--amp': `${r.amp}px`,
                '--dur': `${r.dur}s`,
                '--delay': `${r.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="lantern-lights">
        {/* Reflections stay anchored at the waterline rather than tracking the
            rise: on still water the mirrored light pools and smears in place,
            and a reflection sliding upward with its lantern reads as a bug. */}
        {LANTERNS.filter((l) => l.reflect).map((l) => (
          <div
            key={`reflection-${l.x}`}
            className="lantern-reflection"
            style={
              {
                '--x': `${l.x}%`,
                '--size': l.size,
                '--dur': `${l.flicker * 1.6}s`,
                '--delay': `${l.flickerDelay}s`,
              } as CSSProperties
            }
          />
        ))}

        {LANTERNS.map((l) => (
          <div
            key={`lantern-${l.x}-${l.y}`}
            className="lantern"
            style={
              {
                '--x': `${l.x}%`,
                '--y': `${l.y}%`,
                '--size': l.size,
                '--rise': l.rise,
                '--dur': `${l.dur}s`,
                '--delay': `${l.delay}s`,
                '--sway': `${l.sway}s`,
                '--sway-delay': `${l.swayDelay}s`,
                '--flicker': `${l.flicker}s`,
                '--flicker-delay': `${l.flickerDelay}s`,
              } as CSSProperties
            }
          >
            <div className="lantern-drift">
              <div className="lantern-halo" />
              <div className="lantern-body" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LanternScene;
