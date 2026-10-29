'use client';

import type { CSSProperties } from 'react';
import '../../styles/themes/moonlit.css';

/**
 * Moonlit Lovers' Garden — a fixed, non-interactive backdrop that sits behind
 * the app chrome.
 *
 * The whole picture is one SVG on a 1200x800 viewBox with
 * `preserveAspectRatio="xMidYMax slice"`. Slice crops rather than stretches, so
 * a narrow viewport keeps roughly the middle 400 user units of the composition:
 * the moon, the ridge and the couple all live inside x 420-800 for that reason.
 * Anchoring to yMax keeps the horizon and the grass on screen; only the top
 * sliver of sky is lost on wide screens.
 *
 * Per-element timings below are literals. The purity lint rule rejects random
 * values and clock reads during render, and fixed values also guarantee that
 * the server and client markup match.
 */

// Custom properties are not part of CSSProperties, so style objects go through
// this cast once instead of an `as` at every call site.
const vars = (v: Record<string, string | number>) => v as CSSProperties;

// Grass. `bend` is the horizontal lean of the tip in user units; `sway` is the
// rotation amplitude in degrees. Durations are deliberately coprime-ish and
// delays are negative so each blade starts part-way through its cycle — without
// that the whole field would begin the first sway in lockstep.
const BLADES = [
  { x: 20, h: 150, bend: 16, dur: 9.4, delay: -2.1, sway: 2.6 },
  { x: 95, h: 210, bend: -14, dur: 11.8, delay: -5.4, sway: 1.9 },
  { x: 150, h: 130, bend: 20, dur: 7.6, delay: -0.8, sway: 3.2 },
  { x: 215, h: 185, bend: -18, dur: 12.6, delay: -7.2, sway: 1.6 },
  { x: 290, h: 165, bend: 12, dur: 8.8, delay: -3.6, sway: 2.9 },
  { x: 360, h: 225, bend: -22, dur: 10.4, delay: -9.1, sway: 2.2 },
  { x: 430, h: 145, bend: 18, dur: 13.0, delay: -1.4, sway: 3.5 },
  { x: 505, h: 195, bend: -12, dur: 9.0, delay: -6.3, sway: 2.4 },
  { x: 575, h: 160, bend: 22, dur: 11.2, delay: -4.7, sway: 1.8 },
  { x: 640, h: 215, bend: -16, dur: 7.9, delay: -2.9, sway: 3.0 },
  { x: 710, h: 140, bend: 14, dur: 12.1, delay: -8.4, sway: 2.1 },
  { x: 780, h: 200, bend: -20, dur: 8.3, delay: -0.3, sway: 2.7 },
  { x: 845, h: 175, bend: 16, dur: 10.9, delay: -5.9, sway: 1.7 },
  { x: 915, h: 230, bend: -24, dur: 9.7, delay: -3.2, sway: 3.3 },
  { x: 980, h: 150, bend: 12, dur: 12.9, delay: -10.6, sway: 2.5 },
  { x: 1050, h: 190, bend: -18, dur: 8.1, delay: -7.8, sway: 2.0 },
  { x: 1115, h: 135, bend: 20, dur: 11.5, delay: -1.9, sway: 3.1 },
  { x: 1175, h: 205, bend: -14, dur: 10.1, delay: -4.4, sway: 2.3 },
] as const;

// Flowers sway on their own, slower clock than the grass so the two layers
// never fall into a visible common rhythm.
const FLOWERS = [
  { x: 180, y: 788, s: 1.35, dur: 10.6, delay: -3.1, sway: 2.2 },
  { x: 395, y: 796, s: 1.15, dur: 8.9, delay: -6.4, sway: 2.8 },
  { x: 620, y: 792, s: 1.5, dur: 12.3, delay: -1.7, sway: 1.9 },
  { x: 835, y: 798, s: 1.2, dur: 9.6, delay: -8.2, sway: 2.5 },
  { x: 1040, y: 790, s: 1.4, dur: 11.4, delay: -4.8, sway: 2.1 },
] as const;

// `o` is each star's resting opacity; the twinkle keyframes scale it, so the
// field keeps its depth whether or not the animation runs.
const STARS = [
  { x: 70, y: 90, r: 1.6, o: 0.55, dur: 5.2, delay: -1.1 },
  { x: 160, y: 210, r: 1.2, o: 0.4, dur: 6.8, delay: -3.4 },
  { x: 245, y: 74, r: 1.9, o: 0.65, dur: 4.6, delay: -2.2 },
  { x: 330, y: 160, r: 1.3, o: 0.45, dur: 7.4, delay: -5.1 },
  { x: 415, y: 68, r: 1.5, o: 0.5, dur: 5.9, delay: -0.7 },
  { x: 470, y: 250, r: 1.1, o: 0.35, dur: 8.2, delay: -4.3 },
  { x: 560, y: 72, r: 1.3, o: 0.45, dur: 6.1, delay: -2.4 },
  { x: 700, y: 78, r: 1.5, o: 0.5, dur: 7.7, delay: -4.9 },
  { x: 790, y: 180, r: 1.2, o: 0.4, dur: 5.6, delay: -0.4 },
  { x: 900, y: 95, r: 1.8, o: 0.6, dur: 5.4, delay: -2.8 },
  { x: 960, y: 230, r: 1.2, o: 0.4, dur: 7.1, delay: -6.2 },
  { x: 1045, y: 130, r: 1.6, o: 0.55, dur: 6.3, delay: -1.9 },
  { x: 1120, y: 70, r: 1.4, o: 0.5, dur: 4.9, delay: -3.7 },
  { x: 1165, y: 280, r: 1.1, o: 0.35, dur: 8.6, delay: -5.6 },
] as const;

// Three wander paths shared across eight fireflies. Each path starts and ends
// at opacity 0, which is what hides the jump back to the start position on loop.
const FIREFLIES = [
  { x: 300, y: 690, r: 5, path: 'a', dur: 9.5, delay: -2.0 },
  { x: 420, y: 640, r: 4, path: 'b', dur: 11.0, delay: -5.5 },
  { x: 515, y: 712, r: 5.5, path: 'c', dur: 8.4, delay: -1.2 },
  { x: 600, y: 660, r: 4.5, path: 'a', dur: 12.2, delay: -7.8 },
  { x: 690, y: 700, r: 5, path: 'b', dur: 10.1, delay: -3.6 },
  { x: 775, y: 650, r: 4.2, path: 'c', dur: 9.0, delay: -6.9 },
  { x: 880, y: 705, r: 5.2, path: 'a', dur: 11.7, delay: -4.2 },
  { x: 980, y: 668, r: 4.5, path: 'b', dur: 8.8, delay: -9.1 },
] as const;

// A blade is a tapered quad: up one edge to the tip, back down the other.
function bladePath(x: number, h: number, bend: number) {
  const tipX = x + bend;
  const tipY = 800 - h;
  return `M${x - 3.5} 800 Q${x + bend * 0.3} ${800 - h * 0.6} ${tipX} ${tipY} Q${x + bend * 0.3 + 3.5} ${800 - h * 0.58} ${x + 3.5} 800 Z`;
}

export function MoonlitScene() {
  return (
    <div
      aria-hidden="true"
      className="ourdiary-scene scene-moonlit"
      // Also declared in the stylesheet. Inlining it means the backdrop is the
      // right colour on the first paint, before the scene sheet resolves.
      style={vars({ background: 'var(--scene-sky)' })}
    >
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="od-moonlit-sky" x1="0" y1="0" x2="0" y2="1">
            <stop className="od-sky-0" offset="0%" />
            <stop className="od-sky-1" offset="62%" />
            <stop className="od-sky-2" offset="100%" />
          </linearGradient>

          <radialGradient id="od-moonlit-halo">
            <stop className="od-halo-0" offset="0%" />
            <stop className="od-halo-1" offset="45%" />
            <stop className="od-halo-2" offset="100%" />
          </radialGradient>

          <radialGradient id="od-moonlit-spark">
            <stop className="od-spark-0" offset="0%" />
            <stop className="od-spark-1" offset="40%" />
            <stop className="od-spark-2" offset="100%" />
          </radialGradient>

          {/* Cloud bands repeat on a 1200-unit period, so a -1200 translate loops seamlessly. */}
          <g id="od-moonlit-cloud">
            <ellipse className="od-puff" cx="170" cy="150" rx="158" ry="21" />
            <ellipse className="od-puff" cx="540" cy="212" rx="196" ry="17" />
            <ellipse className="od-puff" cx="905" cy="124" rx="164" ry="19" />
          </g>

          <g id="od-moonlit-flower">
            <path className="od-stem" d="M0 0 Q-5 -28 0 -52" />
            <path className="od-leaf" d="M0 -22 Q11 -29 15 -17 Q6 -15 0 -22 Z" />
            <circle className="od-petal" cx="-7" cy="-58" r="5.5" />
            <circle className="od-petal" cx="7" cy="-58" r="5.5" />
            <circle className="od-petal" cx="0" cy="-66" r="5.5" />
            <circle className="od-petal" cx="0" cy="-51" r="5.5" />
            <circle className="od-core" cx="0" cy="-58" r="2.8" />
          </g>
        </defs>

        <rect className="od-sky" x="0" y="0" width="1200" height="800" />

        {STARS.map((s) => (
          <circle
            key={`s-${s.x}-${s.y}`}
            className="od-star"
            cx={s.x}
            cy={s.y}
            r={s.r}
            style={vars({ '--o': s.o, '--dur': `${s.dur}s`, '--delay': `${s.delay}s` })}
          />
        ))}

        {/* The moon is the fixed point of the composition; drifting it would read
            as a moving camera and undo the stillness the scene is after. Only its
            halo breathes. */}
        <circle
          className="od-moon-halo od-moon-halo-wide"
          cx="640"
          cy="215"
          r="300"
          style={vars({ '--halo-o': 0.55 })}
        />
        <circle className="od-moon-halo" cx="640" cy="215" r="190" />
        <circle className="od-moon" cx="640" cy="215" r="112" />
        <ellipse className="od-mare" cx="604" cy="188" rx="30" ry="22" />
        <ellipse className="od-mare" cx="672" cy="252" rx="22" ry="17" />
        <ellipse className="od-mare" cx="668" cy="168" rx="14" ry="11" />

        {/* Two layers at different speeds give the sky some parallax depth. */}
        <g className="od-cloud-band od-cloud-far">
          <use href="#od-moonlit-cloud" />
          <use href="#od-moonlit-cloud" x="1200" />
        </g>
        <g className="od-cloud-band od-cloud-near">
          <use href="#od-moonlit-cloud" y="96" />
          <use href="#od-moonlit-cloud" x="1200" y="96" />
        </g>

        <ellipse className="od-horizon-glow" cx="640" cy="474" rx="430" ry="74" />

        <path
          className="od-far"
          d="M0 500 L90 430 L170 470 L250 404 L352 468 L430 440 L520 478 L600 432 L690 470 L780 418 L880 466 L980 436 L1080 472 L1200 440 L1200 800 L0 800 Z"
        />
        <path
          className="od-mid"
          d="M0 560 C180 520 330 540 470 548 C640 557 820 520 1000 536 C1100 545 1160 556 1200 552 L1200 800 L0 800 Z"
        />

        {/* The couple sits on the mid ridge so the sky, not the dark foreground,
            is behind them; the ridge passes through y≈547 here. */}
        <circle className="od-figure" cx="486" cy="516" r="5.2" />
        <path className="od-figure" d="M481 547 Q478 528 486 522 Q494 528 491 547 Z" />
        <circle className="od-figure" cx="499" cy="520" r="4.8" />
        <path className="od-figure" d="M494 547 Q492 532 499 526 Q506 532 504 547 Z" />

        <path
          className="od-near"
          d="M0 650 C200 610 420 640 620 664 C820 688 1020 650 1200 630 L1200 800 L0 800 Z"
        />

        {FLOWERS.map((f) => (
          <g key={`f-${f.x}`} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
            <use
              className="od-flower"
              href="#od-moonlit-flower"
              style={vars({ '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, '--sway': f.sway })}
            />
          </g>
        ))}

        {BLADES.map((b) => (
          <path
            key={`b-${b.x}`}
            className="od-blade"
            d={bladePath(b.x, b.h, b.bend)}
            style={vars({ '--dur': `${b.dur}s`, '--delay': `${b.delay}s`, '--sway': b.sway })}
          />
        ))}

        {FIREFLIES.map((f) => (
          <circle
            key={`ff-${f.x}`}
            className={`od-firefly od-firefly-${f.path}`}
            cx={f.x}
            cy={f.y}
            r={f.r}
            style={vars({ '--dur': `${f.dur}s`, '--delay': `${f.delay}s` })}
          />
        ))}
      </svg>
    </div>
  );
}

export default MoonlitScene;
