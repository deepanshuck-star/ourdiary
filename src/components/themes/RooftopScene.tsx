'use client';

import '@/styles/themes/rooftop.css';

/* Starlit Rooftop Date.
 *
 * A warm, lamp-lit rooftop vignette in the lower third of the frame, read against a cool
 * city that recedes behind it. The whole theme hangs on that temperature split, so the
 * foreground only ever uses --scene-glow / --scene-particle and the city only ever uses
 * the cool sky/far/mid ramp.
 *
 * Two layout rules drive the geometry below:
 *  1. The main plate is `xMidYMax slice`. On a tall phone the crop is height-driven, which
 *     leaves roughly the central 380 user units visible. Everything that must survive —
 *     table, both chairs, both plants — is kept inside x 410..790. The skyline spans the
 *     full width and is visible at any aspect ratio.
 *  2. The vignette sits at y > 560 so the middle of the viewport, where the app renders,
 *     stays quiet.
 *
 * All timings and positions are literal: the build's react-hooks/purity rule rejects any
 * randomness during render, and hardcoding also means SSR and hydration agree exactly.
 */

// Inline custom properties need a cast; React's CSSProperties has no index signature.
const vars = (value: Record<string, string>) => value as React.CSSProperties;

// Fairy lights. Durations are mutually non-harmonic and delays are negative so the strand
// is already part-way through its breath on first paint instead of pulsing in unison.
const BULBS = [
  { x: 72, y: 46, d: '3.1s', delay: '-0.4s' },
  { x: 156, y: 67, d: '4.3s', delay: '-1.9s' },
  { x: 240, y: 80, d: '3.7s', delay: '-2.6s' },
  { x: 324, y: 85, d: '5.2s', delay: '-0.9s' },
  { x: 408, y: 82, d: '4.7s', delay: '-3.3s' },
  { x: 492, y: 71, d: '3.4s', delay: '-1.2s' },
  { x: 672, y: 64, d: '5.6s', delay: '-2.1s' },
  { x: 756, y: 79, d: '4.1s', delay: '-4.4s' },
  { x: 840, y: 86, d: '3.9s', delay: '-0.6s' },
  { x: 924, y: 84, d: '5.0s', delay: '-3.8s' },
  { x: 1008, y: 75, d: '4.5s', delay: '-1.6s' },
  { x: 1092, y: 58, d: '3.3s', delay: '-2.9s' },
];

// Windows that never change. Kept dim and uneven; the city should read as inhabited but
// settled, not as a light show.
const WINDOWS = [
  [108, 506], [130, 506], [108, 530],
  [258, 520], [284, 520], [306, 544],
  [438, 512], [462, 512], [438, 540],
  [618, 526], [644, 524], [666, 550],
  [788, 516], [812, 516], [788, 544],
  [958, 510], [984, 510], [1006, 536],
  [1138, 524], [1164, 522],
];

// Only five windows change at all, on 22–34s cycles with large negative offsets so no two
// are ever close to each other in phase. Two of them sit inside the phone-visible band.
const LIT_WINDOWS = [
  { x: 152, y: 506, d: '26s', delay: '-3s' },
  { x: 306, y: 520, d: '31s', delay: '-11s' },
  { x: 476, y: 512, d: '22s', delay: '-17s' },
  { x: 666, y: 526, d: '34s', delay: '-7s' },
  { x: 812, y: 544, d: '28s', delay: '-21s' },
];

// Blades for the two potted plants. Each path starts at the pot rim, so its bounding-box
// bottom is the pivot the CSS sway rotates around.
const LEAVES = [
  { p: 'M414 716 Q 388 682 376 644', d: '6.4s', delay: '-1.1s' },
  { p: 'M414 716 Q 404 672 394 630', d: '7.8s', delay: '-3.2s' },
  { p: 'M414 716 Q 416 666 420 624', d: '5.6s', delay: '-0.5s' },
  { p: 'M414 716 Q 432 674 446 638', d: '8.6s', delay: '-2.4s' },
  { p: 'M414 716 Q 442 688 460 664', d: '6.9s', delay: '-4.1s' },
  { p: 'M786 716 Q 812 682 824 644', d: '7.3s', delay: '-2.8s' },
  { p: 'M786 716 Q 796 672 806 630', d: '5.9s', delay: '-1.7s' },
  { p: 'M786 716 Q 784 666 780 624', d: '8.2s', delay: '-3.9s' },
  { p: 'M786 716 Q 768 674 754 638', d: '6.1s', delay: '-0.8s' },
  { p: 'M786 716 Q 758 688 740 664', d: '7.6s', delay: '-4.6s' },
];

const CLOUDS = [
  { t: 'translate(90 318)', s: 1, d: '140s' },
  { t: 'translate(640 356)', s: 1.25, d: '220s' },
  { t: 'translate(980 300)', s: 0.8, d: '180s' },
];

// One soft shape reused at three sizes; clouds here are haze, not weather.
const CLOUD_PATH =
  'M0 20 c 18 -26 56 -30 78 -10 c 16 -24 64 -24 80 4 c 28 -4 46 8 48 18 Z';

export function RooftopScene() {
  return (
    <div aria-hidden="true" className="ourdiary-scene scene-rooftop">
      <svg
        className="rooftop-stage"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <radialGradient id="rooftop-lamp">
            <stop offset="0%" stopColor="var(--scene-glow)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--scene-glow)" stopOpacity="0" />
          </radialGradient>
          {/* Warm light pooling at street level: the one place the two temperatures meet. */}
          <linearGradient id="rooftop-haze" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--scene-glow)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--scene-glow)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="rooftop-star" fill="var(--scene-particle)">
          <circle cx="140" cy="210" r="2" />
          <circle cx="330" cy="168" r="2.4" />
          <circle cx="520" cy="232" r="1.8" />
          <circle cx="760" cy="186" r="2.2" />
          <circle cx="960" cy="244" r="1.8" />
          <circle cx="1120" cy="200" r="2.4" />
        </g>

        <g fill="var(--scene-far)">
          {CLOUDS.map((cloud) => (
            /* The placement transform lives on the wrapper: a CSS transform on the path
               would replace the `transform` attribute outright, not compose with it. */
            <g key={cloud.t} transform={`${cloud.t} scale(${cloud.s})`}>
              <path className="rooftop-cloud" d={CLOUD_PATH} style={vars({ '--d': cloud.d })} />
            </g>
          ))}
        </g>

        <path
          fill="var(--scene-far)"
          d="M0 572 L0 470 L60 470 L60 430 L120 430 L120 492 L190 492 L190 448 L250 448 L250 412 L300 412 L300 486 L380 486 L380 452 L450 452 L450 400 L505 400 L505 474 L580 474 L580 436 L650 436 L650 466 L720 466 L720 408 L780 408 L780 462 L860 462 L860 424 L930 424 L930 480 L1010 480 L1010 442 L1080 442 L1080 468 L1140 468 L1140 432 L1200 432 L1200 572 Z"
        />
        <rect x="0" y="430" width="1200" height="166" fill="url(#rooftop-haze)" />
        <path
          fill="var(--scene-mid)"
          d="M0 596 L0 520 L90 520 L90 486 L170 486 L170 532 L240 532 L240 500 L330 500 L330 540 L420 540 L420 494 L500 494 L500 530 L600 530 L600 506 L690 506 L690 544 L770 544 L770 498 L850 498 L850 534 L940 534 L940 490 L1030 490 L1030 528 L1120 528 L1120 504 L1200 504 L1200 596 Z"
        />

        <g fill="var(--scene-particle)">
          {WINDOWS.map(([x, y]) => (
            <rect key={`${x}-${y}`} className="rooftop-window" x={x} y={y} width="7" height="11" />
          ))}
          {LIT_WINDOWS.map((w) => (
            <rect
              key={`lit-${w.x}-${w.y}`}
              className="rooftop-window-lit"
              x={w.x}
              y={w.y}
              width="7"
              height="11"
              style={vars({ '--d': w.d, '--delay': w.delay })}
            />
          ))}
        </g>

        {/* Parapet, then floor. The coping catches the lamp, which separates the rooftop
            from the city behind it without needing a lighter fill. */}
        <rect x="0" y="596" width="1200" height="204" fill="var(--scene-near)" />
        <rect
          x="0"
          y="596"
          width="1200"
          height="5"
          fill="color-mix(in srgb, var(--scene-glow) 30%, transparent)"
        />
        <rect
          x="0"
          y="648"
          width="1200"
          height="152"
          fill="color-mix(in srgb, var(--scene-near) 86%, var(--scene-mid))"
        />
        <ellipse
          cx="620"
          cy="744"
          rx="250"
          ry="44"
          fill="color-mix(in srgb, var(--scene-glow) 13%, transparent)"
        />

        {/* Lamp halo sits behind the furniture so the silhouettes stay crisp. */}
        <ellipse className="rooftop-lampglow" cx="642" cy="622" rx="190" ry="130" fill="url(#rooftop-lamp)" />

        <g fill="var(--scene-near)">
          {/* Left chair */}
          <rect x="438" y="574" width="56" height="8" rx="4" />
          <path d="M452 580 L462 580 L466 658 L456 658 Z" />
          <path d="M424 660 L508 660 L500 676 L432 676 Z" />
          <path
            d="M432 676 L428 726 M500 676 L506 726"
            fill="none"
            stroke="var(--scene-near)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Right chair — same silhouette mirrored about x=600 */}
          <rect x="706" y="574" width="56" height="8" rx="4" />
          <path d="M748 580 L738 580 L734 658 L744 658 Z" />
          <path d="M692 660 L776 660 L768 676 L700 676 Z" />
          <path
            d="M768 676 L772 726 M700 676 L694 726"
            fill="none"
            stroke="var(--scene-near)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Table */}
          <path d="M588 666 L612 666 L608 726 L592 726 Z" />
          <ellipse cx="600" cy="648" rx="100" ry="19" />
          <ellipse cx="600" cy="730" rx="42" ry="9" />
        </g>

        <ellipse
          cx="600"
          cy="647"
          rx="100"
          ry="19"
          fill="none"
          stroke="color-mix(in srgb, var(--scene-glow) 45%, transparent)"
          strokeWidth="2"
        />

        {/* Blanket over the right chair. The corner is a separate path purely so it can
            swing on its own without moving the part that rests on the rail. */}
        <path
          d="M704 576 L764 576 L770 646 L748 652 L738 618 L722 648 L698 640 Z"
          fill="color-mix(in srgb, var(--scene-glow) 24%, var(--scene-near))"
        />
        <path
          className="rooftop-blanket-corner"
          d="M748 650 L770 644 L762 692 L744 668 Z"
          fill="color-mix(in srgb, var(--scene-glow) 18%, var(--scene-near))"
        />

        {/* Plants: pots in silhouette, blades a touch warmer so the breeze is legible. */}
        <g fill="var(--scene-near)">
          <path d="M390 716 L438 716 L432 762 L396 762 Z" />
          <path d="M762 716 L810 716 L804 762 L768 762 Z" />
        </g>
        <g
          fill="none"
          stroke="color-mix(in srgb, var(--scene-glow) 22%, var(--scene-near))"
          strokeWidth="7"
          strokeLinecap="round"
        >
          {LEAVES.map((leaf) => (
            <path
              key={leaf.p}
              className="rooftop-leaf"
              d={leaf.p}
              style={vars({ '--d': leaf.d, '--delay': leaf.delay })}
            />
          ))}
        </g>

        {/* Table lamp and two cups — the only objects allowed to read as warm. */}
        <path
          d="M634 600 Q642 584 650 600"
          fill="none"
          stroke="var(--scene-glow)"
          strokeWidth="3"
        />
        <path d="M630 602 L654 602 L658 644 L626 644 Z" fill="var(--scene-glow)" opacity="0.85" />
        <rect x="634" y="610" width="16" height="26" rx="3" fill="var(--scene-particle)" />
        <path
          d="M548 630 L566 630 L563 644 L551 644 Z"
          fill="color-mix(in srgb, var(--scene-particle) 70%, var(--scene-near))"
        />
        <path
          d="M574 628 L590 628 L587 641 L577 641 Z"
          fill="color-mix(in srgb, var(--scene-particle) 70%, var(--scene-near))"
        />
      </svg>

      {/* Strung above everything, in its own top-anchored plate so a wide viewport crops
          the sky rather than the lights. */}
      <svg
        className="rooftop-garland"
        viewBox="0 0 1200 220"
        preserveAspectRatio="xMidYMin slice"
      >
        <path
          d="M0 10 Q 300 125 600 34 Q 900 125 1200 14"
          fill="none"
          stroke="color-mix(in srgb, var(--scene-near) 70%, var(--scene-sky))"
          strokeWidth="2.5"
        />
        <g className="rooftop-bulbs" fill="var(--scene-glow)">
          {BULBS.map((bulb) => (
            <circle
              key={bulb.x}
              className="rooftop-bulb"
              cx={bulb.x}
              cy={bulb.y}
              r="8"
              style={vars({ '--d': bulb.d, '--delay': bulb.delay })}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default RooftopScene;
