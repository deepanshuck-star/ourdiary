'use client';

import '@/styles/themes/blossom.css';

/**
 * Cherry Blossom Dream — the single daylight scene of the six themes.
 *
 * Layout rationale: the landscape is one full-bleed SVG that crops rather than
 * stretches, while the two framing trees are their own SVGs anchored to the left
 * and right edges. Keeping the trees out of the landscape viewBox matters: a
 * `slice` crop on a 360px-wide viewport throws away roughly the outer third of
 * the viewBox on each side, which would delete edge-anchored trunks entirely.
 * As separate elements they are sized in percentages and shrink predictably.
 *
 * Every animated value below is a literal. Nothing is derived at render time:
 * the purity lint rule forbids non-deterministic calls during render, and a
 * background that reshuffled on every hydration would flicker anyway.
 */

/**
 * Petals are confined to the outer thirds (x <= 29 or x >= 71) so nothing drifts
 * behind the body copy that sits in the middle of the viewport.
 *
 * `y` is the resting offset used when motion is suppressed; with animation on it
 * also staggers where each petal enters the fall. `tone` selects one of three
 * drift amplitudes/opacities so no two petals trace the same path.
 */
const PETALS = [
  { x: 4, y: 7, size: 11, fall: 17.5, fallDelay: -2.4, sway: 5.2, swayDelay: -1.1, tone: 0 },
  { x: 12, y: 19, size: 8, fall: 22.0, fallDelay: -11.6, sway: 6.8, swayDelay: -3.4, tone: 1 },
  { x: 19, y: 3, size: 9, fall: 19.4, fallDelay: -6.8, sway: 4.6, swayDelay: -0.6, tone: 0 },
  { x: 26, y: 25, size: 12, fall: 25.6, fallDelay: -16.2, sway: 7.4, swayDelay: -2.8, tone: 2 },
  { x: 8, y: 28, size: 7, fall: 15.8, fallDelay: -9.1, sway: 5.9, swayDelay: -4.2, tone: 1 },
  { x: 22, y: 12, size: 10, fall: 21.2, fallDelay: -3.7, sway: 6.2, swayDelay: -2.0, tone: 0 },
  { x: 75, y: 9, size: 10, fall: 18.6, fallDelay: -5.3, sway: 5.5, swayDelay: -1.7, tone: 0 },
  { x: 82, y: 22, size: 8, fall: 23.4, fallDelay: -13.9, sway: 7.1, swayDelay: -3.9, tone: 2 },
  { x: 90, y: 4, size: 12, fall: 16.9, fallDelay: -8.2, sway: 4.9, swayDelay: -0.9, tone: 1 },
  { x: 96, y: 16, size: 9, fall: 24.8, fallDelay: -18.5, sway: 6.5, swayDelay: -5.1, tone: 0 },
  { x: 71, y: 30, size: 7, fall: 20.3, fallDelay: -1.6, sway: 5.0, swayDelay: -2.5, tone: 1 },
  { x: 87, y: 13, size: 11, fall: 26.5, fallDelay: -21.0, sway: 7.8, swayDelay: -6.3, tone: 2 },
];

/**
 * Far treeline. Written as one path of quadratic bumps rather than a group of
 * crowns — a single node renders the whole band and the alternating y deltas
 * keep it level across the width instead of drifting upwards.
 */
const TREELINE =
  'M0 616 q34 -28 68 -6 q30 -34 62 8 q36 -26 72 -4 q28 -32 58 10 q34 -28 70 -2' +
  ' q30 -30 62 8 q36 -24 72 -6 q28 -34 58 4 q34 -26 70 -8 q30 -32 62 2' +
  ' q36 -28 72 -6 q28 -30 58 8 q34 -24 70 -4 q30 -34 62 6 q36 -26 72 -2' +
  ' q28 -28 58 8 q34 -32 70 -6 q30 -26 62 4 q36 -30 72 -8 q28 -28 58 2' +
  ' q34 -26 70 -6 q30 -30 62 4 L1440 900 L0 900 Z';

export function BlossomScene() {
  return (
    <div aria-hidden="true" className="ourdiary-scene scene-blossom">
      {/* Morning sun, set off-centre and far enough up that its falloff reads as
          haze on the hills rather than a disc. */}
      <div className="blossom-sun" />

      <div className="blossom-clouds">
        <div className="blossom-cloud c1" />
        <div className="blossom-cloud c2" />
        <div className="blossom-cloud c3" />
        <div className="blossom-cloud c4" />
      </div>

      {/* yMax anchoring pins the ground to the bottom edge, so wide viewports
          crop sky off the top instead of sliding the horizon out of frame. */}
      <svg
        className="blossom-land"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 516 C 130 470 214 452 312 470 C 404 486 452 450 556 440 C 664 430 726 462 828 470 C 930 478 1004 448 1112 456 C 1216 464 1332 494 1440 482 L1440 900 L0 900 Z"
          fill="var(--scene-far)"
          opacity="0.45"
        />
        <path
          d="M0 560 C 148 530 256 548 368 532 C 480 516 548 488 668 496 C 796 504 864 540 984 534 C 1104 528 1214 502 1322 516 C 1382 524 1414 532 1440 538 L1440 900 L0 900 Z"
          fill="var(--scene-far)"
          opacity="0.78"
        />
        <path d={TREELINE} fill="var(--scene-mid)" opacity="0.92" />
        <path
          d="M0 648 C 220 628 420 650 700 640 C 940 632 1160 652 1440 638 L1440 900 L0 900 Z"
          fill="var(--scene-mid)"
        />
        {/* Shadow along the far bank: without it the water edge reads as a
            sticker laid on flat green. */}
        <path
          d="M742 690 C 706 744 632 794 512 840 C 414 878 300 894 196 900 L300 900 C 392 884 486 856 572 816 C 668 772 732 732 770 690 Z"
          fill="var(--scene-near)"
          opacity="0.22"
        />

        <path
          d="M742 700 C 712 752 640 800 520 844 C 420 880 300 894 196 900 L648 900 C 724 866 790 814 828 762 C 848 734 854 714 856 700 Z"
          fill="var(--scene-sky)"
          opacity="0.92"
        />
        {/* Warm sky caught on the water furthest from the viewer. */}
        <path
          d="M742 700 C 726 728 702 754 668 780 L778 784 C 812 756 840 728 856 700 Z"
          fill="var(--scene-sky-low)"
          opacity="0.5"
        />

        <path className="blossom-ripple r1" d="M726 740 C 756 744 786 746 816 744" />
        <path className="blossom-ripple r2" d="M656 798 C 700 804 744 806 782 802" />
        <path className="blossom-ripple r3" d="M566 842 C 620 850 676 852 726 848" />
        <path className="blossom-ripple r4" d="M432 882 C 500 890 572 892 638 888" />
        <path className="blossom-ripple r5" d="M700 768 C 736 772 772 774 804 772" />

        {/* Bridge, deliberately low in the frame and in flat silhouette so it
            anchors the composition without competing with the page content. */}
        <path
          d="M478 806 C 562 848 744 852 828 800"
          fill="none"
          stroke="var(--scene-near)"
          strokeWidth="8"
          opacity="0.14"
        />
        <path
          d="M470 792 C 556 726 742 720 830 780"
          fill="none"
          stroke="var(--scene-near)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M470 766 C 556 700 742 694 830 754"
          fill="none"
          stroke="var(--scene-near)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M520 768v-26M600 750v-26M690 744v-26M780 756v-26"
          stroke="var(--scene-near)"
          strokeWidth="4"
          opacity="0.8"
        />

        <path
          d="M0 786 C 70 782 134 794 182 818 C 212 834 230 866 236 900 L0 900 Z"
          fill="var(--scene-near)"
        />
        <path
          d="M1440 756 C 1320 768 1180 796 1040 836 C 940 864 880 884 844 900 L1440 900 Z"
          fill="var(--scene-near)"
        />

        <g className="blossom-grass g1">
          <path d="M70 788 c -6 -26 -2 -40 8 -56 M104 796 c -4 -30 4 -44 16 -58 M140 806 c -8 -26 -4 -42 4 -58 M182 818 c -2 -28 6 -42 18 -54 M224 832 c -6 -26 0 -42 10 -56" />
        </g>
        <g className="blossom-grass g2">
          <path d="M1286 790 c 6 -26 2 -40 -8 -56 M1248 800 c 4 -30 -4 -44 -16 -58 M1208 812 c 8 -26 4 -42 -4 -58 M1162 826 c 2 -28 -6 -42 -18 -54 M1116 842 c 6 -26 0 -42 -10 -56" />
        </g>
        <g className="blossom-grass g3">
          <path d="M986 706 c -4 -22 0 -34 8 -46 M1020 702 c -2 -24 4 -36 12 -46 M1056 706 c -6 -22 -2 -34 4 -46 M1092 702 c 0 -24 6 -34 14 -44" />
        </g>
      </svg>

      {/* Framing trees. Each branch group sways on its own clock; shared timing
          would make the pair read as one rigid object. */}
      <svg
        className="blossom-tree is-left"
        viewBox="0 0 560 980"
        preserveAspectRatio="xMinYMin meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="300" cy="300" rx="236" ry="134" fill="var(--scene-mid)" opacity="0.16" />
        <ellipse cx="382" cy="248" rx="182" ry="98" fill="var(--scene-particle)" opacity="0.13" />

        <path
          d="M-10 980 C 4 862 26 744 56 652 C 74 596 92 536 110 480 C 120 450 132 424 146 404 L 196 420 C 180 448 166 482 156 518 C 140 578 128 640 118 704 C 104 800 96 890 96 980 Z"
          fill="var(--scene-near)"
        />

        <g className="blossom-branch b1">
          <path d="M150 412 C 232 382 318 352 404 326 C 462 308 512 296 556 290" strokeWidth="10" />
          <path d="M286 362 C 312 330 342 308 376 290" strokeWidth="6" />
          <path d="M430 316 C 456 292 478 276 504 264" strokeWidth="5" />
          <ellipse cx="250" cy="348" rx="92" ry="38" fill="var(--scene-mid)" opacity="0.3" />
          <ellipse cx="330" cy="318" rx="120" ry="46" fill="var(--scene-particle)" opacity="0.3" />
          <ellipse cx="434" cy="286" rx="86" ry="36" fill="var(--scene-particle)" opacity="0.24" />
          <ellipse cx="380" cy="300" rx="60" ry="22" fill="var(--scene-glow)" opacity="0.22" />
        </g>

        <g className="blossom-branch b2">
          <path d="M146 406 C 168 352 200 306 246 270 C 280 244 318 226 358 214" strokeWidth="8" />
          <path d="M232 282 C 246 248 268 222 292 202" strokeWidth="5" />
          <ellipse cx="270" cy="246" rx="96" ry="44" fill="var(--scene-particle)" opacity="0.26" />
          <ellipse cx="332" cy="214" rx="64" ry="28" fill="var(--scene-mid)" opacity="0.3" />
        </g>

        <g className="blossom-branch b3">
          <path d="M126 520 C 198 508 268 492 338 466 C 386 448 428 426 462 400" strokeWidth="9" />
          <path d="M296 480 C 318 452 334 430 352 410" strokeWidth="5" />
          <ellipse cx="240" cy="486" rx="84" ry="32" fill="var(--scene-mid)" opacity="0.28" />
          <ellipse cx="322" cy="470" rx="110" ry="40" fill="var(--scene-particle)" opacity="0.24" />
          <ellipse cx="424" cy="418" rx="70" ry="30" fill="var(--scene-particle)" opacity="0.2" />
        </g>

        <g className="blossom-branch b4">
          <path d="M110 672 C 156 668 196 672 234 684" strokeWidth="7" />
          <ellipse cx="212" cy="676" rx="58" ry="22" fill="var(--scene-particle)" opacity="0.2" />
        </g>
      </svg>

      <svg
        className="blossom-tree is-right"
        viewBox="0 0 560 980"
        preserveAspectRatio="xMaxYMin meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="268" cy="334" rx="222" ry="126" fill="var(--scene-mid)" opacity="0.15" />
        <ellipse cx="196" cy="286" rx="168" ry="92" fill="var(--scene-particle)" opacity="0.12" />

        <path
          d="M570 980 C 556 866 538 752 512 664 C 496 610 480 552 466 498 C 458 468 448 442 436 422 L 386 438 C 400 464 412 496 420 530 C 432 586 442 646 450 708 C 462 802 470 890 470 980 Z"
          fill="var(--scene-near)"
        />

        <g className="blossom-branch b1">
          <path d="M432 430 C 356 400 278 376 198 356 C 144 342 96 332 54 328" strokeWidth="10" />
          <path d="M300 382 C 276 352 250 332 220 316" strokeWidth="6" />
          <path d="M160 346 C 136 324 116 310 92 300" strokeWidth="5" />
          <ellipse cx="316" cy="392" rx="86" ry="36" fill="var(--scene-mid)" opacity="0.3" />
          <ellipse cx="226" cy="356" rx="116" ry="44" fill="var(--scene-particle)" opacity="0.28" />
          <ellipse cx="120" cy="326" rx="80" ry="34" fill="var(--scene-particle)" opacity="0.22" />
          <ellipse cx="172" cy="338" rx="56" ry="20" fill="var(--scene-glow)" opacity="0.2" />
        </g>

        <g className="blossom-branch b2">
          <path d="M436 424 C 416 374 388 330 346 296 C 314 270 278 252 240 240" strokeWidth="8" />
          <path d="M352 306 C 338 274 318 250 296 230" strokeWidth="5" />
          <ellipse cx="320" cy="282" rx="90" ry="42" fill="var(--scene-particle)" opacity="0.25" />
          <ellipse cx="256" cy="244" rx="60" ry="26" fill="var(--scene-mid)" opacity="0.3" />
        </g>

        <g className="blossom-branch b3">
          <path d="M448 556 C 384 546 322 532 262 510 C 218 494 182 474 152 452" strokeWidth="9" />
          <path d="M296 522 C 276 496 262 476 246 458" strokeWidth="5" />
          <ellipse cx="358" cy="534" rx="78" ry="30" fill="var(--scene-mid)" opacity="0.26" />
          <ellipse cx="266" cy="508" rx="102" ry="38" fill="var(--scene-particle)" opacity="0.22" />
          <ellipse cx="172" cy="462" rx="64" ry="28" fill="var(--scene-particle)" opacity="0.18" />
        </g>

        <g className="blossom-branch b4">
          <path d="M460 700 C 418 698 382 704 348 716" strokeWidth="7" />
          <ellipse cx="372" cy="708" rx="54" ry="20" fill="var(--scene-particle)" opacity="0.18" />
        </g>
      </svg>

      {/* Two nested elements per petal: the outer one owns the fall, the inner
          one the drift and spin. Splitting them avoids having to bake a unique
          combined keyframe set per petal. Durations and delays are inline, which
          is inert under reduced motion because no animation-name is set there. */}
      <div className="blossom-petals">
        {PETALS.map((p, i) => (
          <div
            key={i}
            className={`blossom-petal t${p.tone}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDuration: `${p.fall}s`,
              animationDelay: `${p.fallDelay}s`,
            }}
          >
            <div
              className="blossom-petal-i"
              style={{
                width: `${p.size}px`,
                height: `${p.size - 3}px`,
                animationDuration: `${p.sway}s`,
                animationDelay: `${p.swayDelay}s`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlossomScene;
