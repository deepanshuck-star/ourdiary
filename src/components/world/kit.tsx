'use client';

// The pieces every place in the little world is built from: the palette,
// the sky and weather, the two figures, hotspots, ripples, and the hook that
// works out what time, season, weather and mood it is. Today's world and
// the four places all use these, so a fix to the moon is a fix everywhere.
//
// Two rules carried over from the first scene and enforced by tests:
//   Every animated element is an inner group with no transform attribute —
//   a CSS transform animation REPLACES an SVG element's own transform.
//   Nothing animates until :root[data-motion="on"].

import React from 'react';
import '@/styles/world.css';
import { useNow } from '@/hooks/useNow';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  PHASE_LIGHT,
  SEASON_FOLIAGE,
  hashSeed,
  lifeFor,
  resolvePhase,
  resolveSeason,
  scatter,
  weatherVeil,
  type DayPhase,
  type Scatter,
  type Season,
  type Weather,
  type WorldLife,
  type WorldPlace,
} from '@/lib/world/world';
import { ambienceFor, scaleLife, type MoodAmbience } from '@/lib/world/mood';
import { soundscapeFor, type SoundPlace, type SoundPreferences } from '@/lib/world/sound';
import {
  DEFAULT_WORLD_PREFERENCES,
  loadWorldPreferences,
  saveSoundPreferences,
  saveWorldPreferences,
  soundSnapshotFor,
  subscribeSoundPreferences,
  subscribeWorldPreferences,
  type WorldPreferences,
} from '@/lib/world/preferences';
import { DEFAULT_SOUND } from '@/lib/world/sound';
import {
  DEFAULT_WORLD_AVATARS,
  parseWorldAvatars,
  type Avatar,
  type Pet,
  type WorldAvatars,
} from '@/lib/world/avatar';
import { worldAudio } from '@/lib/world/audio';
import { applyPlaybackRate, motionSpeed } from '@/lib/motion';

// The world's own palette, from the brief. Fixed rather than taken from the
// app theme: this is a handmade object sitting on the page.
export const W = {
  paper: '#FDFBF7',
  ink: '#2A2420',
  inkSoft: '#5A4D44',
  terracotta: '#C46F57',
  teal: '#357C78',
  forest: '#56775C',
  sky: '#A8CAD7',
  gold: '#E9C785',
  night: '#252A30',
  wood: '#8A5A3C',
  stone: '#D8CFC2',
  bark: '#6B4A35',
};

export const VIEW_W = 1000;
export const VIEW_H = 560;

// --------------------------------------------------------------- hooks ---

export function useWorldPreferences(): [WorldPreferences, (next: WorldPreferences) => void] {
  const prefs = React.useSyncExternalStore(
    subscribeWorldPreferences,
    loadWorldPreferences,
    () => DEFAULT_WORLD_PREFERENCES
  );
  return [prefs, saveWorldPreferences];
}

export function useSoundPreferences(): [SoundPreferences, (next: SoundPreferences) => void] {
  const prefs = React.useSyncExternalStore(subscribeSoundPreferences, soundSnapshotFor, () => DEFAULT_SOUND);
  const set = React.useCallback((next: SoundPreferences) => {
    const audio = worldAudio();
    if (audio) {
      // enable() runs inside the click that called this — the gesture
      // browsers require before any audio may start.
      if (next.enabled && !audio.enabled) void audio.enable(next.volume);
      else if (!next.enabled && audio.enabled) audio.disable();
      else audio.setVolume(next.volume);
    }
    saveSoundPreferences(next);
  }, []);
  return [prefs, set];
}

/** The couple's two figures and their pet, synced between both devices. */
export function useWorldAvatars(): [WorldAvatars, (next: WorldAvatars) => void] {
  const { data } = useDiary();
  const [raw, setRaw] = useLocalState<unknown>(`world:avatars:${data.couple.id || 'demo'}`, DEFAULT_WORLD_AVATARS);
  const avatars = React.useMemo(() => parseWorldAvatars(raw), [raw]);
  const set = React.useCallback((next: WorldAvatars) => setRaw(next), [setRaw]);
  return [avatars, set];
}

export function useOnscreen(ref: React.RefObject<Element | null>): boolean {
  const [onscreen, setOnscreen] = React.useState(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setOnscreen(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return onscreen;
}

export interface WorldState {
  ready: true;
  now: number;
  date: Date;
  todayIso: string;
  prefs: WorldPreferences;
  setPrefs: (next: WorldPreferences) => void;
  phase: DayPhase;
  season: Season;
  weather: Weather;
  life: WorldLife;
  light: (typeof PHASE_LIGHT)[DayPhase];
  foliage: (typeof SEASON_FOLIAGE)[Season];
  veil: { color: string; opacity: number };
  night: boolean;
  ambience: MoodAmbience;
  daySeed: number;
  coupleSeed: number;
}

export function localIsoDate(epoch: number): string {
  const d = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * What it is like in the world right now. Null until the clock is known,
 * so a scene never renders a guessed sky that then jumps.
 *
 * `forcePhase` is for places that have a time of their own — Starlight Hill
 * is always night.
 */
export function useWorldState(place: SoundPlace, forcePhase?: DayPhase): WorldState | null {
  const { data } = useDiary();
  const now = useNow(60_000);
  const [prefs, setPrefs] = useWorldPreferences();
  const [sound] = useSoundPreferences();

  const state = React.useMemo((): WorldState | null => {
    if (now === null) return null;
    const date = new Date(now);
    const ambience = ambienceFor(prefs.mood, prefs.moodShapesWorld);
    // A mood may suggest the light, but a time you pinned yourself wins.
    const phase =
      forcePhase ??
      (prefs.phase === 'auto' && ambience.phaseHint ? ambience.phaseHint : resolvePhase(prefs.phase, date.getHours()));
    const season = resolveSeason(prefs.season, date.getMonth());
    const weather = prefs.weather;
    const base = lifeFor(phase, season, weather);
    const life: WorldLife = {
      ...base,
      birds: scaleLife(base.birds, ambience.lifeScale),
      butterflies: scaleLife(base.butterflies, ambience.lifeScale),
      fireflies: scaleLife(base.fireflies, ambience.lifeScale),
    };
    const todayIso = localIsoDate(now);
    return {
      ready: true,
      now,
      date,
      todayIso,
      prefs,
      setPrefs,
      phase,
      season,
      weather,
      life,
      light: PHASE_LIGHT[phase],
      foliage: SEASON_FOLIAGE[season],
      veil: weatherVeil(weather),
      night: phase === 'night',
      ambience,
      daySeed: hashSeed(`${data.couple.id}:${todayIso}`),
      coupleSeed: hashSeed(data.couple.id || 'demo'),
    };
  }, [now, prefs, setPrefs, forcePhase, data.couple.id]);

  // Keep the soundscape in step with the place and the hour. Silent unless
  // the viewer turned sound on this visit.
  const scapeKey = state ? `${place}:${state.phase}:${state.season}:${state.weather}` : '';
  React.useEffect(() => {
    if (!state) return;
    worldAudio()?.setScape(soundscapeFor(place, state.phase, state.season, state.weather));
    // scapeKey captures every input that changes the soundscape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scapeKey, sound.enabled]);

  return state;
}

/**
 * Applies a mood's pace to every animation inside the card. Done through
 * playbackRate rather than rewriting durations, so each creature keeps its
 * own clock and the whole world simply breathes slower or faster.
 */
export function usePace(ref: React.RefObject<HTMLElement | null>, pace: number) {
  // Mood's pace multiplied by the overall speed knob in globals.css.
  React.useEffect(() => {
    const el = ref.current;
    if (el) applyPlaybackRate(el, pace * motionSpeed());
  });
}

type Ripple = { id: number; x: number; y: number };

/** Touch-the-water ripples, in SVG coordinates whatever the crop. */
export function useRipples(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const seq = React.useRef(0);
  const rippleAt = React.useCallback(
    (event: React.MouseEvent<SVGElement>) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const p = point.matrixTransform(ctm.inverse());
      const id = seq.current++;
      setRipples((list) => [...list.slice(-3), { id, x: p.x, y: p.y }]);
      window.setTimeout(() => setRipples((list) => list.filter((r) => r.id !== id)), 1600);
    },
    [svgRef]
  );
  return { ripples, rippleAt };
}

// ------------------------------------------------------------- pieces ---

export function SkyDefs({ s }: { s: WorldState }) {
  return (
    <defs>
      <linearGradient id="lw-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={s.light.skyTop} />
        <stop offset="100%" stopColor={s.light.skyBottom} />
      </linearGradient>
      <linearGradient id="lw-river" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7FB2B0" />
        <stop offset="100%" stopColor={W.teal} />
      </linearGradient>
      {/* The relight: clear across the sky, the hour's colour over the land.
          Lights are drawn after it, so windows and lanterns glow. */}
      <linearGradient id="lw-tint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="22%" stopColor={s.light.tint} stopOpacity={0} />
        <stop offset="48%" stopColor={s.light.tint} stopOpacity={s.light.tintOpacity} />
        <stop offset="100%" stopColor={s.light.tint} stopOpacity={s.light.tintOpacity} />
      </linearGradient>
      <radialGradient id="lw-glow">
        <stop offset="0%" stopColor="#FFE3A6" stopOpacity={0.95} />
        <stop offset="100%" stopColor="#FFE3A6" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="lw-sunglow">
        <stop offset="0%" stopColor={s.night ? '#F1EBDD' : W.gold} stopOpacity={0.55} />
        <stop offset="100%" stopColor={s.night ? '#F1EBDD' : W.gold} stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}

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

// Low enough to survive the 16:7 crop, which takes ~60 units off the top.
const CLOUD_ROWS = [104, 128, 152, 116, 140];

/** Sky, stars, sun or moon, and drifting clouds. */
export function Sky({ s, sunX = 780 }: { s: WorldState; sunX?: number }) {
  const stars = s.life.stars ? scatter(s.daySeed ^ 0x4, 26, { x: 10, y: 10, w: 980, h: 190 }, { min: 3, max: 7 }) : [];
  const cloudCount = { clear: 2, windy: 3, cloudy: 5, rain: 5, fog: 3, snow: 4 }[s.weather];
  const clouds = scatter(
    s.daySeed ^ 0x9,
    cloudCount,
    { x: 140, y: 0, w: 720, h: 0 },
    s.weather === 'windy' ? { min: 40, max: 60 } : { min: 90, max: 150 }
  );
  const sunY = 80 + (1 - s.light.lightHeight) * 150;
  return (
    <g>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#lw-sky)" />
      {stars.map((st, i) => (
        <g key={`star-${i}`} transform={`translate(${st.x} ${st.y})`}>
          <circle className="lw-twinkle" r={1.3 * st.scale} fill="#F6F1E4" style={{ animationDuration: `${st.duration}s`, animationDelay: `${st.delay}s` }} />
        </g>
      ))}
      {(s.life.sun || s.life.moon) && (
        <g transform={`translate(${sunX} ${sunY})`}>
          <circle r={70} fill="url(#lw-sunglow)" />
          {s.life.sun ? (
            <circle r={s.phase === 'evening' ? 30 : 24} fill={s.phase === 'evening' ? '#F0A868' : W.gold} />
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
              <Cloud dark={s.weather === 'rain' || s.weather === 'cloudy'} night={s.night} />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

/** The hour's light over the land, the weather's veil, and mood's lift. */
export function Relight({ s }: { s: WorldState }) {
  const lift = s.ambience.brightness;
  return (
    <g pointerEvents="none">
      <rect width={VIEW_W} height={VIEW_H} fill="url(#lw-tint)" style={{ mixBlendMode: 'multiply' }} />
      {s.veil.opacity > 0 && <rect width={VIEW_W} height={VIEW_H} fill={s.veil.color} opacity={s.veil.opacity} />}
      {lift !== 0 && <rect width={VIEW_W} height={VIEW_H} fill={lift > 0 ? '#FFF6E0' : W.ink} opacity={Math.abs(lift)} />}
    </g>
  );
}

/** Rain, snow and fog, in front of everything. */
export function WeatherFront({ s }: { s: WorldState }) {
  const rain = s.weather === 'rain' ? scatter(s.daySeed ^ 0x7, 42, { x: 0, y: -60, w: 1000, h: 560 }, { min: 0.7, max: 1.1 }) : [];
  const snow = s.weather === 'snow' ? scatter(s.daySeed ^ 0x8, 36, { x: 0, y: -40, w: 1000, h: 560 }, { min: 9, max: 16 }) : [];
  return (
    <g pointerEvents="none">
      {s.weather === 'fog' &&
        [[180, 300, 260], [620, 360, 300], [380, 440, 340]].map(([fx, fy, rx], i) => (
          <g key={`fog-${i}`} transform={`translate(${fx} ${fy})`}>
            <ellipse className="lw-fog" rx={rx} ry={26} fill="#EEF2F2" opacity={0.55} style={{ animationDuration: `${18 + i * 6}s`, animationDelay: `${-i * 5}s` }} />
          </g>
        ))}
      {rain.map((r, i) => (
        <g key={`rain-${i}`} transform={`translate(${r.x} ${r.y})`}>
          <line className="lw-rain" x1={0} y1={0} x2={-4} y2={14} stroke="#E6EEF2" strokeWidth={1.2} opacity={0.6} style={{ animationDuration: `${r.duration}s`, animationDelay: `${r.delay}s` }} />
        </g>
      ))}
      {snow.map((sn, i) => (
        <g key={`snow-${i}`} transform={`translate(${sn.x} ${sn.y})`}>
          <circle className="lw-snow" r={1.6 * sn.scale + 0.6} fill={W.paper} opacity={0.9} style={{ animationDuration: `${sn.duration}s`, animationDelay: `${sn.delay}s` }} />
        </g>
      ))}
    </g>
  );
}

export function Ripples({ ripples }: { ripples: Ripple[] }) {
  return (
    <g pointerEvents="none">
      {ripples.map((r) => (
        <g key={r.id} transform={`translate(${r.x} ${r.y})`}>
          <circle className="lw-ripple" r={10} fill="none" stroke={W.paper} strokeWidth={2} />
          <circle className="lw-ripple" r={10} fill="none" stroke={W.paper} strokeWidth={1.4} style={{ animationDelay: '0.25s' }} />
        </g>
      ))}
    </g>
  );
}

export function Fireflies({ points }: { points: Scatter[] }) {
  return (
    <g pointerEvents="none">
      {points.map((f, i) => (
        <g key={`ff-${i}`} transform={`translate(${f.x} ${f.y})`}>
          <g className="lw-firefly" style={{ animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s` }}>
            <circle r={6} fill="url(#lw-glow)" />
            <circle r={1.6} fill="#FFF1C4" />
          </g>
        </g>
      ))}
    </g>
  );
}

export function Butterflies({ points, accent }: { points: Scatter[]; accent: string }) {
  return (
    <g pointerEvents="none">
      {points.map((b, i) => (
        <g key={`fly-${i}`} transform={`translate(${b.x} ${b.y})`}>
          <g className="lw-flutter" style={{ animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}>
            <g className="lw-wings-x" style={{ animationDuration: `${0.38 + i * 0.06}s` }}>
              <path d="M0,0 C-7,-9 -11,-2 -7,2 C-4,4 -1,2 0,0 Z" fill={i % 2 ? W.gold : accent} />
              <path d="M0,0 C7,-9 11,-2 7,2 C4,4 1,2 0,0 Z" fill={i % 2 ? W.gold : accent} />
              <rect x={-0.6} y={-3} width={1.2} height={6} rx={0.6} fill={W.ink} />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

/** Birds that glide across, and startle off when tapped. */
export function Birds({ points, night }: { points: Scatter[]; night: boolean }) {
  const [startled, setStartled] = React.useState<number | null>(null);
  const startle = (index: number) => {
    setStartled(index);
    window.setTimeout(() => setStartled((current) => (current === index ? null : current)), 2400);
  };
  return (
    <g>
      {points.map((b, i) => (
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
    </g>
  );
}

export function Tree({ x, base, season, scale = 1, swayDuration, tone }: { x: number; base: number; season: Season; scale?: number; swayDuration: number; tone?: number }) {
  const f = SEASON_FOLIAGE[season];
  // A small per-tree shift in shade, so a forest is not one tree repeated.
  const canopy = tone ? shade(f.canopy, tone) : f.canopy;
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x={-6} y={-70} width={12} height={70} rx={3} fill={W.bark} />
      <g className="lw-sway" style={{ animationDuration: `${swayDuration}s` }}>
        {season === 'winter' ? (
          <g stroke={W.bark} strokeWidth={4} strokeLinecap="round" fill="none">
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
            <circle cx={0} cy={-92} r={36} fill={canopy} />
            <circle cx={-24} cy={-74} r={24} fill={canopy} />
            <circle cx={24} cy={-76} r={26} fill={canopy} />
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

export function Pine({ x, base, scale = 1, season }: { x: number; base: number; scale?: number; season: Season }) {
  const green = season === 'winter' ? '#5E716B' : '#3F6152';
  return (
    <g transform={`translate(${x} ${base}) scale(${scale})`}>
      <rect x={-2.5} y={-8} width={5} height={10} fill={W.bark} />
      <path d="M0,-58 L18,-20 L-18,-20 Z M0,-42 L22,-6 L-22,-6 Z" fill={green} />
      {season === 'winter' && <path d="M0,-58 L7,-44 L-7,-44 Z" fill={W.paper} />}
    </g>
  );
}

/** Darken (negative) or lighten (positive) a hex colour by a fraction. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ----------------------------------------------------------- figures ---

/**
 * One of the two of you, seated. Everything about the figure comes from the
 * avatar its owner chose; nothing comes from which slot they are in.
 * `y` is the seat height.
 */
export function Figure({ avatar, x, y = 416, lean = 0, name, standing = false }: { avatar: Avatar; x: number; y?: number; lean?: number; name: string; standing?: boolean }) {
  const top = y - 35; // head centre
  const hair = avatar.hairColor;
  return (
    <g transform={`translate(${x} 0)`}>
      <title>{avatar.nickname ? `${name} (${avatar.nickname})` : name}</title>
      <g className="lw-breathe">
        {/* Long hair falls behind the shoulders, so it is drawn first. */}
        {avatar.hair === 'long' && <path d={`M-10,${top} C-13,${top + 18} -10,${top + 26} -8,${top + 28} L8,${top + 28} C10,${top + 26} 13,${top + 18} 10,${top}`} fill={hair} />}
        {standing ? (
          <>
            <rect x={-6} y={y - 2} width={5} height={24} rx={2} fill={W.ink} />
            <rect x={1} y={y - 2} width={5} height={24} rx={2} fill={W.ink} />
          </>
        ) : (
          <>
            <rect x={-7} y={y - 2} width={5} height={18} rx={2} fill={W.ink} />
            <rect x={2} y={y - 2} width={5} height={18} rx={2} fill={W.ink} />
          </>
        )}
        <rect x={-10} y={y - 23} width={20} height={26} rx={9} fill={avatar.outfit} />
        {avatar.accessory === 'scarf' && <rect x={-9} y={y - 24} width={18} height={5} rx={2} fill={W.gold} />}
        <g transform={`rotate(${lean} 0 ${y - 24})`}>
          <circle cx={0} cy={top} r={9.5} fill={avatar.skin} />
          <Hair style={avatar.hair} color={hair} top={top} />
          <Face expression={avatar.expression} top={top} />
          {avatar.accessory === 'glasses' && (
            <g fill="none" stroke={W.ink} strokeWidth={0.9}>
              <circle cx={-3.4} cy={top + 0.5} r={2.3} />
              <circle cx={3.4} cy={top + 0.5} r={2.3} />
              <path d={`M-1.1,${top + 0.5} L1.1,${top + 0.5}`} />
            </g>
          )}
          {avatar.accessory === 'flower' && (
            <g transform={`translate(6.5 ${top - 7})`}>
              <circle r={2.6} fill={W.terracotta} />
              <circle r={1} fill={W.gold} />
            </g>
          )}
          {avatar.accessory === 'cap' && (
            <g>
              <path d={`M-10,${top - 2} C-10,${top - 14} 10,${top - 14} 10,${top - 2} Z`} fill={avatar.outfit} />
              <rect x={2} y={top - 3.5} width={12} height={3} rx={1.5} fill={avatar.outfit} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

function Hair({ style, color, top }: { style: Avatar['hair']; color: string; top: number }) {
  const cap = `M-10,${top} C-11,${top - 15} 11,${top - 15} 10,${top} C6,${top - 7} -6,${top - 7} -10,${top} Z`;
  switch (style) {
    case 'shaved':
      return <path d={`M-8.5,${top - 3} C-6,${top - 10} 6,${top - 10} 8.5,${top - 3}`} fill="none" stroke={color} strokeWidth={2} opacity={0.55} />;
    case 'bob':
      return (
        <g fill={color}>
          <path d={cap} />
          <rect x={-10.5} y={top - 3} width={4} height={10} rx={2} />
          <rect x={6.5} y={top - 3} width={4} height={10} rx={2} />
        </g>
      );
    case 'bun':
      return (
        <g fill={color}>
          <path d={cap} />
          <circle cx={0} cy={top - 13} r={4.5} />
        </g>
      );
    case 'curly':
      return (
        <g fill={color}>
          {[-8, -4, 0, 4, 8].map((cx, i) => (
            <circle key={cx} cx={cx} cy={top - 7 - (i % 2) * 2} r={4} />
          ))}
          <circle cx={-9} cy={top - 2} r={3} />
          <circle cx={9} cy={top - 2} r={3} />
        </g>
      );
    case 'long':
    case 'short':
    default:
      return <path d={cap} fill={color} />;
  }
}

function Face({ expression, top }: { expression: Avatar['expression']; top: number }) {
  const eyeY = top + 0.5;
  const mouthY = top + 4.6;
  return (
    <g fill={W.ink} stroke={W.ink} strokeLinecap="round">
      {expression === 'laugh' || expression === 'sleepy' ? (
        <g fill="none" strokeWidth={0.9}>
          <path d={`M-4.6,${eyeY} Q-3.4,${expression === 'laugh' ? eyeY - 1.6 : eyeY + 0.8} -2.2,${eyeY}`} />
          <path d={`M2.2,${eyeY} Q3.4,${expression === 'laugh' ? eyeY - 1.6 : eyeY + 0.8} 4.6,${eyeY}`} />
        </g>
      ) : (
        <g stroke="none">
          <circle cx={-3.4} cy={eyeY} r={0.95} />
          <circle cx={3.4} cy={eyeY} r={0.95} />
        </g>
      )}
      {expression === 'smile' && <path d={`M-2.6,${mouthY - 0.6} Q0,${mouthY + 1.6} 2.6,${mouthY - 0.6}`} fill="none" strokeWidth={0.9} />}
      {expression === 'calm' && <path d={`M-2,${mouthY} L2,${mouthY}`} fill="none" strokeWidth={0.9} />}
      {expression === 'laugh' && <path d={`M-2.8,${mouthY - 1} Q0,${mouthY + 3} 2.8,${mouthY - 1} Z`} stroke="none" />}
      {expression === 'sleepy' && <circle cx={0} cy={mouthY} r={0.9} stroke="none" />}
    </g>
  );
}

/** The couple's pet, asleep. Only ever the pet they chose. */
export function PetFigure({ pet, x, y, night }: { pet: Pet; x: number; y: number; night: boolean }) {
  if (pet === 'none') return null;
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{pet === 'dog' ? 'Your dog, asleep' : 'Your cat, asleep'}</title>
      <g className="lw-breathe">
        {pet === 'dog' ? (
          <g>
            <ellipse cx={0} cy={0} rx={15} ry={7} fill="#B98A62" />
            <circle cx={12} cy={-2} r={6} fill="#B98A62" />
            <path d="M13,-7 C17,-8 18,-2 15,-1 Z" fill="#8C6446" />
            <path d="M-15,0 C-20,-4 -18,-9 -14,-6" fill="none" stroke="#B98A62" strokeWidth={3} strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <ellipse cx={0} cy={0} rx={11} ry={6} fill="#4A4038" />
            <circle cx={9} cy={-3} r={4.6} fill="#4A4038" />
            <path d="M6,-7 L7,-11 L9,-7 Z M10,-7 L12,-11 L13,-6 Z" fill="#4A4038" />
            <path d="M-11,1 C-17,0 -16,-7 -11,-5" fill="none" stroke="#4A4038" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}
      </g>
      {night && (
        <text x={18} y={-14} fontSize={9} fill={W.paper} opacity={0.7} className="lw-handwritten">
          z
        </text>
      )}
    </g>
  );
}

// ---------------------------------------------------------- hotspots ---

export function Hotspot({
  place,
  onGo,
  onHover,
  shape,
}: {
  place: Pick<WorldPlace, 'label' | 'description' | 'href'>;
  onGo: (href: string) => void;
  onHover: (place: { label: string; description: string } | null) => void;
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

// ---------------------------------------------------------------- card ---

export const PHASE_NAME: Record<DayPhase, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' };
export const WEATHER_NAME: Record<Weather, string> = { clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', fog: 'Fog', snow: 'Snow', windy: 'Windy' };
export const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

/** A quiet paper block until the clock is known. */
export function WorldPlaceholder() {
  return <div className="living-world rounded-[2rem] aspect-[4/3] sm:aspect-[16/8]" style={{ background: W.paper }} aria-busy="true" />;
}
