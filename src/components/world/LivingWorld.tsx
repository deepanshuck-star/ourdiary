'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/world.css';
import { useDiary } from '@/store/DiaryContext';
import { usePresence } from '@/components/providers/PresenceProvider';
import { useNow } from '@/hooks/useNow';
import {
  PHASE_LIGHT,
  SEASON_FOLIAGE,
  WORLD_PLACES,
  dreamFlags,
  greetingFor,
  hashSeed,
  lettersWaiting,
  lifeFor,
  memorySaplings,
  resolvePhase,
  resolveSeason,
  scatter,
  weatherVeil,
  type DayPhase,
  type Season,
  type Weather,
  type WorldPlace,
} from '@/lib/world/world';
import {
  loadWorldPreferences,
  saveWorldPreferences,
  type WorldPreferences,
} from '@/lib/world/preferences';
import { WorldControls } from './WorldControls';

// The world's own palette, from the brief. Fixed rather than taken from the
// app theme: this is a handmade object sitting on the page, and it should
// look like the same keepsake whichever theme frames it.
const W = {
  paper: '#FDFBF7',
  ink: '#2A2420',
  terracotta: '#C46F57',
  teal: '#357C78',
  forest: '#56775C',
  sky: '#A8CAD7',
  gold: '#E9C785',
  night: '#252A30',
  wood: '#8A5A3C',
  stone: '#D8CFC2',
};

// Partner colours. Both figures are drawn identically apart from these, so
// neither partner is the default and the other the variation. Customisation
// (hair, skin tone, clothes) is the next phase; until then the figures are
// deliberately simple rather than guessing at who someone is.
const PARTNER_ONE = W.terracotta;
const PARTNER_TWO = W.teal;
const SKIN = '#E7C3A1';

// Everything that matters sits inside x 140–860. A 4:3 phone crops the
// 1000-wide scene to roughly x 126–873, and the first version of every
// scenery piece in this app that ignored that lost its best detail on the
// device most couples use.
const VIEW_W = 1000;
const VIEW_H = 560;

const PLACES: Record<string, WorldPlace> = Object.fromEntries(WORLD_PLACES.map((p) => [p.id, p]));

const PHASE_NAME: Record<DayPhase, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
const WEATHER_NAME: Record<Weather, string> = { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', fog: 'Fog', snow: 'Snow', windy: 'Windy' };
const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

// Fixed shapes, so the composition is authored rather than random. The
// creatures that move use seeded scatter; the land does not.
const PEAKS: [number, number][] = [[230, 140], [410, 160], [590, 150], [760, 130], [940, 165]];
// Low enough to survive the 16:7 crop, which takes ~60 units off the top.
const CLOUD_ROWS = [104, 128, 152, 116, 140];

type Ripple = { id: number; x: number; y: number };

function localIsoDate(epoch: number): string {
  const d = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromIso: string, toEpoch: number): number | null {
  const from = Date.parse(`${fromIso}T00:00:00`);
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((toEpoch - from) / 86_400_000));
}

// ------------------------------------------------------------- pieces ---

function Cloud({ dark, night }: { dark: boolean; night: boolean }) {
  // Clouds sit above the relight, so they need the hour's colour themselves.
  const fill = night ? '#3E4652' : dark ? '#9AA4AD' : W.paper;
  return (
    <g opacity={night ? 0.8 : dark ? 0.85 : 0.92}>
      <ellipse cx={0} cy={0} rx={46} ry={15} fill={fill} />
      <ellipse cx={-22} cy={-8} rx={22} ry={14} fill={fill} />
      <ellipse cx={14} cy={-12} rx={26} ry={17} fill={fill} />
    </g>
  );
}

function Tree({ x, base, season, scale = 1, swayDuration }: { x: number; base: number; season: Season; scale?: number; swayDuration: number }) {
  const f = SEASON_FOLIAGE[season];
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x={-6} y={-70} width={12} height={70} rx={3} fill="#6B4A35" />
      <g className="lw-sway" style={{ animationDuration: `${swayDuration}s` }}>
        {season === 'winter' ? (
          // Bare branches with a little snow, not a green tree in December.
          <g stroke="#6B4A35" strokeWidth={4} strokeLinecap="round" fill="none">
            <path d="M0,-60 L-22,-92" />
            <path d="M0,-66 L20,-98" />
            <path d="M-12,-78 L-30,-80" />
            <path d="M10,-82 L28,-86" />
            <path d="M0,-70 L2,-104" />
            <path d="M-22,-92 L-24,-94" stroke={W.paper} strokeWidth={5} />
            <path d="M20,-98 L22,-100" stroke={W.paper} strokeWidth={5} />
          </g>
        ) : (
          <g>
            <circle cx={0} cy={-92} r={36} fill={f.canopy} />
            <circle cx={-24} cy={-74} r={24} fill={f.canopy} />
            <circle cx={24} cy={-76} r={26} fill={f.canopy} />
            <circle cx={-8} cy={-102} r={18} fill={f.canopyLight} opacity={0.75} />
            {season === 'spring' && (
              <g fill={f.accent}>
                <circle cx={-18} cy={-96} r={3} />
                <circle cx={12} cy={-108} r={3} />
                <circle cx={22} cy={-82} r={3} />
                <circle cx={-26} cy={-72} r={3} />
              </g>
            )}
          </g>
        )}
      </g>
    </g>
  );
}

function Partner({ x, color, lean, name }: { x: number; color: string; lean: number; name: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <title>{name}</title>
      <g className="lw-breathe">
        <rect x={-7} y={414} width={5} height={18} rx={2} fill={W.ink} />
        <rect x={2} y={414} width={5} height={18} rx={2} fill={W.ink} />
        <rect x={-10} y={393} width={20} height={26} rx={9} fill={color} />
        <g transform={`rotate(${lean} 0 392)`}>
          <circle cx={0} cy={381} r={9.5} fill={SKIN} />
          <path d="M-10,381 C-11,366 11,366 10,381 C6,374 -6,374 -10,381 Z" fill={W.ink} />
        </g>
      </g>
    </g>
  );
}

// ---------------------------------------------------------- hotspots ---

function Hotspot({
  place,
  onGo,
  onHover,
  shape,
}: {
  place: WorldPlace;
  onGo: (href: string) => void;
  onHover: (place: WorldPlace | null) => void;
  shape: { x: number; y: number; w: number; h: number };
}) {
  const label = `${place.label} — ${place.description}`;
  return (
    <g
      className="lw-hot"
      role="link"
      tabIndex={0}
      aria-label={label}
      onClick={() => onGo(place.href)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onGo(place.href);
        }
      }}
      onMouseEnter={() => onHover(place)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(place)}
      onBlur={() => onHover(null)}
    >
      <title>{label}</title>
      <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={14} fill="transparent" />
      {/* Two strokes so the ring reads on both a bright sky and a night one. */}
      <g className="lw-ring" pointerEvents="none">
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={14} fill="none" stroke={W.ink} strokeOpacity={0.45} strokeWidth={4} />
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={14} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="7 5" />
      </g>
    </g>
  );
}

// ------------------------------------------------------------- world ---

export function LivingWorld() {
  const router = useRouter();
  const { data, activeProfile, partnerProfile } = useDiary();
  const { available: presenceAvailable, partnerOnline } = usePresence();
  const now = useNow(60_000);

  const [prefs, setPrefs] = React.useState<WorldPreferences>(() => loadWorldPreferences());
  const [hovered, setHovered] = React.useState<WorldPlace | null>(null);
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const [startled, setStartled] = React.useState<number | null>(null);
  const [milestoneOpen, setMilestoneOpen] = React.useState(false);
  const [onscreen, setOnscreen] = React.useState(true);
  const rippleSeq = React.useRef(0);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Nothing animates while the world is scrolled out of view. Browsers
  // already throttle hidden tabs; this covers the much more common case of
  // the card simply being off the top of the page.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const updatePrefs = (next: WorldPreferences) => {
    setPrefs(next);
    saveWorldPreferences(next);
  };

  if (now === null) {
    // Until the clock is known, a quiet paper block rather than a guessed
    // sky that then jumps from noon to midnight.
    return <div className="living-world rounded-[2rem] aspect-[4/3] sm:aspect-[16/8]" style={{ background: W.paper }} aria-busy="true" />;
  }

  const date = new Date(now);
  const phase = resolvePhase(prefs.phase, date.getHours());
  const season = resolveSeason(prefs.season, date.getMonth());
  const weather = prefs.weather;
  const life = lifeFor(phase, season, weather);
  const light = PHASE_LIGHT[phase];
  const foliage = SEASON_FOLIAGE[season];
  const veil = weatherVeil(weather);
  const todayIso = localIsoDate(now);
  const daySeed = hashSeed(`${data.couple.id}:${todayIso}`);
  const greeting = greetingFor(activeProfile.name, phase, weather, daySeed);

  // Real things from the diary, and only real things.
  const waiting = lettersWaiting(data.letters, data.activeProfileId, todayIso);
  const flags = dreamFlags(data.bucketList);
  const saplings = memorySaplings(data.memories.length);
  const together = daysBetween(data.couple.startDate, now);
  const partnerHere = presenceAvailable && partnerOnline;

  // Seeded life: stable for the day, different tomorrow.
  const birds = scatter(daySeed ^ 0x1, life.birds, { x: 200, y: 92, w: 600, h: 70 }, { min: 22, max: 36 });
  const butterflies = scatter(daySeed ^ 0x2, life.butterflies, { x: 250, y: 360, w: 360, h: 34 }, { min: 5, max: 9 });
  const fireflies = scatter(daySeed ^ 0x3, life.fireflies, { x: 380, y: 340, w: 360, h: 96 }, { min: 6, max: 11 });
  const stars = life.stars ? scatter(daySeed ^ 0x4, 26, { x: 10, y: 10, w: 980, h: 190 }, { min: 3, max: 7 }) : [];
  const saplingSpots = scatter(hashSeed(data.couple.id) ^ 0x5, saplings, { x: 170, y: 306, w: 460, h: 14 }, { min: 9, max: 14 });
  const leaves = life.fallingLeaves ? scatter(daySeed ^ 0x6, 6, { x: 120, y: 230, w: 820, h: 40 }, { min: 9, max: 15 }) : [];
  const rain = weather === 'rain' ? scatter(daySeed ^ 0x7, 42, { x: 0, y: -60, w: 1000, h: 560 }, { min: 0.7, max: 1.1 }) : [];
  const snow = weather === 'snow' ? scatter(daySeed ^ 0x8, 36, { x: 0, y: -40, w: 1000, h: 560 }, { min: 9, max: 16 }) : [];
  const cloudCount = { clear: 2, windy: 3, cloudy: 5, rain: 5, fog: 3, snow: 4 }[weather];
  const clouds = scatter(daySeed ^ 0x9, cloudCount, { x: 140, y: 0, w: 720, h: 0 }, weather === 'windy' ? { min: 40, max: 60 } : { min: 90, max: 150 });

  const sunY = 80 + (1 - light.lightHeight) * 150;
  const night = phase === 'night';

  const go = (href: string) => router.push(href);

  const rippleAt = (event: React.MouseEvent<SVGPathElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const p = point.matrixTransform(ctm.inverse());
    const id = rippleSeq.current++;
    setRipples((list) => [...list.slice(-3), { id, x: p.x, y: p.y }]);
    window.setTimeout(() => setRipples((list) => list.filter((r) => r.id !== id)), 1600);
  };

  const startle = (index: number) => {
    setStartled(index);
    window.setTimeout(() => setStartled((current) => (current === index ? null : current)), 2400);
  };

  const sceneLabel = `Your little world: ${PHASE_NAME[phase].toLowerCase()}, ${WEATHER_NAME[weather].toLowerCase()}, ${SEASON_NAME[season].toLowerCase()}. A house on a hill, a river, and the two of you on a bench.`;

  return (
    <section
      ref={rootRef}
      className="living-world relative rounded-[2rem] overflow-hidden border shadow-card"
      data-onscreen={onscreen ? 'true' : 'false'}
      data-weather={weather}
      style={{ background: W.paper, borderColor: '#E7DCCB' }}
      aria-label="Your little world"
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/7]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
          role="group"
          aria-label={sceneLabel}
        >
          <defs>
            <linearGradient id="lw-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light.skyTop} />
              <stop offset="100%" stopColor={light.skyBottom} />
            </linearGradient>
            <linearGradient id="lw-river" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7FB2B0" />
              <stop offset="100%" stopColor={W.teal} />
            </linearGradient>
            {/* The relight: transparent across the sky, the phase colour over
                the land. Lights are drawn after it, so windows glow. */}
            <linearGradient id="lw-tint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="22%" stopColor={light.tint} stopOpacity={0} />
              <stop offset="48%" stopColor={light.tint} stopOpacity={light.tintOpacity} />
              <stop offset="100%" stopColor={light.tint} stopOpacity={light.tintOpacity} />
            </linearGradient>
            <radialGradient id="lw-glow">
              <stop offset="0%" stopColor="#FFE3A6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#FFE3A6" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="lw-sunglow">
              <stop offset="0%" stopColor={night ? '#F1EBDD' : W.gold} stopOpacity={0.55} />
              <stop offset="100%" stopColor={night ? '#F1EBDD' : W.gold} stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* ---- sky ---- */}
          <rect width={VIEW_W} height={VIEW_H} fill="url(#lw-sky)" />
          {stars.map((s, i) => (
            <g key={`star-${i}`} transform={`translate(${s.x} ${s.y})`}>
              <circle className="lw-twinkle" r={1.3 * s.scale} fill="#F6F1E4" style={{ animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }} />
            </g>
          ))}
          {(life.sun || life.moon) && (
            <g transform={`translate(780 ${sunY})`}>
              <circle r={70} fill="url(#lw-sunglow)" />
              {life.sun ? (
                <circle r={phase === 'evening' ? 30 : 24} fill={phase === 'evening' ? '#F0A868' : W.gold} />
              ) : (
                <g>
                  <circle r={19} fill="#F1EBDD" />
                  <circle cx={-6} cy={-4} r={3.5} fill="#DED6C6" />
                  <circle cx={5} cy={6} r={2.5} fill="#DED6C6" />
                  <circle cx={7} cy={-7} r={1.8} fill="#DED6C6" />
                </g>
              )}
            </g>
          )}
          {clouds.map((c, i) => (
            <g key={`cloud-${i}`} transform={`translate(${c.x} ${CLOUD_ROWS[i % CLOUD_ROWS.length]})`}>
              <g
                className="lw-drift"
                style={{
                  animationDuration: `${c.duration}s`,
                  animationDelay: `${c.delay}s`,
                  ['--from' as string]: `${-(c.x + 120)}px`,
                  ['--to' as string]: `${VIEW_W + 120 - c.x}px`,
                }}
              >
                <g transform={`scale(${c.scale})`}>
                  <Cloud dark={weather === 'rain' || weather === 'cloudy'} night={night} />
                </g>
              </g>
            </g>
          ))}

          {/* ---- far mountains, and the dreams already reached ---- */}
          <polygon points="0,250 70,175 140,215 230,140 320,205 410,160 500,215 590,150 680,200 760,130 860,195 940,165 1000,190 1000,300 0,300" fill="#8EA5AE" />
          <polygon points="747,145 760,130 773,145 766,142 760,146 754,142" fill={W.paper} opacity={0.9} />
          {(season === 'winter' || weather === 'snow') && (
            <g fill={W.paper} opacity={0.9}>
              <polygon points="218,153 230,140 242,153 236,150 230,154 224,150" />
              <polygon points="578,162 590,150 602,162 596,159 590,163 584,159" />
            </g>
          )}
          {PEAKS.slice(0, flags).map(([px, py], i) => (
            <g key={`flag-${i}`} transform={`translate(${px} ${py})`}>
              <title>A dream you reached</title>
              <rect x={-0.8} y={-18} width={1.6} height={18} fill={W.ink} />
              <g className="lw-flutter-flag" style={{ animationDuration: `${2.6 + i * 0.4}s` }}>
                <path d="M0.8,-18 L12,-14 L0.8,-10 Z" fill={W.terracotta} />
              </g>
            </g>
          ))}
          <polygon points="0,275 90,232 190,262 300,224 420,258 540,228 660,262 780,234 900,258 1000,242 1000,348 0,348" fill="#76928A" />

          {/* ---- the valley line, and the train that runs on it ---- */}
          <rect x={0} y={289} width={VIEW_W} height={2} fill="#5E6E66" opacity={0.7} />
          <g transform="translate(600 0)">
            <g
              className="lw-train"
              style={{ ['--from' as string]: '-780px', ['--to' as string]: '520px' }}
            >
              <g transform="translate(0 276)">
                <rect x={0} y={0} width={22} height={12} rx={3} fill={W.terracotta} />
                <rect x={16} y={-5} width={5} height={6} fill={W.ink} />
                <rect x={-26} y={1} width={24} height={11} rx={2} fill={W.teal} />
                <rect x={-52} y={1} width={24} height={11} rx={2} fill={W.gold} />
                {life.windowLights &&
                  [-48, -40, -22, -14].map((wx) => <rect key={wx} x={wx} y={3} width={5} height={4} fill="#FFE3A6" />)}
                <circle cx={5} cy={13} r={2.4} fill={W.ink} />
                <circle cx={-12} cy={13} r={2.4} fill={W.ink} />
                <circle cx={-38} cy={13} r={2.4} fill={W.ink} />
              </g>
            </g>
          </g>

          {/* ---- mid hill, and a sapling for each memory ---- */}
          <path d="M0,330 C150,290 280,300 420,318 C560,336 700,296 860,306 C930,310 970,318 1000,322 L1000,560 L0,560 Z" fill={foliage.grass} opacity={0.85} />
          {saplingSpots.map((s, i) => (
            <g key={`sapling-${i}`} transform={`translate(${s.x} ${s.y})`}>
              <title>A memory you saved</title>
              <rect x={-1.5} y={-4} width={3} height={6} fill="#6B4A35" />
              <g className="lw-sway" style={{ animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }}>
                <path d="M0,-22 L8,-4 L-8,-4 Z" fill={season === 'winter' ? '#7F8E89' : foliage.canopy} />
              </g>
            </g>
          ))}

          {/* ---- foreground ---- */}
          <path d="M0,395 C140,365 300,362 450,378 C600,394 760,402 1000,388 L1000,560 L0,560 Z" fill={foliage.grass} />

          {/* The river is also a surface you can touch. */}
          <path
            d="M886,300 C870,340 880,370 840,400 C800,430 760,460 715,560 L790,560 C820,480 850,445 875,420 C905,390 915,350 914,300 Z"
            fill="url(#lw-river)"
            className="lw-river"
            onClick={rippleAt}
          >
            <title>The river — touch it</title>
          </path>
          {[[858, 382], [818, 452], [770, 520], [878, 340]].map(([sx, sy], i) => (
            <g key={`shimmer-${i}`} transform={`translate(${sx} ${sy})`} pointerEvents="none">
              <rect className="lw-shimmer" x={-9} y={-1} width={18} height={2} rx={1} fill={W.paper} style={{ animationDuration: `${4 + i * 1.3}s`, animationDelay: `${-i * 1.1}s` }} />
            </g>
          ))}
          {life.ducks &&
            [[805, 478], [772, 528]].map(([dx, dy], i) => (
              <g key={`duck-${i}`} transform={`translate(${dx} ${dy})`} pointerEvents="none">
                <g className="lw-bob" style={{ animationDuration: `${3.2 + i}s` }}>
                  <ellipse cx={0} cy={0} rx={9} ry={5} fill="#F3EDE0" />
                  <circle cx={7} cy={-5} r={3.6} fill="#F3EDE0" />
                  <path d="M10,-5 L14,-4 L10,-3 Z" fill={W.gold} />
                </g>
              </g>
            ))}
          {/* Bridge over the river. */}
          <g pointerEvents="none">
            <path d="M786,446 Q833,418 884,432" fill="none" stroke={W.wood} strokeWidth={7} strokeLinecap="round" />
            {[796, 812, 830, 848, 866].map((bx) => (
              <rect key={bx} x={bx} y={424 + Math.abs(bx - 833) * 0.25} width={2} height={12} fill={W.wood} />
            ))}
          </g>

          {/* Stone path from the door. */}
          <path d="M312,392 C300,430 340,470 330,560 L384,560 C382,470 346,430 334,392 Z" fill={W.stone} opacity={0.85} />

          {/* Trees that frame it all. */}
          <Tree x={150} base={402} season={season} scale={1.05} swayDuration={weather === 'windy' ? 3.4 : 7.2} />
          <Tree x={905} base={392} season={season} scale={1} swayDuration={weather === 'windy' ? 3.9 : 8.4} />
          <Tree x={462} base={384} season={season} scale={0.72} swayDuration={weather === 'windy' ? 3.1 : 6.6} />

          {/* ---- the house ---- */}
          <g>
            <rect x={258} y={312} width={128} height={80} fill={W.paper} />
            <rect x={258} y={312} width={128} height={80} fill="none" stroke="#D9CBB6" strokeWidth={2} />
            <rect x={350} y={266} width={16} height={36} fill="#8C5E4C" />
            <polygon points="245,316 322,258 399,316" fill={W.terracotta} />
            {life.snowOnRoofs && <polygon points="250,312 322,262 394,312 380,306 322,268 264,306" fill={W.paper} opacity={0.95} />}
            <rect x={307} y={345} width={26} height={47} rx={11} fill="#7A4E3A" />
            <circle cx={327} cy={370} r={1.6} fill={W.gold} />
            <rect x={272} y={330} width={26} height={22} rx={2} fill={life.windowLights ? '#FFDFA0' : '#A9C3CB'} />
            <rect x={346} y={330} width={26} height={22} rx={2} fill={life.windowLights ? '#FFDFA0' : '#A9C3CB'} />
            <path d="M285,330 L285,352 M272,341 L298,341 M359,330 L359,352 M346,341 L372,341" stroke={W.paper} strokeWidth={2} />
            {/* The cat on the sill, as cats are. */}
            <g transform="translate(290 352)">
              <title>The cat, asleep</title>
              <g className="lw-breathe-slow">
                <ellipse cx={0} cy={-4} rx={8} ry={4.5} fill={W.ink} />
                <circle cx={-6} cy={-7} r={3.4} fill={W.ink} />
                <path d="M-9,-9 L-8.4,-12.5 L-6.6,-9.6 Z M-4.6,-9.6 L-3.8,-12.6 L-2.6,-9.2 Z" fill={W.ink} />
              </g>
            </g>
            {life.flowers && (
              <g>
                {[264, 276, 288, 352, 364, 376].map((fx, i) => (
                  <g key={fx} transform={`translate(${fx} 396)`}>
                    <rect x={-0.8} y={-8} width={1.6} height={8} fill={W.forest} />
                    <g className="lw-sway" style={{ animationDuration: `${4 + (i % 3)}s`, animationDelay: `${-i * 0.7}s` }}>
                      <circle cx={0} cy={-9} r={3.2} fill={i % 2 ? foliage.accent : W.terracotta} />
                    </g>
                  </g>
                ))}
              </g>
            )}
          </g>

          {/* Smoke from the chimney. */}
          <g transform="translate(358 262)" pointerEvents="none" style={{ ['--smoke' as string]: String(0.18 + life.chimneySmoke * 0.32) }}>
            {[0, 1, 2].map((i) => (
              <circle key={i} className="lw-smoke" r={7} fill="#E9E4DB" style={{ animationDelay: `${-i * 1.6}s`, opacity: 0.18 + life.chimneySmoke * 0.2 }} />
            ))}
          </g>

          {/* Polaroids on a string, from the house to the tree. */}
          <g>
            <path d="M392,320 Q424,338 456,322" fill="none" stroke={W.ink} strokeWidth={1} opacity={0.6} />
            {[[404, 326, -6], [424, 332, 3], [444, 327, 7]].map(([gx, gy, rot], i) => (
              <g key={i} transform={`translate(${gx} ${gy}) rotate(${rot})`}>
                <rect x={-6} y={0} width={12} height={14} fill={W.paper} stroke="#CDBFA9" strokeWidth={0.8} />
                <rect x={-4.5} y={1.5} width={9} height={8} fill={[W.sky, W.terracotta, W.forest][i]} opacity={0.75} />
              </g>
            ))}
          </g>

          {/* Mailbox. The envelope only appears for a letter that is really there. */}
          <g transform="translate(206 0)">
            <rect x={-2.5} y={350} width={5} height={42} fill={W.wood} />
            <rect x={-16} y={334} width={32} height={19} rx={8} fill={W.teal} />
            {waiting > 0 && (
              <g>
                <rect x={-9} y={330} width={16} height={10} fill={W.paper} stroke="#CDBFA9" strokeWidth={0.8} transform="rotate(-8 -1 335)" />
                <rect x={14} y={322} width={2} height={14} fill={W.ink} />
                <rect x={16} y={322} width={8} height={5} fill={W.terracotta} />
              </g>
            )}
          </g>

          {/* A little signpost that is also a calendar: today's date. */}
          <g transform="translate(414 0)">
            <rect x={-1.5} y={412} width={3} height={30} fill={W.wood} />
            <rect x={-14} y={398} width={28} height={20} rx={3} fill={W.paper} stroke={W.wood} strokeWidth={1.5} />
            <text x={0} y={413} textAnchor="middle" fontSize={12} fontWeight={700} fill={W.ink} className="lw-handwritten">
              {date.getDate()}
            </text>
          </g>

          {/* The dog, asleep in the garden. */}
          <g transform="translate(497 434)">
            <title>The dog, asleep</title>
            <g className="lw-breathe">
              <ellipse cx={0} cy={0} rx={15} ry={7} fill="#B98A62" />
              <circle cx={12} cy={-2} r={6} fill="#B98A62" />
              <path d="M13,-7 C17,-8 18,-2 15,-1 Z" fill="#8C6446" />
              <path d="M-15,0 C-20,-4 -18,-9 -14,-6" fill="none" stroke="#B98A62" strokeWidth={3} strokeLinecap="round" />
            </g>
            {night && (
              <text x={18} y={-14} fontSize={9} fill={W.paper} opacity={0.7} className="lw-handwritten">
                z
              </text>
            )}
          </g>

          {/* ---- the two of you ---- */}
          <g>
            <rect x={532} y={396} width={104} height={5} rx={2} fill={W.wood} />
            <rect x={538} y={401} width={3} height={16} fill={W.wood} />
            <rect x={627} y={401} width={3} height={16} fill={W.wood} />
            <Partner x={562} color={PARTNER_ONE} lean={6} name={data.couple.user1.name} />
            <Partner x={606} color={PARTNER_TWO} lean={-6} name={data.couple.user2.name} />
            {/* Holding hands between them. */}
            <path d="M570,410 Q584,418 598,410" fill="none" stroke={SKIN} strokeWidth={3.4} strokeLinecap="round" />
            <rect x={530} y={416} width={108} height={6} rx={2} fill={W.wood} />
            <rect x={536} y={422} width={3} height={14} fill={W.wood} />
            <rect x={629} y={422} width={3} height={14} fill={W.wood} />
          </g>

          {/* Lamp post by the bench. */}
          <g transform="translate(664 0)">
            <rect x={-2} y={330} width={4} height={104} fill={W.ink} />
            <rect x={-8} y={318} width={16} height={14} rx={3} fill={life.lampLit ? '#FFDFA0' : '#C9C2B6'} stroke={W.ink} strokeWidth={2} />
          </g>

          {/* Butterflies near the garden. */}
          {butterflies.map((b, i) => (
            <g key={`fly-${i}`} transform={`translate(${b.x} ${b.y})`} pointerEvents="none">
              <g className="lw-flutter" style={{ animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}>
                <g className="lw-wings-x" style={{ animationDuration: `${0.38 + i * 0.06}s` }}>
                  <path d="M0,0 C-7,-9 -11,-2 -7,2 C-4,4 -1,2 0,0 Z" fill={i % 2 ? W.gold : W.terracotta} />
                  <path d="M0,0 C7,-9 11,-2 7,2 C4,4 1,2 0,0 Z" fill={i % 2 ? W.gold : W.terracotta} />
                  <rect x={-0.6} y={-3} width={1.2} height={6} rx={0.6} fill={W.ink} />
                </g>
              </g>
            </g>
          ))}

          {/* Leaves letting go in autumn. */}
          {leaves.map((l, i) => (
            <g key={`leaf-${i}`} transform={`translate(${l.x} ${l.y})`} pointerEvents="none">
              <g className="lw-leaf" style={{ animationDuration: `${l.duration}s`, animationDelay: `${l.delay}s` }}>
                <ellipse rx={3.4} ry={1.8} fill={i % 2 ? foliage.canopyLight : W.terracotta} />
              </g>
            </g>
          ))}

          {/* ---- the light of the hour ---- */}
          <rect width={VIEW_W} height={VIEW_H} fill="url(#lw-tint)" style={{ mixBlendMode: 'multiply' }} pointerEvents="none" />
          {veil.opacity > 0 && <rect width={VIEW_W} height={VIEW_H} fill={veil.color} opacity={veil.opacity} pointerEvents="none" />}

          {/* Lights above the tint, so they glow rather than dim. */}
          {life.windowLights && (
            <g pointerEvents="none">
              <circle cx={285} cy={341} r={26} fill="url(#lw-glow)" className="lw-glow" />
              <circle cx={359} cy={341} r={26} fill="url(#lw-glow)" className="lw-glow" style={{ animationDelay: '-2s' }} />
            </g>
          )}
          {life.lampLit && <circle cx={664} cy={325} r={44} fill="url(#lw-glow)" className="lw-glow" pointerEvents="none" />}
          {fireflies.map((f, i) => (
            <g key={`ff-${i}`} transform={`translate(${f.x} ${f.y})`} pointerEvents="none">
              <g className="lw-firefly" style={{ animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s` }}>
                <circle r={6} fill="url(#lw-glow)" />
                <circle r={1.6} fill="#FFF1C4" />
              </g>
            </g>
          ))}

          {/* Weather in front of everything. */}
          {fogBands(weather)}
          {rain.map((r, i) => (
            <g key={`rain-${i}`} transform={`translate(${r.x} ${r.y})`} pointerEvents="none">
              <line className="lw-rain" x1={0} y1={0} x2={-4} y2={14} stroke="#E6EEF2" strokeWidth={1.2} opacity={0.6} style={{ animationDuration: `${r.duration}s`, animationDelay: `${r.delay}s` }} />
            </g>
          ))}
          {snow.map((s, i) => (
            <g key={`snow-${i}`} transform={`translate(${s.x} ${s.y})`} pointerEvents="none">
              <circle className="lw-snow" r={1.6 * s.scale + 0.6} fill={W.paper} opacity={0.9} style={{ animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s` }} />
            </g>
          ))}

          {/* Ripples where the river was touched. */}
          {ripples.map((r) => (
            <g key={r.id} transform={`translate(${r.x} ${r.y})`} pointerEvents="none">
              <circle className="lw-ripple" r={10} fill="none" stroke={W.paper} strokeWidth={2} />
              <circle className="lw-ripple" r={10} fill="none" stroke={W.paper} strokeWidth={1.4} style={{ animationDelay: '0.25s' }} />
            </g>
          ))}

          {/* ---- places you can go ---- */}
          <Hotspot place={PLACES.hills} onGo={go} onHover={setHovered} shape={{ x: 150, y: 168, w: 700, h: 92 }} />
          <Hotspot place={PLACES.train} onGo={go} onHover={setHovered} shape={{ x: 150, y: 266, w: 700, h: 30 }} />
          <Hotspot place={PLACES.window} onGo={go} onHover={setHovered} shape={{ x: 252, y: 300, w: 140, h: 94 }} />
          <Hotspot place={PLACES.frames} onGo={go} onHover={setHovered} shape={{ x: 394, y: 314, w: 62, h: 36 }} />
          <Hotspot place={PLACES.mailbox} onGo={go} onHover={setHovered} shape={{ x: 184, y: 318, w: 46, h: 76 }} />
          <Hotspot place={PLACES.calendar} onGo={go} onHover={setHovered} shape={{ x: 396, y: 394, w: 36, h: 50 }} />
          <Hotspot place={PLACES.bench} onGo={go} onHover={setHovered} shape={{ x: 526, y: 364, w: 120, h: 76 }} />

          {/* Birds sit on top so a tap reaches them before the hills. */}
          {birds.map((b, i) => (
            <g key={`bird-${i}`} transform={`translate(${b.x} ${b.y})`}>
              <g className={startled === i ? 'lw-startled' : undefined}>
                <g
                  className="lw-glide"
                  style={{
                    animationDuration: `${b.duration}s`,
                    animationDelay: `${b.delay}s`,
                    ['--from' as string]: `${-(b.x - 120)}px`,
                    ['--to' as string]: `${880 - b.x}px`,
                  }}
                  onClick={() => startle(i)}
                >
                  <circle r={14} fill="transparent" />
                  <g className="lw-wings" style={{ animationDuration: `${0.5 + (i % 3) * 0.12}s` }}>
                    <path d="M-7,0 Q-3.5,-4 0,0 Q3.5,-4 7,0" fill="none" stroke={night ? W.paper : W.ink} strokeWidth={1.6} strokeLinecap="round" />
                  </g>
                </g>
              </g>
            </g>
          ))}

          {/* One brighter star that holds a milestone. */}
          {night && (
            <g
              transform="translate(612 58)"
              className="lw-hot"
              role="button"
              tabIndex={0}
              aria-label="A bright star — tap to see a milestone"
              onClick={() => setMilestoneOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setMilestoneOpen((open) => !open);
                }
              }}
            >
              <title>A bright star</title>
              <circle r={16} fill="transparent" />
              <circle r={11} fill="url(#lw-glow)" className="lw-glow" />
              <path d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z" fill="#FFF6DA" />
              <g className="lw-ring" pointerEvents="none">
                <circle r={16} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="5 4" />
              </g>
            </g>
          )}
        </svg>

        {/* What a place does, for pointer and keyboard alike. */}
        {hovered && (
          <div className="pointer-events-none absolute left-3 bottom-3 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm" style={{ background: W.paper, color: W.ink }}>
            {hovered.label} · <span style={{ color: '#6B5E55' }}>{hovered.description}</span>
          </div>
        )}
        {milestoneOpen && together !== null && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-2xl px-4 py-2 text-center shadow-sm" style={{ background: W.paper, color: W.ink }} role="status">
            <p className="lw-handwritten text-xl leading-none">Day {together.toLocaleString()} together</p>
            <p className="text-[11px] mt-1" style={{ color: '#6B5E55' }}>
              since {new Date(`${data.couple.startDate}T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        <div className="absolute right-3 top-3">
          <WorldControls prefs={prefs} onChange={updatePrefs} />
        </div>
      </div>

      {/* The words. The world is atmosphere; this is the diary. */}
      <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" style={{ color: W.ink }}>
        <div className="min-w-0">
          <p className="lw-handwritten text-3xl sm:text-4xl leading-none">{greeting.title}</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: '#5A4D44' }}>
            {greeting.line}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold shrink-0">
          {partnerHere && (
            // Only when presence says so. Being on the bench in the picture
            // is not the same as being here, and the world never blurs that.
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: '#E4EFEA', color: '#245C58' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2F8F6A' }} />
              {partnerProfile.name} is here now
            </span>
          )}
          {waiting > 0 && (
            <span className="rounded-full px-2.5 py-1" style={{ background: '#F6E3DC', color: '#8A3F2C' }}>
              {waiting === 1 ? 'A letter is waiting' : `${waiting} letters are waiting`}
            </span>
          )}
          <span className="rounded-full px-2.5 py-1" style={{ background: '#EFE8DC', color: '#5A4D44' }}>
            {PHASE_NAME[phase]} · {WEATHER_NAME[weather]} · {SEASON_NAME[season]}
          </span>
        </div>
      </div>
    </section>
  );
}

function fogBands(weather: Weather) {
  if (weather !== 'fog') return null;
  return (
    <g pointerEvents="none">
      {[[180, 300, 260], [620, 360, 300], [380, 440, 340]].map(([fx, fy, rx], i) => (
        <g key={i} transform={`translate(${fx} ${fy})`}>
          <ellipse className="lw-fog" rx={rx} ry={26} fill="#EEF2F2" opacity={0.55} style={{ animationDuration: `${18 + i * 6}s`, animationDelay: `${-i * 5}s` }} />
        </g>
      ))}
    </g>
  );
}

export default LivingWorld;
