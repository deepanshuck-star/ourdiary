'use client';

import type { CSSProperties } from 'react';
import '../../styles/themes/forest.css';

/**
 * Enchanted Forest of Memories — a fixed, non-interactive backdrop behind the
 * app chrome.
 *
 * Three SVGs rather than one. The backdrop carries the whole composition on a
 * 1200x800 viewBox with `preserveAspectRatio="xMidYMax slice"`, which crops
 * instead of stretching; at phone width that leaves roughly the middle 360
 * user units on screen, so the clearing, the trail, the bridge and the cottage
 * all sit inside x 420-790. The two framing trunks are separate edge-pinned
 * SVGs for the same reason: drawn into the backdrop they would be the first
 * thing the crop threw away.
 *
 * Every timing below is a literal. The purity lint rule rejects Math.random()
 * and Date.now() during render, and fixed values also keep the markup stable
 * across re-renders.
 *
 * Paint lives in forest.css — nothing here names a colour, so the scene picks
 * up whichever --scene-* token set the active theme defines.
 */

// Custom properties are outside React's CSSProperties type; the cast happens
// here once instead of at every call site.
const vars = (v: Record<string, string | number>) => v as CSSProperties;

// Ferns along the foreground floor. `s` scales the shared frond glyph, `tilt`
// is the sway amplitude in degrees. Durations are deliberately unrelated and
// delays negative so no two fronds share a phase.
const FERNS = [
  { x: 96, y: 806, s: 1.3, dur: 9.4, delay: -2.1, tilt: 1.7 },
  { x: 248, y: 792, s: 0.95, dur: 12.1, delay: -5.3, tilt: 1.2 },
  { x: 452, y: 814, s: 1.1, dur: 8.6, delay: -0.9, tilt: 1.5 },
  { x: 742, y: 804, s: 0.9, dur: 13.4, delay: -6.6, tilt: 1.1 },
  { x: 962, y: 794, s: 1.15, dur: 10.3, delay: -3.8, tilt: 1.6 },
  { x: 1112, y: 812, s: 1.35, dur: 11.7, delay: -8.2, tilt: 1.3 },
] as const;

// Eight is the ceiling for fireflies and it is already generous; six keeps the
// clearing feeling inhabited without turning into weather. They stay low in
// the frame, around the lantern light, and well clear of the reading area.
const FIREFLIES = [
  { x: 352, y: 606, r: 3.4, dur: 27, delay: -4, dx: 16, dy: -30 },
  { x: 470, y: 654, r: 3, dur: 32, delay: -11, dx: -13, dy: -24 },
  { x: 598, y: 682, r: 3.6, dur: 24, delay: -2, dx: 18, dy: -26 },
  { x: 716, y: 618, r: 3.1, dur: 30, delay: -17, dx: -15, dy: -32 },
  { x: 844, y: 664, r: 3.5, dur: 26, delay: -8, dx: 12, dy: -28 },
  { x: 948, y: 596, r: 3, dur: 34, delay: -21, dx: -17, dy: -22 },
] as const;

// Leaf clusters, keyed by frame. Each hangs off a branch and turns on its own
// clock; `tilt` stays under two degrees because anything more reads as wind.
const LEFT_LEAVES = [
  { d: 'M66 78 C96 56 140 64 154 90 C128 110 86 106 66 78 Z', dur: 11.4, delay: -3.2, tilt: 1.5 },
  { d: 'M114 146 C142 126 184 132 200 156 C176 176 134 178 114 146 Z', dur: 8.9, delay: -6.1, tilt: 1.8 },
  { d: 'M186 180 C212 164 250 170 264 192 C242 210 204 210 186 180 Z', dur: 13.2, delay: -1.4, tilt: 1.2 },
] as const;

const RIGHT_LEAVES = [
  { d: 'M146 62 C176 40 220 48 234 74 C208 94 166 90 146 62 Z', dur: 12.6, delay: -5.4, tilt: 1.4 },
  { d: 'M100 170 C128 150 170 156 186 180 C162 200 120 202 100 170 Z', dur: 9.7, delay: -2.3, tilt: 1.9 },
  { d: 'M36 206 C62 190 100 196 114 218 C92 236 54 236 36 206 Z', dur: 14.1, delay: -7.8, tilt: 1.1 },
] as const;

// Five lanterns: two per trunk and one on the near bridge post. Each gets its
// own cycle, so the clearing never pulses as a single unit.
const LEFT_LANTERNS = [
  { x: 176, y: 206, dur: 6.4, delay: -1.3 },
  { x: 182, y: 420, dur: 8.7, delay: -4.6 },
] as const;

const RIGHT_LANTERNS = [
  { x: 122, y: 262, dur: 7.6, delay: -2.8 },
  { x: 152, y: 486, dur: 9.9, delay: -6.2 },
] as const;

// One glyph, drawn once in <defs> and instanced with <use>: five lanterns and
// eight ferns cost one node each this way, and per-instance custom properties
// still inherit into the shadow tree.
const FERN_GLYPH =
  'M0 0 C-3 -30 -3 -58 0 -92 M0 -14 C-10 -22 -16 -30 -20 -40 M0 -14 C10 -22 16 -30 20 -40 ' +
  'M0 -34 C-9 -42 -15 -50 -18 -60 M0 -34 C9 -42 15 -50 18 -60 ' +
  'M0 -52 C-7 -60 -12 -66 -14 -76 M0 -52 C7 -60 12 -66 14 -76 ' +
  'M0 -68 C-5 -76 -8 -80 -9 -88 M0 -68 C5 -76 8 -80 9 -88';

export function ForestScene() {
  return (
    <div aria-hidden="true" className="ourdiary-scene scene-forest">
      <svg className="fr-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="fr-sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop className="fr-sky-0" offset="0%" />
            <stop className="fr-sky-1" offset="55%" />
            <stop className="fr-sky-2" offset="100%" />
          </linearGradient>

          <radialGradient id="fr-clearing-grad">
            <stop className="fr-clearing-0" offset="0%" />
            <stop className="fr-clearing-1" offset="52%" />
            <stop className="fr-clearing-2" offset="100%" />
          </radialGradient>

          <radialGradient id="fr-halo-grad">
            <stop className="fr-halo-0" offset="0%" />
            <stop className="fr-halo-1" offset="42%" />
            <stop className="fr-halo-2" offset="100%" />
          </radialGradient>

          <linearGradient id="fr-ground-grad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop className="fr-ground-0" offset="0%" />
            <stop className="fr-ground-1" offset="46%" />
          </linearGradient>

          <linearGradient id="fr-trail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop className="fr-trail-0" offset="0%" />
            <stop className="fr-trail-1" offset="100%" />
          </linearGradient>

          <g id="fr-fern">
            <path className="fr-frond" d={FERN_GLYPH} />
          </g>

          <g id="fr-lantern">
            <circle className="fr-halo" cy="-4" r="30" />
            <line className="fr-hook" x1="0" y1="-32" x2="0" y2="-16" />
            <path className="fr-lantern-body" d="M-9 -16 H9 L7 8 H-7 Z" />
            <path className="fr-lantern-cap" d="M-12 -16 H12" />
            <circle className="fr-lantern-core" cy="-4" r="4.6" />
          </g>
        </defs>

        <rect className="fr-sky" x="0" y="0" width="1200" height="800" />

        {/* Centred slightly right of the frame so the cottage sits in the light
            rather than behind the app content. */}
        <ellipse className="fr-clearing" cx="690" cy="436" rx="430" ry="236" />

        <g className="fr-drift-far" style={vars({ '--dur': '38s', '--drift': 2 })}>
          <path
            className="fr-canopy"
            d="M-20 -20 H1220 V132 C1118 196 1040 138 952 184 C862 232 792 160 700 196 C610 232 538 166 448 202 C358 238 282 172 192 206 C120 234 58 198 -20 166 Z"
          />
          <path
            className="fr-far"
            d="M-20 456 L36 318 L90 456 L148 292 L210 456 L258 330 L316 456 L370 300 L428 456 L484 338 L540 456 L596 296 L654 456 L706 334 L762 456 L814 288 L872 456 L924 330 L978 456 L1032 300 L1090 456 L1140 336 L1220 456 L1220 520 L-20 520 Z"
          />
        </g>

        {/* The cottage sits in the gap between the two mid-ground clusters, so
            it has to be drawn before them. It is small on purpose: distance is
            what makes the lit window read as a destination. */}
        <g>
          <circle className="fr-halo" cx="680" cy="416" r="46" style={vars({ '--dur': '10.8s', '--delay': '-2.6s' })} />
          <rect className="fr-near" x="648" y="392" width="100" height="62" />
          <path className="fr-near" d="M638 398 L698 350 L758 398 Z" />
          <rect className="fr-near" x="726" y="356" width="12" height="24" />
          <rect className="fr-window" x="668" y="408" width="22" height="18" rx="2" style={vars({ '--dur': '13s' })} />
          <rect className="fr-door" x="708" y="414" width="16" height="40" rx="2" />
        </g>

        <g className="fr-drift-mid" style={vars({ '--dur': '29s', '--drift': 4 })}>
          <path
            className="fr-mid"
            d="M-20 560 L-20 516 L26 282 L82 516 L130 246 L194 516 L240 302 L298 516 L348 266 L412 516 L458 324 L516 516 L556 362 L586 560 Z"
          />
          <path
            className="fr-mid"
            d="M1220 560 L1220 516 L1184 288 L1130 516 L1082 250 L1018 516 L970 304 L914 516 L864 262 L804 516 L766 354 L744 560 Z"
          />
          {/* Two moss-flanked trunks carry the clusters down to the floor. */}
          <path className="fr-mid" d="M322 300 L340 300 L348 470 L318 470 Z" />
          <path className="fr-moss" d="M338 310 C344 370 346 420 347 466 L340 466 C338 418 336 368 332 310 Z" />
          <path className="fr-mid" d="M862 292 L880 292 L886 474 L856 474 Z" />
          <path className="fr-moss" d="M860 302 C856 364 856 420 858 470 L866 470 C862 420 862 364 866 302 Z" />
        </g>

        <path
          className="fr-ground"
          d="M-20 450 C200 466 420 452 620 460 C820 468 1020 454 1220 446 L1220 820 L-20 820 Z"
        />

        {/* A shallow brook: the bridge needs something to cross, and the pale
            band is the one place the floor catches sky light. */}
        <path
          className="fr-brook"
          d="M-20 664 C180 638 360 652 520 628 C700 602 900 624 1220 604 L1220 698 C900 722 700 698 520 720 C360 740 180 726 -20 750 Z"
        />

        {/* The trail: wide at the reader's feet, narrowing to the cottage door.
            It leads the eye through the frame without crossing the centre. */}
        <path
          className="fr-trail"
          d="M430 820 C462 760 486 712 504 660 C524 602 556 568 596 528 C632 492 674 466 706 452 L724 454 C706 488 672 506 650 540 C620 586 628 640 640 700 C648 752 666 790 690 820 Z"
        />

        <g className="fr-drift-near" style={vars({ '--dur': '23s', '--drift': 2.5 })}>
          <g>
            <path className="fr-deck" d="M466 690 C560 648 700 634 804 612 L808 632 C706 652 566 668 470 708 Z" />
            <path className="fr-rail" d="M470 654 C566 612 702 598 804 578" />
            <line className="fr-post" x1="500" y1="680" x2="500" y2="640" />
            <line className="fr-post" x1="636" y1="652" x2="636" y2="612" />
            <line className="fr-post" x1="776" y1="624" x2="776" y2="584" />
            <line className="fr-plank" x1="540" y1="676" x2="536" y2="654" />
            <line className="fr-plank" x1="624" y1="658" x2="620" y2="636" />
            <line className="fr-plank" x1="712" y1="642" x2="708" y2="620" />
          </g>
          <use href="#fr-lantern" x="500" y="634" style={vars({ '--dur': '7.1s', '--delay': '-3.4s' })} />

          {/* Undergrowth. The dark band at the bottom is what gives the trail
              somewhere to start and keeps the lower edge from floating. */}
          <path
            className="fr-near"
            d="M-20 820 C120 744 268 776 384 760 C502 744 566 782 700 772 C842 762 980 736 1220 764 L1220 820 Z"
          />
          {FERNS.map((f) => (
            <use
              key={`fern-${f.x}`}
              href="#fr-fern"
              transform={`translate(${f.x} ${f.y}) scale(${f.s})`}
              style={vars({ '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, '--tilt': f.tilt })}
            />
          ))}
        </g>

        {FIREFLIES.map((f) => (
          <circle
            key={`fly-${f.x}`}
            className="fr-firefly"
            cx={f.x}
            cy={f.y}
            r={f.r}
            style={vars({ '--dur': `${f.dur}s`, '--delay': `${f.delay}s`, '--dx': f.dx, '--dy': f.dy })}
          />
        ))}
      </svg>

      {/* Frames crop from their own outer edge so the trunk stays flush with
          the screen edge whatever the viewport width. */}
      <svg className="fr-frame fr-frame-left" viewBox="0 0 300 800" preserveAspectRatio="xMinYMax slice">
        <path
          className="fr-near"
          d="M-10 800 L-10 -10 L98 -10 C106 118 92 210 86 300 C78 400 86 520 104 640 C114 708 124 758 138 800 Z"
        />
        <path className="fr-moss" d="M74 318 C66 410 74 512 88 610 C96 672 104 726 114 790 L94 790 C84 726 74 666 66 606 C56 508 56 408 64 318 Z" />
        <path className="fr-moss" d="M82 118 C74 168 76 220 84 268 C90 220 90 168 90 118 Z" />
        <path className="fr-branch" strokeWidth="13" d="M92 146 C140 160 186 178 250 206" />
        <path className="fr-branch" strokeWidth="9" d="M86 352 C126 362 162 376 210 400" />
        {LEFT_LEAVES.map((l) => (
          <path
            key={`ll-${l.dur}`}
            className="fr-leaf"
            d={l.d}
            style={vars({ '--dur': `${l.dur}s`, '--delay': `${l.delay}s`, '--tilt': l.tilt })}
          />
        ))}
        {LEFT_LANTERNS.map((l) => (
          <use
            key={`lt-${l.y}`}
            href="#fr-lantern"
            x={l.x}
            y={l.y}
            style={vars({ '--dur': `${l.dur}s`, '--delay': `${l.delay}s` })}
          />
        ))}
        <use
          href="#fr-fern"
          transform="translate(168 792) scale(1.2)"
          style={vars({ '--dur': '10.6s', '--delay': '-4.1s', '--tilt': 1.6 })}
        />
      </svg>

      <svg className="fr-frame fr-frame-right" viewBox="0 0 300 800" preserveAspectRatio="xMaxYMax slice">
        <path
          className="fr-near"
          d="M310 800 L310 -10 L202 -10 C194 104 210 204 216 300 C224 404 214 524 196 644 C186 710 174 760 162 800 Z"
        />
        <path className="fr-moss" d="M214 330 C222 418 214 516 200 612 C192 672 184 728 176 790 L194 790 C204 728 214 668 222 608 C232 510 232 412 224 330 Z" />
        <path className="fr-moss" d="M208 140 C216 188 214 238 206 284 C200 238 200 188 200 140 Z" />
        <path className="fr-branch" strokeWidth="12" d="M208 196 C162 210 118 228 56 252" />
        <path className="fr-branch" strokeWidth="8" d="M214 430 C178 440 148 452 110 472" />
        {RIGHT_LEAVES.map((l) => (
          <path
            key={`rl-${l.dur}`}
            className="fr-leaf"
            d={l.d}
            style={vars({ '--dur': `${l.dur}s`, '--delay': `${l.delay}s`, '--tilt': l.tilt })}
          />
        ))}
        {RIGHT_LANTERNS.map((l) => (
          <use
            key={`rt-${l.y}`}
            href="#fr-lantern"
            x={l.x}
            y={l.y}
            style={vars({ '--dur': `${l.dur}s`, '--delay': `${l.delay}s` })}
          />
        ))}
        <use
          href="#fr-fern"
          transform="translate(142 794) scale(1.25)"
          style={vars({ '--dur': '12.8s', '--delay': '-2.7s', '--tilt': 1.4 })}
        />
      </svg>
    </div>
  );
}

export default ForestScene;
