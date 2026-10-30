'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { usePresence } from '@/components/providers/PresenceProvider';
import {
  PEAKS_HOME,
  WORLD_PLACES,
  dreamFlags,
  greetingFor,
  lettersWaiting,
  memorySaplings,
  scatter,
  type WorldPlace,
} from '@/lib/world/world';
import {
  Birds,
  Butterflies,
  Figure,
  Fireflies,
  Hotspot,
  PHASE_NAME,
  PetFigure,
  Relight,
  Ripples,
  SEASON_NAME,
  Sky,
  SkyDefs,
  Tree,
  VIEW_H,
  VIEW_W,
  W,
  WEATHER_NAME,
  WeatherFront,
  WorldPlaceholder,
  useOnscreen,
  usePace,
  useRipples,
  useWorldAvatars,
  useWorldState,
} from './kit';
import { WorldControls } from './WorldControls';

// Everything that matters sits inside x 140–860. A 4:3 phone crops the
// 1000-wide scene to roughly x 126–873.

const PLACES: Record<string, WorldPlace> = Object.fromEntries(WORLD_PLACES.map((p) => [p.id, p]));

function daysBetween(fromIso: string, toEpoch: number): number | null {
  const from = Date.parse(`${fromIso}T00:00:00`);
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((toEpoch - from) / 86_400_000));
}

export function LivingWorld() {
  const router = useRouter();
  const { data, activeProfile, partnerProfile } = useDiary();
  const { available: presenceAvailable, partnerOnline } = usePresence();
  const s = useWorldState('home');
  const [avatars] = useWorldAvatars();

  const [hovered, setHovered] = React.useState<{ label: string; description: string } | null>(null);
  const [milestoneOpen, setMilestoneOpen] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const rootRef = React.useRef<HTMLElement>(null);
  const onscreen = useOnscreen(rootRef);
  const { ripples, rippleAt } = useRipples(svgRef);
  usePace(rootRef, s?.ambience.pace ?? 1);

  if (!s) return <WorldPlaceholder />;

  const { life, foliage, phase, season, weather, night } = s;
  const greeting = greetingFor(activeProfile.name, phase, weather, s.daySeed);
  const line = s.ambience.line ?? greeting.line;

  // Real things from the diary, and only real things.
  const waiting = lettersWaiting(data.letters, data.activeProfileId, s.todayIso);
  const flags = dreamFlags(data.bucketList);
  const saplings = memorySaplings(data.memories.length);
  const together = daysBetween(data.couple.startDate, s.now);
  const partnerHere = presenceAvailable && partnerOnline;

  const birds = scatter(s.daySeed ^ 0x1, life.birds, { x: 200, y: 92, w: 600, h: 70 }, { min: 22, max: 36 });
  const butterflies = scatter(s.daySeed ^ 0x2, life.butterflies, { x: 250, y: 360, w: 360, h: 34 }, { min: 5, max: 9 });
  const fireflies = scatter(s.daySeed ^ 0x3, life.fireflies, { x: 380, y: 340, w: 360, h: 96 }, { min: 6, max: 11 });
  const saplingSpots = scatter(s.coupleSeed ^ 0x5, saplings, { x: 170, y: 306, w: 460, h: 14 }, { min: 9, max: 14 });
  const leaves = life.fallingLeaves ? scatter(s.daySeed ^ 0x6, 6, { x: 120, y: 230, w: 820, h: 40 }, { min: 9, max: 15 }) : [];
  const sway = (calm: number) => (weather === 'windy' ? calm / 2.1 : calm);
  const go = (href: string) => router.push(href);

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
        <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" role="group" aria-label={sceneLabel}>
          <SkyDefs s={s} />
          <Sky s={s} />

          {/* Far mountains, and the dreams already reached. */}
          <polygon points="0,250 70,175 140,215 230,140 320,205 410,160 500,215 590,150 680,200 760,130 860,195 940,165 1000,190 1000,300 0,300" fill="#8EA5AE" />
          <polygon points="747,145 760,130 773,145 766,142 760,146 754,142" fill={W.paper} opacity={0.9} />
          {(season === 'winter' || weather === 'snow') && (
            <g fill={W.paper} opacity={0.9}>
              <polygon points="218,153 230,140 242,153 236,150 230,154 224,150" />
              <polygon points="578,162 590,150 602,162 596,159 590,163 584,159" />
            </g>
          )}
          {PEAKS_HOME.slice(0, flags).map(([px, py], i) => (
            <g key={`flag-${i}`} transform={`translate(${px} ${py})`}>
              <title>A dream you reached</title>
              <rect x={-0.8} y={-18} width={1.6} height={18} fill={W.ink} />
              <g className="lw-flutter-flag" style={{ animationDuration: `${2.6 + i * 0.4}s` }}>
                <path d="M0.8,-18 L12,-14 L0.8,-10 Z" fill={W.terracotta} />
              </g>
            </g>
          ))}
          <polygon points="0,275 90,232 190,262 300,224 420,258 540,228 660,262 780,234 900,258 1000,242 1000,348 0,348" fill="#76928A" />

          {/* The valley line, and the train that runs on it. */}
          <rect x={0} y={289} width={VIEW_W} height={2} fill="#5E6E66" opacity={0.7} />
          <g transform="translate(600 0)">
            <g className="lw-train" style={{ ['--from' as string]: '-780px', ['--to' as string]: '520px' }}>
              <g transform="translate(0 276)">
                <rect x={0} y={0} width={22} height={12} rx={3} fill={W.terracotta} />
                <rect x={16} y={-5} width={5} height={6} fill={W.ink} />
                <rect x={-26} y={1} width={24} height={11} rx={2} fill={W.teal} />
                <rect x={-52} y={1} width={24} height={11} rx={2} fill={W.gold} />
                {life.windowLights && [-48, -40, -22, -14].map((wx) => <rect key={wx} x={wx} y={3} width={5} height={4} fill="#FFE3A6" />)}
                <circle cx={5} cy={13} r={2.4} fill={W.ink} />
                <circle cx={-12} cy={13} r={2.4} fill={W.ink} />
                <circle cx={-38} cy={13} r={2.4} fill={W.ink} />
              </g>
            </g>
          </g>

          {/* Mid hill, and a sapling for each memory. */}
          <path d="M0,330 C150,290 280,300 420,318 C560,336 700,296 860,306 C930,310 970,318 1000,322 L1000,560 L0,560 Z" fill={foliage.grass} opacity={0.85} />
          {saplingSpots.map((sp, i) => (
            <g key={`sapling-${i}`} transform={`translate(${sp.x} ${sp.y})`}>
              <title>A memory you saved</title>
              <rect x={-1.5} y={-4} width={3} height={6} fill={W.bark} />
              <g className="lw-sway" style={{ animationDuration: `${sp.duration}s`, animationDelay: `${sp.delay}s` }}>
                <path d="M0,-22 L8,-4 L-8,-4 Z" fill={season === 'winter' ? '#7F8E89' : foliage.canopy} />
              </g>
            </g>
          ))}

          <path d="M0,395 C140,365 300,362 450,378 C600,394 760,402 1000,388 L1000,560 L0,560 Z" fill={foliage.grass} />

          {/* The river is also a surface you can touch. */}
          <path d="M886,300 C870,340 880,370 840,400 C800,430 760,460 715,560 L790,560 C820,480 850,445 875,420 C905,390 915,350 914,300 Z" fill="url(#lw-river)" className="lw-river" onClick={rippleAt}>
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
          <g pointerEvents="none">
            <path d="M786,446 Q833,418 884,432" fill="none" stroke={W.wood} strokeWidth={7} strokeLinecap="round" />
            {[796, 812, 830, 848, 866].map((bx) => (
              <rect key={bx} x={bx} y={424 + Math.abs(bx - 833) * 0.25} width={2} height={12} fill={W.wood} />
            ))}
          </g>

          <path d="M312,392 C300,430 340,470 330,560 L384,560 C382,470 346,430 334,392 Z" fill={W.stone} opacity={0.85} />

          <Tree x={150} base={402} season={season} scale={1.05} swayDuration={sway(7.2)} />
          <Tree x={905} base={392} season={season} scale={1} swayDuration={sway(8.4)} />
          <Tree x={462} base={384} season={season} scale={0.72} swayDuration={sway(6.6)} />

          {/* The house. */}
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
            {avatars.pet === 'cat' && <PetFigure pet="cat" x={287} y={350} night={night} />}
            {life.flowers &&
              [264, 276, 288, 352, 364, 376].map((fx, i) => (
                <g key={fx} transform={`translate(${fx} 396)`}>
                  <rect x={-0.8} y={-8} width={1.6} height={8} fill={W.forest} />
                  <g className="lw-sway" style={{ animationDuration: `${4 + (i % 3)}s`, animationDelay: `${-i * 0.7}s` }}>
                    <circle cx={0} cy={-9} r={3.2} fill={i % 2 ? foliage.accent : W.terracotta} />
                  </g>
                </g>
              ))}
          </g>

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

          {/* A signpost that is also a calendar: today's date. */}
          <g transform="translate(414 0)">
            <rect x={-1.5} y={412} width={3} height={30} fill={W.wood} />
            <rect x={-14} y={398} width={28} height={20} rx={3} fill={W.paper} stroke={W.wood} strokeWidth={1.5} />
            <text x={0} y={413} textAnchor="middle" fontSize={12} fontWeight={700} fill={W.ink} className="lw-handwritten">
              {s.date.getDate()}
            </text>
          </g>

          {avatars.pet === 'dog' && <PetFigure pet="dog" x={497} y={434} night={night} />}

          {/* The two of you, each drawn as you chose. */}
          <g>
            <rect x={532} y={396} width={104} height={5} rx={2} fill={W.wood} />
            <rect x={538} y={401} width={3} height={16} fill={W.wood} />
            <rect x={627} y={401} width={3} height={16} fill={W.wood} />
            <Figure avatar={avatars.user_1} x={562} lean={6} name={data.couple.user1.name} />
            <Figure avatar={avatars.user_2} x={606} lean={-6} name={data.couple.user2.name} />
            {/* Holding hands: each hand in its owner's own skin tone. */}
            <path d="M570,410 Q577,415.5 584,415.5" fill="none" stroke={avatars.user_1.skin} strokeWidth={3.4} strokeLinecap="round" />
            <path d="M584,415.5 Q591,415.5 598,410" fill="none" stroke={avatars.user_2.skin} strokeWidth={3.4} strokeLinecap="round" />
            <rect x={530} y={416} width={108} height={6} rx={2} fill={W.wood} />
            <rect x={536} y={422} width={3} height={14} fill={W.wood} />
            <rect x={629} y={422} width={3} height={14} fill={W.wood} />
          </g>

          <g transform="translate(664 0)">
            <rect x={-2} y={330} width={4} height={104} fill={W.ink} />
            <rect x={-8} y={318} width={16} height={14} rx={3} fill={life.lampLit ? '#FFDFA0' : '#C9C2B6'} stroke={W.ink} strokeWidth={2} />
          </g>

          <Butterflies points={butterflies} accent={W.terracotta} />
          {leaves.map((l, i) => (
            <g key={`leaf-${i}`} transform={`translate(${l.x} ${l.y})`} pointerEvents="none">
              <g className="lw-leaf" style={{ animationDuration: `${l.duration}s`, animationDelay: `${l.delay}s` }}>
                <ellipse rx={3.4} ry={1.8} fill={i % 2 ? foliage.canopyLight : W.terracotta} />
              </g>
            </g>
          ))}

          <Relight s={s} />

          {/* Lights above the relight, so they glow rather than dim. */}
          {life.windowLights && (
            <g pointerEvents="none">
              <circle cx={285} cy={341} r={26} fill="url(#lw-glow)" className="lw-glow" />
              <circle cx={359} cy={341} r={26} fill="url(#lw-glow)" className="lw-glow" style={{ animationDelay: '-2s' }} />
            </g>
          )}
          {life.lampLit && <circle cx={664} cy={325} r={44} fill="url(#lw-glow)" className="lw-glow" pointerEvents="none" />}
          <Fireflies points={fireflies} />

          <WeatherFront s={s} />
          <Ripples ripples={ripples} />

          {/* Places you can go. */}
          <Hotspot place={PLACES.starlight} onGo={go} onHover={setHovered} shape={{ x: 712, y: 70, w: 136, h: 96 }} />
          <Hotspot place={PLACES.hills} onGo={go} onHover={setHovered} shape={{ x: 150, y: 168, w: 556, h: 92 }} />
          <Hotspot place={PLACES.train} onGo={go} onHover={setHovered} shape={{ x: 150, y: 266, w: 700, h: 30 }} />
          <Hotspot place={PLACES.forest} onGo={go} onHover={setHovered} shape={{ x: 112, y: 270, w: 76, h: 70 }} />
          <Hotspot place={PLACES.window} onGo={go} onHover={setHovered} shape={{ x: 252, y: 300, w: 140, h: 94 }} />
          <Hotspot place={PLACES.frames} onGo={go} onHover={setHovered} shape={{ x: 394, y: 314, w: 62, h: 36 }} />
          <Hotspot place={PLACES.mailbox} onGo={go} onHover={setHovered} shape={{ x: 184, y: 318, w: 46, h: 76 }} />
          <Hotspot place={PLACES.calendar} onGo={go} onHover={setHovered} shape={{ x: 396, y: 394, w: 36, h: 50 }} />
          <Hotspot place={PLACES.bench} onGo={go} onHover={setHovered} shape={{ x: 526, y: 364, w: 120, h: 76 }} />
          <Hotspot place={PLACES.river} onGo={go} onHover={setHovered} shape={{ x: 780, y: 414, w: 110, h: 40 }} />

          <Birds points={birds} night={night} />

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
          <WorldControls />
        </div>
      </div>

      {/* The words. The world is atmosphere; this is the diary. */}
      <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3" style={{ color: W.ink }}>
        <div className="min-w-0">
          <p className="lw-handwritten text-3xl sm:text-4xl leading-none">{greeting.title}</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: W.inkSoft }}>
            {line}
          </p>
          {s.ambience.shortcut && (
            <Link href={s.ambience.shortcut.href} className="mt-2 inline-block text-xs font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
              {s.ambience.shortcut.label}
            </Link>
          )}
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
          <span className="rounded-full px-2.5 py-1" style={{ background: '#EFE8DC', color: W.inkSoft }}>
            {PHASE_NAME[phase]} · {WEATHER_NAME[weather]} · {SEASON_NAME[season]}
          </span>
        </div>
      </div>
    </section>
  );
}

export default LivingWorld;
