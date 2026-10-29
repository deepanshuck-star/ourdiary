'use client';

import type { CSSProperties } from 'react';

import '@/styles/themes/ocean.css';

/**
 * "Sunset by the Ocean" — the fixed backdrop behind the diary.
 *
 * Painterly rather than simulated: the sea is six drawn bands that drift a few
 * user units sideways, not a particle field. Everything is inline SVG so the
 * scene costs one paint and no network round-trip, and so it can read the
 * theme's --scene-* tokens directly instead of baking colours in.
 *
 * Two rules shape most of the decisions below:
 *   1. Nothing is computed at render time. The ESLint purity rule rejects any
 *      random or clock read during render, and a scene that reshuffled itself
 *      on every re-render would flicker anyway. All geometry is literal,
 *      declared at module scope, and mapped over.
 *   2. Every rule that starts motion lives inside a
 *      prefers-reduced-motion: no-preference block in ocean.css. The markup
 *      here is therefore authored as a finished still picture; motion only ever
 *      nudges it. Each animated element carries a resting position/opacity that
 *      looks deliberate when nothing moves.
 */

/** Inline custom properties, which React's CSSProperties type does not model. */
const vars = (declarations: Record<string, string>) => declarations as CSSProperties;

/**
 * Gentle horizontal band of water. Two mirrored quadratics per wavelength give
 * a sine-like line without the cost (or the node count) of plotting points.
 * Drawn well past the viewBox on both sides so the sideways drift never exposes
 * a cut end.
 */
function waveBand(y: number, amplitude: number, wavelength: number): string {
  const START = -240;
  const END = 1840;
  const half = wavelength / 2;
  let d = `M ${START} ${y}`;
  for (let x = START; x < END; x += wavelength) {
    d += ` q ${half / 2} ${-amplitude} ${half} 0 q ${half / 2} ${amplitude} ${half} 0`;
  }
  return d;
}

/**
 * Bands get longer, heavier and slightly more contrasty toward the viewer —
 * the only perspective cue the water has. Opacity stays low in the upper sea
 * because note cards are read against it.
 */
const WAVE_BANDS = [
  { y: 322, amp: 3, len: 420, width: 1.4, opacity: 0.1, shift: '6px', dur: '34s', delay: '-4s' },
  { y: 356, amp: 4, len: 380, width: 1.5, opacity: 0.12, shift: '8px', dur: '29s', delay: '-11s' },
  { y: 404, amp: 5, len: 440, width: 1.8, opacity: 0.13, shift: '10px', dur: '26s', delay: '-7s' },
  { y: 472, amp: 6, len: 500, width: 2.1, opacity: 0.15, shift: '13px', dur: '31s', delay: '-16s' },
  { y: 562, amp: 7, len: 560, width: 2.4, opacity: 0.17, shift: '16px', dur: '24s', delay: '-2s' },
  { y: 672, amp: 9, len: 640, width: 3, opacity: 0.19, shift: '20px', dur: '27s', delay: '-13s' },
].map((band) => ({ ...band, d: waveBand(band.y, band.amp, band.len) }));

/**
 * Highlight strokes inside the sun's reflection. They widen and spread as they
 * come forward. Negative delays spread the pulses out on first paint, so the
 * column never blinks in unison; the durations are mutually prime-ish for the
 * same reason.
 */
const SHIMMER = [
  { x: 894, y: 320, w: 52, dur: '7.4s', delay: '-2.1s' },
  { x: 868, y: 358, w: 84, dur: '9.1s', delay: '-5.6s' },
  { x: 906, y: 396, w: 46, dur: '8.2s', delay: '-0.9s' },
  { x: 856, y: 442, w: 102, dur: '10.6s', delay: '-4.3s' },
  { x: 898, y: 494, w: 60, dur: '7.9s', delay: '-6.8s' },
  { x: 842, y: 556, w: 120, dur: '11.4s', delay: '-3.2s' },
  { x: 886, y: 622, w: 76, dur: '9.6s', delay: '-8.1s' },
];

/** One sail, drawn small enough that it reads as distance rather than detail. */
function Sailboat({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="var(--scene-near)">
      <path d="M -11 0 C -6 6 6 6 11 0 Z" />
      <path d="M 1 -21 L 9 -2 L 1 -2 Z" />
      <path d="M -2 -17 L -8 -2 L -2 -2 Z" />
    </g>
  );
}

export function OceanScene() {
  return (
    <div aria-hidden="true" className="ourdiary-scene scene-ocean">
      {/*
        viewBox is 2:1 — close to a typical desktop viewport, which keeps the
        "slice" crop shallow there. With xMidYMax the crop eats the top of the
        sky first, so the horizon at y=290 (36% down) survives down to very wide
        windows; on phones the height drives the scale and the sides crop
        instead, leaving horizon, sun and headland in frame.
      */}
      <svg
        className="ocean-canvas"
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="ocean-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="290">
            <stop offset="0" stopColor="var(--scene-sky)" />
            <stop offset="1" stopColor="var(--scene-sky-low)" />
          </linearGradient>

          {/* The far stop keeps the water nearest the horizon light, so the
              horizon reads as a line rather than a seam. */}
          <linearGradient id="ocean-sea" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="800">
            <stop offset="0" stopColor="var(--scene-far)" />
            <stop offset="0.18" stopColor="var(--scene-mid)" />
            <stop offset="1" stopColor="var(--scene-near)" />
          </linearGradient>

          {/* Deliberately weak and warm-sand rather than orange: the brief is a
              low sun, not a bloom. */}
          <radialGradient id="ocean-sunglow">
            <stop offset="0" stopColor="var(--scene-glow)" stopOpacity="0.38" />
            <stop offset="0.55" stopColor="var(--scene-glow)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--scene-glow)" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="ocean-reflection" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="700">
            <stop offset="0" stopColor="var(--scene-glow)" stopOpacity="0.5" />
            <stop offset="0.45" stopColor="var(--scene-glow)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--scene-glow)" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="ocean-haze" gradientUnits="userSpaceOnUse" x1="0" y1="256" x2="0" y2="292">
            <stop offset="0" stopColor="var(--scene-glow)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--scene-glow)" stopOpacity="0.45" />
          </linearGradient>

          {/* Each cloud layer is defined once and placed twice, 1600 apart, so a
              -1600 drift wraps seamlessly without duplicating the shapes. */}
          <g id="ocean-cloud-high" fill="var(--scene-glow)">
            <ellipse cx="180" cy="96" rx="150" ry="11" />
            <ellipse cx="300" cy="120" rx="96" ry="7" />
            <ellipse cx="760" cy="72" rx="190" ry="13" />
            <ellipse cx="1180" cy="128" rx="140" ry="9" />
            <ellipse cx="1420" cy="88" rx="104" ry="8" />
          </g>

          <g id="ocean-cloud-low" fill="var(--scene-glow)">
            <ellipse cx="120" cy="246" rx="150" ry="5" />
            <ellipse cx="420" cy="214" rx="230" ry="7" />
            <ellipse cx="980" cy="236" rx="280" ry="6" />
            <ellipse cx="1340" cy="200" rx="170" ry="5" />
          </g>
        </defs>

        <rect x="0" y="0" width="1600" height="300" fill="url(#ocean-sky)" />

        <g className="ocean-clouds ocean-clouds-high" opacity="0.2">
          <use href="#ocean-cloud-high" />
          <use href="#ocean-cloud-high" x="1600" />
        </g>
        <g className="ocean-clouds ocean-clouds-low" opacity="0.28">
          <use href="#ocean-cloud-low" />
          <use href="#ocean-cloud-low" x="1600" />
        </g>

        {/* Sun centre sits above the horizon, its lower limb below it: the sea
            rect that follows crops it, so it reads as half-set. */}
        <circle cx="920" cy="272" r="150" fill="url(#ocean-sunglow)" />
        <circle cx="920" cy="272" r="40" fill="var(--scene-glow)" opacity="0.85" />

        {/* Cliffs, far to near: lighter and hazier with distance. All three sit
            left of centre so the middle of the frame stays empty for content. */}
        <path
          d="M 0 290 L 0 208 C 70 192 122 216 186 202 C 252 188 300 218 362 210 C 432 200 472 226 532 238 C 578 248 602 270 648 290 Z"
          fill="var(--scene-far)"
          opacity="0.5"
        />
        <path
          d="M 556 290 C 590 285 612 268 648 262 C 684 256 708 268 734 278 C 748 283 757 287 764 290 Z"
          fill="var(--scene-far)"
          opacity="0.65"
        />
        <path
          d="M 0 290 L 0 174 C 48 162 92 188 142 180 C 196 172 232 200 286 214 C 338 228 374 254 432 290 Z"
          fill="var(--scene-mid)"
          opacity="0.85"
        />

        {/* Haze pushes the cliff bases back and gives the horizon its glow. */}
        <rect x="0" y="256" width="1600" height="36" fill="url(#ocean-haze)" />

        <rect x="0" y="290" width="1600" height="510" fill="url(#ocean-sea)" />
        <rect x="0" y="289" width="1600" height="1.5" fill="var(--scene-glow)" opacity="0.4" />

        <path
          className="ocean-reflection"
          d="M 896 290 L 944 290 L 1012 700 L 828 700 Z"
          fill="url(#ocean-reflection)"
          opacity="0.3"
        />

        {WAVE_BANDS.map((band) => (
          <path
            key={band.y}
            className="ocean-wave"
            d={band.d}
            fill="none"
            stroke="var(--scene-glow)"
            strokeWidth={band.width}
            strokeLinecap="round"
            opacity={band.opacity}
            style={vars({ '--ocean-shift': band.shift, '--ocean-dur': band.dur, '--ocean-delay': band.delay })}
          />
        ))}

        {SHIMMER.map((stroke) => (
          <rect
            key={stroke.y}
            className="ocean-shimmer"
            x={stroke.x}
            y={stroke.y}
            width={stroke.w}
            height="3"
            rx="1.5"
            fill="var(--scene-particle)"
            opacity="0.26"
            style={vars({ '--ocean-dur': stroke.dur, '--ocean-delay': stroke.delay })}
          />
        ))}

        {/* Drawn after the sea so its base sits in the water, not behind it. */}
        <path
          d="M 0 326 L 0 152 C 40 134 74 166 112 172 C 152 178 176 208 206 242 C 228 268 241 302 252 326 Z"
          fill="var(--scene-near)"
          opacity="0.92"
        />

        {/*
          The drifting boat. The outer group owns the CSS transform; the inner
          one keeps its placement in the transform *attribute*, which a CSS
          transform on the same element would otherwise override — which is also
          why the resting position (x=700) has to be a composition that stands on
          its own under reduced motion.
        */}
        <g className="ocean-boat-drift" opacity="0.45">
          <Sailboat x={700} y={304} scale={0.85} />
        </g>
        <g opacity="0.35">
          <Sailboat x={1248} y={298} scale={0.7} />
        </g>
      </svg>
    </div>
  );
}

export default OceanScene;
