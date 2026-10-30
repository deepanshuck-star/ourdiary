'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { buildStations, type Scenery, type Station } from '@/lib/world/journey';
import {
  Pine,
  Relight,
  Sky,
  SkyDefs,
  VIEW_H,
  VIEW_W,
  W,
  WeatherFront,
  WorldPlaceholder,
  useOnscreen,
  usePace,
  useWorldState,
  type WorldState,
} from './kit';
import { WorldControls } from './WorldControls';

// Each stop owns a stretch of landscape this wide; the train sits at the
// middle of the view and the world slides beneath it.
const SEGMENT = 420;
const TRACK_Y = 420;
const TRAIN_X = VIEW_W / 2;

const KIND_LABEL: Record<Station['kind'], string> = {
  begin: 'Where it began',
  'first-date': 'First date',
  anniversary: 'Anniversary',
  loved: 'Most loved',
  memory: 'A memory',
  today: 'Today',
  dreams: 'Dreams ahead',
};

function formatDate(iso: string | null) {
  if (!iso) return 'Still ahead';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** The landscape for one stretch of track. */
function Stretch({ scenery, x, s }: { scenery: Scenery; x: number; s: WorldState }) {
  const grass = s.foliage.grass;
  const lit = s.life.windowLights;
  return (
    <g transform={`translate(${x} 0)`}>
      {scenery === 'fields' && (
        <g>
          <path d={`M0,${TRACK_Y - 20} C120,${TRACK_Y - 60} 260,${TRACK_Y - 40} ${SEGMENT},${TRACK_Y - 56} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
          {[40, 90, 140, 300, 350].map((fx) => (
            <rect key={fx} x={fx} y={TRACK_Y + 30} width={36} height={4} rx={2} fill={s.season === 'autumn' ? '#D9A05B' : '#C9B26A'} opacity={0.7} />
          ))}
        </g>
      )}
      {scenery === 'village' && (
        <g>
          <path d={`M0,${TRACK_Y - 30} L${SEGMENT},${TRACK_Y - 34} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
          {[60, 150, 260].map((hx, i) => (
            <g key={hx} transform={`translate(${hx} ${TRACK_Y - 30})`}>
              <rect x={-22} y={-34} width={44} height={34} fill={W.paper} />
              <polygon points={`-27,-32 0,-${56 + i * 4} 27,-32`} fill={[W.terracotta, W.teal, '#8C5E4C'][i]} />
              <rect x={-12} y={-24} width={9} height={9} fill={lit ? '#FFDFA0' : '#A9C3CB'} />
              <rect x={4} y={-24} width={9} height={9} fill={lit ? '#FFDFA0' : '#A9C3CB'} />
            </g>
          ))}
        </g>
      )}
      {scenery === 'forest' && (
        <g>
          <path d={`M0,${TRACK_Y - 26} L${SEGMENT},${TRACK_Y - 30} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
          {[30, 80, 130, 200, 250, 300, 370].map((px, i) => (
            <Pine key={px} x={px} base={TRACK_Y - 24 + (i % 2) * 6} scale={1.1 + (i % 3) * 0.2} season={s.season} />
          ))}
        </g>
      )}
      {scenery === 'river' && (
        <g>
          <path d={`M0,${TRACK_Y - 26} L${SEGMENT},${TRACK_Y - 26} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
          <path d={`M140,${VIEW_H} C150,${TRACK_Y + 40} 170,${TRACK_Y} 180,${TRACK_Y - 40} L260,${TRACK_Y - 40} C270,${TRACK_Y} 290,${TRACK_Y + 40} 300,${VIEW_H} Z`} fill={W.teal} />
          {/* The track crosses on a bridge. */}
          <path d={`M150,${TRACK_Y + 4} Q220,${TRACK_Y + 44} 290,${TRACK_Y + 4}`} fill="none" stroke={W.wood} strokeWidth={6} />
          {[170, 200, 230, 260].map((bx) => (
            <rect key={bx} x={bx} y={TRACK_Y + 4} width={3} height={24} fill={W.wood} />
          ))}
        </g>
      )}
      {scenery === 'hills' && (
        <g>
          <path d={`M0,${TRACK_Y - 40} C100,${TRACK_Y - 110} 200,${TRACK_Y - 30} 280,${TRACK_Y - 90} C340,${TRACK_Y - 130} 400,${TRACK_Y - 60} ${SEGMENT},${TRACK_Y - 70} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
          {[90, 230, 330].map((sx) => (
            <g key={sx} transform={`translate(${sx} ${TRACK_Y - 46})`}>
              <ellipse rx={9} ry={6} fill={W.paper} />
              <circle cx={8} cy={-3} r={3.6} fill={W.ink} />
            </g>
          ))}
        </g>
      )}
      {scenery === 'mountains' && (
        <g>
          <polygon points={`0,${TRACK_Y - 20} 110,${TRACK_Y - 210} 210,${TRACK_Y - 80} 300,${TRACK_Y - 240} ${SEGMENT},${TRACK_Y - 40} ${SEGMENT},${VIEW_H} 0,${VIEW_H}`} fill="#7E968F" />
          <polygon points={`280,${TRACK_Y - 214} 300,${TRACK_Y - 240} 320,${TRACK_Y - 214} 310,${TRACK_Y - 218} 300,${TRACK_Y - 210} 290,${TRACK_Y - 218}`} fill={W.paper} />
          <polygon points={`94,${TRACK_Y - 188} 110,${TRACK_Y - 210} 126,${TRACK_Y - 188} 118,${TRACK_Y - 192} 110,${TRACK_Y - 184} 102,${TRACK_Y - 192}`} fill={W.paper} />
          <path d={`M0,${TRACK_Y - 20} L${SEGMENT},${TRACK_Y - 30} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
        </g>
      )}
      {scenery === 'sunset' && (
        <g>
          {/* A warm glow on the horizon — the sky already has its sun. */}
          <ellipse cx={SEGMENT / 2} cy={TRACK_Y - 46} rx={230} ry={70} fill="url(#lw-sunglow)" />
          <path d={`M0,${TRACK_Y - 30} C140,${TRACK_Y - 60} 280,${TRACK_Y - 40} ${SEGMENT},${TRACK_Y - 50} L${SEGMENT},${VIEW_H} L0,${VIEW_H} Z`} fill={grass} />
        </g>
      )}
    </g>
  );
}

export function WorldJourney() {
  const { data } = useDiary();
  const s = useWorldState('journey');
  const rootRef = React.useRef<HTMLElement>(null);
  const onscreen = useOnscreen(rootRef);
  usePace(rootRef, s?.ambience.pace ?? 1);

  const stations = React.useMemo(
    () =>
      s
        ? buildStations({
            startDate: data.couple.startDate,
            memories: data.memories.map((m) => ({ id: m.id, title: m.title, date: m.date, category: m.category, reactions: m.reactions })),
            openDreams: data.bucketList.filter((d) => !d.completed).length,
            todayIso: s.todayIso,
          })
        : [],
    [s, data.couple.startDate, data.memories, data.bucketList]
  );
  // Start the ride at Today, where the couple are now.
  const todayIndex = Math.max(0, stations.findIndex((st) => st.kind === 'today'));
  const [index, setIndex] = React.useState<number | null>(null);
  const [moving, setMoving] = React.useState(false);
  const current = index ?? todayIndex;

  const goTo = React.useCallback(
    (next: number) => {
      if (next < 0 || next >= stations.length || next === current) return;
      setIndex(next);
      setMoving(true);
      window.setTimeout(() => setMoving(false), 1700);
    },
    [current, stations.length]
  );

  if (!s) return <WorldPlaceholder />;

  const station = stations[current];
  const centre = current * SEGMENT + SEGMENT / 2;
  const nearShift = TRAIN_X - centre;
  // Far landscape moves at a fraction of the near — a little parallax.
  const farShift = nearShift * 0.35;
  const totalW = stations.length * SEGMENT;

  return (
    <div className="space-y-4">
      <section
        ref={rootRef}
        className="living-world relative rounded-[2rem] overflow-hidden border shadow-card"
        data-onscreen={onscreen ? 'true' : 'false'}
        data-weather={s.weather}
        style={{ background: W.paper, borderColor: '#E7DCCB' }}
        aria-label="Your journey through the world"
      >
        <div className="relative aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/7]">
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" role="group" aria-label={`The train at ${station?.label ?? 'a station'}`}>
            <SkyDefs s={s} />
            <Sky s={s} />
            {/* Far range, sliding slowly. */}
            <g className="lw-ride" style={{ transform: `translateX(${farShift}px)` }}>
              <polygon
                points={`${-600},300 ${Array.from({ length: Math.ceil((totalW + 1800) / 160) }, (_, i) => `${-600 + i * 160 + 80},${230 + ((i * 37) % 60)} ${-600 + (i + 1) * 160},${290 - ((i * 23) % 40)}`).join(' ')} ${totalW + 1200},560 ${-600},560`}
                fill="#8EA5AE"
              />
            </g>
            {/* The near landscape, stop by stop. */}
            <g className="lw-ride" style={{ transform: `translateX(${nearShift}px)` }}>
              {stations.map((st, i) => (
                <Stretch key={`stretch-${st.id}`} scenery={st.scenery} x={i * SEGMENT} s={s} />
              ))}
              {/* The track: rails and ties the whole way. */}
              <rect x={-SEGMENT} y={TRACK_Y + 8} width={totalW + SEGMENT * 2} height={3} fill="#5E6E66" />
              <rect x={-SEGMENT} y={TRACK_Y + 14} width={totalW + SEGMENT * 2} height={2} fill="#5E6E66" />
              {Array.from({ length: Math.ceil((totalW + SEGMENT * 2) / 22) }, (_, i) => (
                <rect key={`tie-${i}`} x={-SEGMENT + i * 22} y={TRACK_Y + 6} width={4} height={12} fill={W.wood} opacity={0.75} />
              ))}
              {stations.map((st, i) => {
                const sx = i * SEGMENT + SEGMENT / 2;
                const here = i === current;
                return (
                  <g key={`station-${st.id}`} transform={`translate(${sx} ${TRACK_Y})`}>
                    <rect x={-44} y={-6} width={88} height={8} rx={2} fill={W.stone} />
                    <rect x={-1.5} y={-60} width={3} height={54} fill={W.ink} />
                    <rect
                      x={-58}
                      y={-84}
                      width={116}
                      height={26}
                      rx={5}
                      fill={here ? W.paper : '#EFE8DC'}
                      stroke={here ? W.terracotta : W.wood}
                      strokeWidth={here ? 2.5 : 1.4}
                    />
                    <text x={0} y={-66} textAnchor="middle" fontSize={13} fill={W.ink} className="lw-handwritten">
                      {st.label.length > 18 ? `${st.label.slice(0, 17)}…` : st.label}
                    </text>
                    {s.life.lampLit && <circle cx={0} cy={-60} r={18} fill="url(#lw-glow)" />}
                  </g>
                );
              })}
            </g>

            {/* The train stays in the middle of the view; the world comes to it. */}
            <g transform={`translate(${TRAIN_X} ${TRACK_Y - 18})`}>
              <g className={moving ? 'lw-chug' : undefined}>
                <rect x={8} y={-12} width={48} height={26} rx={5} fill={W.terracotta} />
                <rect x={40} y={-24} width={9} height={14} fill={W.ink} />
                <rect x={-46} y={-8} width={50} height={22} rx={4} fill={W.teal} />
                <rect x={-100} y={-8} width={50} height={22} rx={4} fill={W.gold} />
                {[-92, -76, -38, -22].map((wx) => (
                  <rect key={wx} x={wx} y={-3} width={10} height={8} rx={1.5} fill={s.life.windowLights ? '#FFE3A6' : W.paper} />
                ))}
                {[18, 44, -36, -10, -90, -64].map((cx) => (
                  <circle key={cx} cx={cx} cy={16} r={5} fill={W.ink} />
                ))}
              </g>
              {moving && (
                <g pointerEvents="none">
                  {[0, 1, 2].map((i) => (
                    <circle key={i} className="lw-smoke" cx={44} cy={-28} r={8} fill="#E9E4DB" style={{ animationDelay: `${-i * 0.5}s`, animationDuration: '1.6s' }} />
                  ))}
                </g>
              )}
            </g>

            <Relight s={s} />
            <WeatherFront s={s} />
          </svg>
          <div className="absolute right-3 top-3">
            <WorldControls />
          </div>
        </div>

        {station && (
          <div className="px-5 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ color: W.ink }}>
            <div className="min-w-0" aria-live="polite">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: W.inkSoft }}>
                Stop {current + 1} of {stations.length} · {KIND_LABEL[station.kind]}
              </p>
              <h2 className="lw-handwritten text-3xl leading-none mt-1">{station.label}</h2>
              <p className="text-sm mt-1" style={{ color: W.inkSoft }}>
                {formatDate(station.date)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                aria-label="Previous stop"
                className="w-10 h-10 rounded-full border inline-flex items-center justify-center disabled:opacity-30"
                style={{ borderColor: '#DCCFBC', background: W.paper }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Link href={station.href} className="rounded-full px-4 py-2.5 text-sm font-semibold" style={{ background: W.ink, color: W.paper }}>
                {station.kind === 'dreams' ? 'See your dreams' : station.kind === 'today' ? 'Back to today' : 'Open this stop'}
              </Link>
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                disabled={current === stations.length - 1}
                aria-label="Next stop"
                className="w-10 h-10 rounded-full border inline-flex items-center justify-center disabled:opacity-30"
                style={{ borderColor: '#DCCFBC', background: W.paper }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Every stop, in order — the whole ride without waiting for the train. */}
      <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Stops on the journey">
        {stations.map((st, i) => (
          <li key={st.id} className="shrink-0">
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === current ? 'step' : undefined}
              className="rounded-2xl border px-3 py-2 text-left min-w-[9rem]"
              style={
                i === current
                  ? { background: W.ink, color: W.paper, borderColor: W.ink }
                  : { background: W.paper, color: W.ink, borderColor: '#DCCFBC' }
              }
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">{KIND_LABEL[st.kind]}</span>
              <span className="block text-xs font-semibold truncate max-w-[11rem]">{st.label}</span>
              <span className="block text-[10px] opacity-70">{st.date ?? 'ahead'}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default WorldJourney;
