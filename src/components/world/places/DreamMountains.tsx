'use client';

import React from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import type { BucketCategory } from '@/types';
import { scatter } from '@/lib/world/world';
import { TRAIL_STEPS, trailMarkers, type TrailMarker } from '@/lib/world/places';
import {
  Birds,
  Figure,
  Pine,
  Relight,
  Sky,
  SkyDefs,
  W,
  WeatherFront,
  WorldPlaceholder,
  useWorldAvatars,
  useWorldState,
} from '../kit';
import { EmptyNote, PlaceFrame, PlacePanel, type Hover } from '../PlaceFrame';

// The trail up the mountain, foot to summit. Dreams you reached sit lower,
// behind you; the ones ahead climb toward the top.
// The trail up the mountain, foot to summit, kept inside y 70-495 so a wide
// screen's crop never hides the lowest steps — which are the dreams already reached.
const TRAIL: [number, number][] = [[470, 476], [540, 450], [498, 418], [566, 390], [522, 358], [590, 330], [548, 300], [612, 272], [574, 242], [632, 214], [598, 184], [646, 152]];

const CATEGORIES: BucketCategory[] = ['Travel', 'Food', 'Movies', 'Activities', 'Milestones'];

export function DreamMountains() {
  const { data, addBucketItem, toggleBucketItem } = useDiary();
  const s = useWorldState('mountains');
  const [avatars] = useWorldAvatars();
  const [hovered, setHovered] = React.useState<Hover>(null);
  const [selected, setSelected] = React.useState<TrailMarker | null>(null);
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<BucketCategory>('Travel');
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (!s) return <WorldPlaceholder />;

  const dreams = data.bucketList;
  const markers = trailMarkers(dreams.map((d) => ({ id: d.id, title: d.title, completed: d.completed })), TRAIL_STEPS);
  const reached = dreams.filter((d) => d.completed).length;
  const { life, season, night } = s;
  const birds = scatter(s.daySeed ^ 0x31, Math.min(3, life.birds), { x: 200, y: 110, w: 600, h: 60 }, { min: 28, max: 42 });
  const slopePines = scatter(s.coupleSeed ^ 0x32, 16, { x: 0, y: 470, w: 1000, h: 30 }, { min: 1, max: 2 });
  // Clouds move through the valleys here whatever the weather.
  const valleyMist = [[220, 330, 220], [780, 360, 260], [420, 410, 300]];
  const current = selected ? dreams.find((d) => d.id === selected.id) : undefined;

  const line =
    s.ambience.line ??
    (dreams.length
      ? `${reached} pahunch gaye, ${dreams.length - reached} abhi aage hain. Raasta lamba hai, jaldi nahi.`
      : 'Pahad intezaar kar rahe hain. Pehla sapna likho.');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    addBucketItem({ title: clean.slice(0, 120), category, completed: false, createdBy: data.activeProfileId });
    setTitle('');
  };

  return (
    <div className="space-y-5">
      <PlaceFrame
        s={s}
        current="/world/mountains"
        title="Dream Mountains"
        line={line}
        sceneLabel={`Dream Mountains: ${reached} dreams reached and ${dreams.length - reached} still ahead on the trail.`}
        svgRef={svgRef}
        hovered={hovered}
        overlay={
          selected &&
          current && (
            <div
              className="absolute left-1/2 top-14 -translate-x-1/2 w-[min(90%,24rem)] rounded-2xl px-4 py-3 shadow-sm"
              style={{ background: W.paper, color: W.ink }}
              role="status"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: W.inkSoft }}>
                {current.completed ? 'Reached' : 'Still ahead'} · {current.category}
              </p>
              <p className="mt-1 text-base font-semibold">{current.title}</p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleBucketItem(current.id)}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: W.ink, color: W.paper }}
                >
                  {current.completed ? 'Mark as still ahead' : 'We did it'}
                </button>
                <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold underline underline-offset-4">
                  Close
                </button>
              </div>
            </div>
          )
        }
      >
        <SkyDefs s={s} />
        <Sky s={s} sunX={300} />
        {/* Far ranges. */}
        <polygon points="0,300 120,210 230,260 340,180 460,250 560,200 700,262 820,190 940,250 1000,220 1000,560 0,560" fill="#9DB3BA" />
        <polygon points="320,195 340,180 360,195 350,192 340,198 330,192" fill={W.paper} />
        <polygon points="800,205 820,190 840,205 830,202 820,208 810,202" fill={W.paper} />
        {/* The mountain with the trail. */}
        <polygon points="170,560 420,300 520,250 650,118 780,240 900,300 1060,560" fill="#7E968F" />
        <polygon points="600,170 650,118 702,166 680,160 664,172 650,160 636,172 620,162" fill={W.paper} opacity={0.95} />
        {valleyMist.map(([mx, my, rx], i) => (
          <g key={`mist-${i}`} transform={`translate(${mx} ${my})`} pointerEvents="none">
            <ellipse className="lw-fog" rx={rx} ry={18} fill="#EEF2F2" opacity={0.2} style={{ animationDuration: `${22 + i * 7}s`, animationDelay: `${-i * 6}s` }} />
          </g>
        ))}
        {/* The trail itself. */}
        <polyline points={TRAIL.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={W.stone} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
        <polyline points={TRAIL.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={W.wood} strokeWidth={1.2} strokeDasharray="3 6" opacity={0.6} />
        {/* A tiny cabin at the viewpoint below the summit. */}
        <g transform="translate(706 214)">
          <rect x={-12} y={-10} width={24} height={14} fill="#B98A62" />
          <polygon points="-15,-10 0,-22 15,-10" fill={W.terracotta} />
          <rect x={-4} y={-6} width={7} height={6} fill={life.windowLights ? '#FFDFA0' : '#A9C3CB'} />
        </g>

        {/* Front hills and pines. */}
        <path d="M0,470 C180,446 340,470 520,456 C700,444 860,468 1000,452 L1000,560 L0,560 Z" fill={s.foliage.grass} />
        {slopePines.map((p, i) => (
          <Pine key={`sp-${i}`} x={p.x} base={480 + (i % 3) * 10} scale={0.7 + (i % 4) * 0.12} season={season} />
        ))}

        {/* Dreams on the trail. */}
        {markers.map((m) => {
          const [x, y] = TRAIL[m.step];
          const hover = { label: m.title, description: m.reached ? 'Reached' : 'Still ahead' };
          return (
            <g key={m.id} transform={`translate(${x} ${y})`}>
              <g
                className="lw-hot"
                role="button"
                tabIndex={0}
                aria-label={`${m.title}, ${m.reached ? 'reached' : 'still ahead'}`}
                onClick={() => setSelected(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(m);
                  }
                }}
                onMouseEnter={() => setHovered(hover)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(hover)}
                onBlur={() => setHovered(null)}
              >
                <title>{`${m.title} — ${m.reached ? 'reached' : 'still ahead'}`}</title>
                <rect x={-14} y={-26} width={28} height={32} fill="transparent" />
                {m.reached ? (
                  <g>
                    <rect x={-0.8} y={-22} width={1.6} height={22} fill={W.ink} />
                    <g className="lw-flutter-flag" style={{ animationDuration: `${2.4 + (m.step % 3) * 0.4}s` }}>
                      <path d="M0.8,-22 L13,-18 L0.8,-14 Z" fill={W.terracotta} />
                    </g>
                    <circle cx={0} cy={0} r={3} fill={W.gold} />
                  </g>
                ) : (
                  <g>
                    <ellipse cx={0} cy={-2} rx={7} ry={4} fill="#A9A49B" />
                    <ellipse cx={0} cy={-7} rx={5} ry={3} fill="#B9B4AB" />
                    <ellipse cx={0} cy={-11} rx={3} ry={2.2} fill="#C9C4BB" />
                    <path d="M2,-11 L9,-13" stroke={W.teal} strokeWidth={1.6} strokeLinecap="round" />
                  </g>
                )}
                <g className="lw-ring" pointerEvents="none">
                  <rect x={-16} y={-28} width={32} height={36} rx={8} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="5 4" />
                </g>
              </g>
            </g>
          );
        })}

        {/* The two of you at the foot of the trail. */}
        <Figure avatar={avatars.user_1} x={404} y={470} name={data.couple.user1.name} standing lean={3} />
        <Figure avatar={avatars.user_2} x={436} y={470} name={data.couple.user2.name} standing lean={-3} />

        <Relight s={s} />
        {life.windowLights && <circle cx={706} cy={211} r={22} fill="url(#lw-glow)" className="lw-glow" pointerEvents="none" />}
        <WeatherFront s={s} />
        <Birds points={birds} night={night} />
      </PlaceFrame>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <PlacePanel
          title={dreams.length ? `${reached} of ${dreams.length} dreams reached` : 'No dreams on the trail yet'}
          action={
            <Link href="/bucket-list" className="text-xs font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
              Full list
            </Link>
          }
        >
          {dreams.length === 0 ? (
            <EmptyNote>Write down something you want to do together. It will wait on the trail until you get there.</EmptyNote>
          ) : (
            <ul className="space-y-1.5">
              {dreams.map((d) => (
                <li key={d.id}>
                  <label className="flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer" style={{ borderColor: '#E7DCCB', background: d.completed ? '#F1F6EE' : '#FFFDF9' }}>
                    <input type="checkbox" checked={d.completed} onChange={() => toggleBucketItem(d.id)} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold truncate ${d.completed ? 'line-through opacity-70' : ''}`}>{d.title}</span>
                      <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                        {d.category}
                        {d.completed && d.completedDate ? ` · reached ${d.completedDate}` : ''}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {dreams.length > TRAIL_STEPS && (
            <p className="mt-2 text-[11px]" style={{ color: W.inkSoft }}>
              The trail shows {TRAIL_STEPS} at a time; every dream is listed here.
            </p>
          )}
        </PlacePanel>
        <PlacePanel title="Add a dream">
          <form onSubmit={add} className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="See the northern lights together"
              aria-label="Dream"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: '#DCCFBC', background: '#FFFDF9', color: W.ink }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BucketCategory)}
              aria-label="Kind of dream"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: '#DCCFBC', background: '#FFFDF9', color: W.ink }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!title.trim()} className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40" style={{ background: W.ink, color: W.paper }}>
              Put it on the trail
            </button>
          </form>
        </PlacePanel>
      </div>
    </div>
  );
}

export default DreamMountains;
