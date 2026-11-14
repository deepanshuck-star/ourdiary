'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import {
  SCENES,
  CROSSFADE_MS,
  RAIN_SLANT,
  advanceStreak,
  makeRain,
  nextSceneIndex,
  previousSceneIndex,
  timeWords,
  type RainStreak,
  type SceneId,
} from '@/lib/features/barsaat';

/* ------------------------------------------------------------------ */
/* Shared ink pieces                                                   */
/* ------------------------------------------------------------------ */

const TEAR = 'M0 -7 C 2.6 -2.6 4.6 0.6 4.6 3.6 A 4.6 4.6 0 0 1 -4.6 3.6 C -4.6 0.6 -2.6 -2.6 0 -7 Z';
const HEART = 'M0 8 C -12 -1 -15 -10 -8 -14 C -3 -16.5 0 -13 0 -10.5 C 0 -13 3 -16.5 8 -14 C 15 -10 12 -1 0 8 Z';

/**
 * The filters every drawing shares. Stipple turns a soft-edged fill into
 * dots whose density follows the fill's opacity, which is what makes the
 * shapes read as pen-and-ink rather than vector art.
 */
function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <filter id="bs-stipple" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.9 0 0 0 -0.45" result="dots" />
          <feComposite in="SourceGraphic" in2="dots" operator="in" result="speck" />
          <feComponentTransfer in="speck">
            <feFuncA type="discrete" tableValues="0 0 1 1 1" />
          </feComponentTransfer>
        </filter>
        {/* A rougher edge for ink lines, so nothing is ruler-straight. */}
        <filter id="bs-rough" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="9" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.2" />
        </filter>
        <linearGradient id="bs-shade-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f1813" stopOpacity="0.25" />
          <stop offset="1" stopColor="#1f1813" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="bs-shade-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f1813" stopOpacity="1" />
          <stop offset="0.7" stopColor="#1f1813" stopOpacity="0.45" />
          <stop offset="1" stopColor="#1f1813" stopOpacity="0.15" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** An ink line that runs down from (x, y), then lets a drop go. */
function Drip({
  x,
  y,
  length,
  delay,
  color = '#1f1813',
  width = 2.2,
}: {
  x: number;
  y: number;
  length: number;
  delay: number;
  color?: string;
  width?: number;
}) {
  // A slight wobble so it looks like it found its own way down.
  const w = (length % 7) - 3;
  const d = `M${x} ${y} C ${x + w} ${y + length * 0.35}, ${x - w} ${y + length * 0.65}, ${x} ${y + length}`;
  const style = { '--d': `${delay}ms` } as React.CSSProperties;
  return (
    <g style={style}>
      <path className="bs-drip" d={d} pathLength={1} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" />
      <g transform={`translate(${x} ${y + length + 4})`}>
        <path className="bs-drop" d={TEAR} fill={color} />
      </g>
    </g>
  );
}

/** Lines that bleed into the paper one word at a time. */
function InkLines({ lines, className = '' }: { lines: string[]; className?: string }) {
  const words = timeWords(lines);
  return (
    <p className={`bs-lines ${className}`}>
      {lines.map((_, lineIndex) => (
        <span key={lineIndex} className="bs-line">
          {words
            .filter((word) => word.line === lineIndex)
            .map((word, i) => (
              <span key={i} className="bs-word" style={{ '--d': `${word.delay}ms` } as React.CSSProperties}>
                {word.text}{' '}
              </span>
            ))}
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

function TitleScene() {
  return (
    <div className="bs-split">
      <div className="bs-titleblock">
        <h1 className="bs-title">
          <span className="bs-title-ink">बरसात</span>
          <span className="bs-title-drips" aria-hidden="true">
            {[
              { left: '17%', len: 22, delay: 2100 },
              { left: '52%', len: 34, delay: 2600 },
              { left: '86%', len: 14, delay: 3000 },
            ].map((drip) => (
              <svg key={drip.left} viewBox="-6 0 12 50" style={{ left: drip.left }}>
                <Drip x={0} y={0} length={drip.len} delay={drip.delay} color="#8e1b1b" width={2.6} />
              </svg>
            ))}
          </span>
        </h1>
        <p className="bs-subtitle bs-fade" style={{ '--d': '2400ms' } as React.CSSProperties}>
          हमारी डायरी
        </p>
      </div>

      <svg className="bs-art bs-cloud" viewBox="0 0 400 330" aria-hidden="true">
        <g className="bs-fade" style={{ '--d': '300ms' } as React.CSSProperties}>
          <g filter="url(#bs-stipple)">
            <path
              d="M70 150 C 40 150 32 108 66 100 C 62 62 112 46 138 70 C 152 30 222 26 238 66 C 262 40 318 52 316 96 C 356 96 366 150 324 156 Z"
              fill="url(#bs-shade-down)"
            />
          </g>
          <path
            d="M70 150 C 40 150 32 108 66 100 C 62 62 112 46 138 70 C 152 30 222 26 238 66 C 262 40 318 52 316 96 C 356 96 366 150 324 156"
            fill="none"
            stroke="#1f1813"
            strokeWidth="1.6"
            strokeLinecap="round"
            filter="url(#bs-rough)"
            opacity="0.85"
          />
        </g>
        <Drip x={112} y={150} length={70} delay={1200} />
        <Drip x={168} y={152} length={142} delay={1600} />
        <Drip x={214} y={153} length={46} delay={2000} />
        <Drip x={262} y={154} length={104} delay={1400} />
        <Drip x={304} y={156} length={36} delay={2400} />
      </svg>
    </div>
  );
}

function UmbrellaScene({ lines }: { lines: string[] }) {
  const canopy =
    'M60 170 Q 200 -20 340 170 Q 305 146 270 170 Q 235 146 200 170 Q 165 146 130 170 Q 95 146 60 170 Z';
  return (
    <div className="bs-stack">
      <svg className="bs-art bs-umbrella" viewBox="0 0 400 380" aria-hidden="true">
        <g className="bs-fade" style={{ '--d': '200ms' } as React.CSSProperties}>
          <g filter="url(#bs-stipple)">
            <path d={canopy} fill="url(#bs-shade-up)" />
          </g>
          <g fill="none" stroke="#1f1813" strokeLinecap="round" filter="url(#bs-rough)">
            <path d={canopy} strokeWidth="1.8" />
            <path d="M200 58 Q 160 100 130 170 M200 58 L200 170 M200 58 Q 240 100 270 170" strokeWidth="1.1" opacity="0.7" />
            <path d="M200 58 L200 40" strokeWidth="2.4" />
            <path d="M200 170 L200 300 q 0 26 -22 26 q -14 0 -14 -14" strokeWidth="3" />
          </g>
        </g>

        {/* Two small hearts sheltering underneath: one ink, one red. */}
        <g className="bs-fade" style={{ '--d': '1300ms' } as React.CSSProperties}>
          {/* CSS transforms replace an SVG transform attribute, so the
              bobbing sits on an inner group and the placement on the outer. */}
          <g transform="translate(176 232)">
            <g className="bs-bob">
              <path d={HEART} fill="#1f1813" />
            </g>
          </g>
          <g transform="translate(226 236)">
            <g className="bs-bob bs-bob-late">
              <path d={HEART} fill="#8e1b1b" />
            </g>
          </g>
        </g>

        <Drip x={60} y={170} length={40} delay={900} />
        <Drip x={130} y={170} length={64} delay={1300} />
        <Drip x={270} y={170} length={52} delay={1100} />
        <Drip x={340} y={170} length={30} delay={1600} />

        {/* Where the drops land. */}
        <g fill="none" stroke="#1f1813" strokeWidth="1">
          {[
            { cx: 70, delay: 0 },
            { cx: 330, delay: 900 },
            { cx: 140, delay: 1700 },
            { cx: 262, delay: 2500 },
          ].map((r) => (
            <ellipse
              key={r.cx}
              className="bs-ripple"
              cx={r.cx}
              cy={352}
              rx={22}
              ry={5}
              style={{ '--d': `${r.delay}ms` } as React.CSSProperties}
            />
          ))}
        </g>
      </svg>
      <InkLines lines={lines} className="bs-lines-center" />
    </div>
  );
}

/** A rainy night across the water, seen through a soft oval. */
function CityOval() {
  const lights = [
    [12, 44, 9], [20, 49, 6], [27, 42, 11], [34, 47, 7], [41, 43, 8], [49, 50, 5], [55, 41, 12],
    [62, 48, 7], [69, 44, 9], [76, 49, 6], [83, 42, 10], [89, 47, 7], [17, 53, 5], [65, 53, 5],
  ];
  return (
    <div className="bs-oval bs-fade" style={{ '--d': '200ms' } as React.CSSProperties} aria-hidden="true">
      <div className="bs-city-sky" />
      <svg className="bs-city-skyline" viewBox="0 0 300 400" preserveAspectRatio="none">
        <g filter="url(#bs-stipple)" fill="#1f1813" opacity="0.75">
          <path d="M0 230 L0 168 L22 168 L22 150 L40 150 L40 176 L58 176 L58 132 L80 132 L80 160 L96 160 L96 176 L118 176 L118 140 L132 128 L146 140 L146 182 L166 182 L166 150 L190 150 L190 166 L210 166 L210 120 L232 120 L232 170 L252 170 L252 148 L274 148 L274 172 L300 172 L300 230 Z" />
        </g>
      </svg>
      {lights.map(([x, y, s], i) => (
        <span
          key={i}
          className="bs-bokeh"
          style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, '--d': `${(i % 5) * 600}ms` } as React.CSSProperties}
        />
      ))}
      <div className="bs-city-water" />
      {lights.slice(0, 8).map(([x, , s], i) => (
        <span key={`r${i}`} className="bs-reflection" style={{ left: `${x}%`, width: s * 1.4 }} />
      ))}
      <svg className="bs-boat" viewBox="-40 -40 80 60">
        <g filter="url(#bs-rough)" stroke="#1f1813" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M-30 0 L30 0 L22 12 L-22 12 Z" fill="#efe6d3" />
          <path d="M-12 0 L0 -26 L12 0 Z" fill="#e4d8c0" />
          <path d="M0 -26 L0 0" />
        </g>
      </svg>
      <div className="bs-oval-rain" />
    </div>
  );
}

function CityScene({ lines }: { lines: string[] }) {
  return (
    <div className="bs-split">
      <InkLines lines={lines} />
      <CityOval />
    </div>
  );
}

/** A misted window with a heart drawn on it, drops running down the glass. */
function WindowOval() {
  const runs = [
    { x: 14, d: 0, len: 46 }, { x: 31, d: 1900, len: 30 }, { x: 47, d: 900, len: 58 },
    { x: 63, d: 2600, len: 38 }, { x: 78, d: 400, len: 50 }, { x: 89, d: 3300, len: 26 },
  ];
  return (
    <div className="bs-oval bs-window bs-fade" style={{ '--d': '200ms' } as React.CSSProperties} aria-hidden="true">
      <div className="bs-window-glass" />
      {runs.map((r) => (
        <span key={r.x} className="bs-run" style={{ left: `${r.x}%`, height: `${r.len}%`, '--d': `${r.d}ms` } as React.CSSProperties} />
      ))}
      <svg className="bs-window-heart" viewBox="-30 -30 60 60">
        <path
          className="bs-draw"
          d="M0 14 C -18 2 -24 -12 -13 -19 C -6 -23 0 -18 0 -13 C 0 -18 6 -23 13 -19 C 24 -12 18 2 0 14 Z"
          pathLength={1}
          fill="none"
          stroke="#f6efe0"
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ '--d': '1200ms' } as React.CSSProperties}
        />
      </svg>
      <div className="bs-window-frame" />
    </div>
  );
}

function WindowScene({ lines }: { lines: string[] }) {
  return (
    <div className="bs-split bs-split-reverse">
      <WindowOval />
      <InkLines lines={lines} />
    </div>
  );
}

function TogetherScene({ lines }: { lines: string[] }) {
  return (
    <div className="bs-stack bs-together">
      <InkLines lines={lines} className="bs-lines-center bs-lines-big" />
      <svg className="bs-art bs-closing-heart" viewBox="-40 -40 80 110" aria-hidden="true">
        <path
          className="bs-draw"
          d={HEART}
          transform="scale(2)"
          pathLength={1}
          fill="none"
          stroke="#8e1b1b"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ '--d': '3600ms' } as React.CSSProperties}
        />
        <Drip x={0} y={16} length={40} delay={5000} color="#8e1b1b" width={2.6} />
      </svg>
      <p className="bs-signature bs-fade" style={{ '--d': '5200ms' } as React.CSSProperties}>
        — हमारी डायरी
      </p>
    </div>
  );
}

function SceneBody({ id, lines }: { id: SceneId; lines: string[] }) {
  switch (id) {
    case 'title':
      return <TitleScene />;
    case 'umbrella':
      return <UmbrellaScene lines={lines} />;
    case 'city':
      return <CityScene lines={lines} />;
    case 'window':
      return <WindowScene lines={lines} />;
    case 'together':
      return <TogetherScene lines={lines} />;
  }
}

/* ------------------------------------------------------------------ */
/* Weather                                                             */
/* ------------------------------------------------------------------ */

function motionIsOff() {
  return document.documentElement.dataset.motion === 'off';
}

/** Pencil-thin slanted rain over everything, drawn on one canvas. */
function Rain({ paused }: { paused: boolean }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pausedRef = React.useRef(paused);
  const wakeRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    pausedRef.current = paused;
    wakeRef.current();
  }, [paused]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let streaks: RainStreak[] = [];
    let frame = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      streaks = makeRain(width, height);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      for (const s of streaks) {
        ctx.strokeStyle = `rgba(58, 44, 30, ${s.alpha})`;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.length * RAIN_SLANT, s.y - s.length);
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (pausedRef.current || motionIsOff() || document.hidden) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      streaks = streaks.map((s) => advanceStreak(s, dt, width, height));
      draw();
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || pausedRef.current || motionIsOff()) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    resize();
    wake();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const motionObserver = new MutationObserver(wake);
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    document.addEventListener('visibilitychange', wake);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      motionObserver.disconnect();
      document.removeEventListener('visibilitychange', wake);
      wakeRef.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} className="bs-rain" aria-hidden="true" />;
}

const LEAVES = [
  { left: 8, size: 18, dur: 17, delay: -2, sway: 60 },
  { left: 23, size: 12, dur: 21, delay: -11, sway: -40 },
  { left: 41, size: 15, dur: 19, delay: -6, sway: 50 },
  { left: 58, size: 11, dur: 23, delay: -15, sway: -55 },
  { left: 72, size: 20, dur: 18, delay: -9, sway: 45 },
  { left: 86, size: 13, dur: 22, delay: -4, sway: -50 },
  { left: 94, size: 16, dur: 20, delay: -13, sway: 35 },
];

/** A few stippled leaves drifting down across the page. */
function Leaves() {
  return (
    <div className="bs-leaves" aria-hidden="true">
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className="bs-leaf"
          style={
            {
              left: `${leaf.left}%`,
              width: leaf.size,
              height: leaf.size * 2,
              '--dur': `${leaf.dur}s`,
              '--d': `${leaf.delay}s`,
              '--sway': `${leaf.sway}px`,
              // Where it rests when the scenery is still.
              '--rest': `${12 + ((i * 37) % 70)}%`,
            } as React.CSSProperties
          }
        >
          <svg viewBox="-8 -16 16 32">
            <g filter="url(#bs-stipple)">
              <path d="M0 -15 C 7 -7 7 7 0 15 C -7 7 -7 -7 0 -15 Z" fill="url(#bs-shade-down)" />
            </g>
            <path d="M0 -13 L0 14" stroke="#1f1813" strokeWidth="0.7" opacity="0.6" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The film                                                            */
/* ------------------------------------------------------------------ */

export function BarsaatFilm() {
  // `take` is bumped on every cut, so a scene seen twice replays from its
  // first frame. `leaving` is the scene fading out underneath the new one.
  const [film, setFilm] = React.useState<{
    index: number;
    take: number;
    leaving: { index: number; take: number } | null;
  }>({ index: 0, take: 0, leaving: null });
  const { index, take, leaving } = film;
  const [paused, setPaused] = React.useState(false);

  // What is left of the current take when it was paused part-way through.
  const remaining = React.useRef<{ take: number; ms: number }>({ take: 0, ms: SCENES[0].duration });

  /** Cuts to the scene `pick` chooses from the one showing now. */
  const cut = React.useCallback((pick: (from: number) => number) => {
    setFilm((f) => {
      const to = pick(f.index);
      if (to === f.index) return f;
      return { index: to, take: f.take + 1, leaving: { index: f.index, take: f.take } };
    });
  }, []);

  // Let the outgoing scene finish fading before it is taken away.
  React.useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => setFilm((f) => ({ ...f, leaving: null })), CROSSFADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  // The scene clock. Pausing keeps what is left, so play carries on from
  // where it stopped rather than starting the scene over.
  React.useEffect(() => {
    if (paused) return;
    const ms = remaining.current.take === take ? remaining.current.ms : SCENES[index].duration;
    const started = performance.now();
    const t = window.setTimeout(() => cut(nextSceneIndex), Math.max(0, ms));
    return () => {
      window.clearTimeout(t);
      remaining.current = { take, ms: ms - (performance.now() - started) };
    };
  }, [index, take, paused, cut]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') cut(nextSceneIndex);
      else if (event.key === 'ArrowLeft') cut(previousSceneIndex);
      else if (event.key === ' ') {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cut]);

  const shown = [
    ...(leaving && leaving.index !== index ? [{ ...leaving, active: false }] : []),
    { index, take, active: true },
  ];

  return (
    <main
      className={`bs-film${paused ? ' is-paused' : ''}`}
      onClick={(event) => {
        // A tap on the page moves the story on; taps on the controls do not.
        if ((event.target as HTMLElement).closest('a, button')) return;
        cut(nextSceneIndex);
      }}
    >
      <InkDefs />
      <div className="bs-paper" aria-hidden="true" />

      {shown.map((s) => {
        const scene = SCENES[s.index];
        return (
          <section
            key={`${scene.id}-${s.take}`}
            className={`bs-scene${s.active ? ' is-active' : ' is-leaving'}`}
            aria-hidden={!s.active}
          >
            <SceneBody id={scene.id} lines={scene.lines} />
          </section>
        );
      })}

      <Leaves />
      <Rain paused={paused} />
      <div className="bs-vignette" aria-hidden="true" />

      <nav className="bs-controls">
        <Link href="/dashboard" className="bs-button" aria-label="Back to the diary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <button
          type="button"
          className="bs-button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </nav>

      <div className="bs-progress">
        {SCENES.map((scene, i) => (
          <button
            key={scene.id}
            type="button"
            className={`bs-dot${i === index ? ' is-current' : ''}`}
            onClick={() => cut(() => i)}
            aria-label={`Scene ${i + 1}`}
            aria-current={i === index ? 'step' : undefined}
          />
        ))}
      </div>
    </main>
  );
}

export default BarsaatFilm;
