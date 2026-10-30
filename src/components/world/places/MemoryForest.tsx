'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDiary } from '@/store/DiaryContext';
import { scatter } from '@/lib/world/world';
import { FOREST_SLOTS, forestKeepsakes } from '@/lib/world/places';
import {
  Birds,
  Butterflies,
  Figure,
  Fireflies,
  Pine,
  Relight,
  Sky,
  SkyDefs,
  Tree,
  W,
  WeatherFront,
  WorldPlaceholder,
  useWorldAvatars,
  useWorldState,
} from '../kit';
import { EmptyNote, PlaceFrame, PlacePanel, type Hover } from '../PlaceFrame';

// Six trees, two hanging places on each: twelve keepsakes in view.
const TREES: { x: number; base: number; scale: number }[] = [
  { x: 190, base: 438, scale: 1.25 },
  { x: 318, base: 412, scale: 1.05 },
  { x: 430, base: 398, scale: 0.9 },
  { x: 596, base: 398, scale: 0.9 },
  { x: 706, base: 414, scale: 1.05 },
  { x: 830, base: 440, scale: 1.25 },
];

function slotPosition(slot: number): { x: number; y: number } {
  const tree = TREES[Math.floor(slot / 2) % TREES.length];
  const left = slot % 2 === 0;
  return { x: tree.x + (left ? -24 : 24) * tree.scale, y: tree.base - (left ? 62 : 70) * tree.scale };
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function MemoryForest() {
  const router = useRouter();
  const { data } = useDiary();
  const s = useWorldState('forest');
  const [avatars] = useWorldAvatars();
  const [hovered, setHovered] = React.useState<Hover>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (!s) return <WorldPlaceholder />;

  const memories = data.memories.map((m) => ({ id: m.id, title: m.title, date: m.date, photoCount: m.photos?.length ?? 0 }));
  const keepsakes = forestKeepsakes(memories, FOREST_SLOTS);
  const all = memories.slice().sort((a, b) => b.date.localeCompare(a.date));
  const { life, season, night } = s;
  const leafColour = season === 'autumn' ? W.terracotta : season === 'winter' ? '#B8C4C0' : s.foliage.canopyLight;
  const sunbeams = life.sun && s.weather === 'clear' && !night;
  const deer = !night && s.weather !== 'rain' && s.weather !== 'snow';
  const birds = scatter(s.daySeed ^ 0x11, life.birds, { x: 220, y: 90, w: 560, h: 60 }, { min: 24, max: 38 });
  const butterflies = scatter(s.daySeed ^ 0x12, life.butterflies, { x: 300, y: 420, w: 400, h: 50 }, { min: 5, max: 9 });
  const fireflies = scatter(s.daySeed ^ 0x13, life.fireflies + (night ? 3 : 0), { x: 200, y: 300, w: 620, h: 150 }, { min: 6, max: 11 });
  const backPines = scatter(s.coupleSeed ^ 0x14, 14, { x: 0, y: 300, w: 1000, h: 14 }, { min: 1, max: 2 });

  const line =
    s.ambience.line ??
    (keepsakes.length
      ? 'Har ped par ek yaad latki hai. Kisi ko bhi chhoo kar kholo.'
      : 'Jungle abhi shaant hai. Pehli yaad yahan pehla ped banegi.');

  return (
    <div className="space-y-5">
      <PlaceFrame
        s={s}
        current="/world/forest"
        title="Memory Forest"
        line={line}
        sceneLabel={`Memory Forest with ${keepsakes.length} memories hanging from the trees.`}
        svgRef={svgRef}
        hovered={hovered}
      >
        <SkyDefs s={s} />
        <Sky s={s} sunX={760} />
        {/* Far treeline. */}
        <path d="M0,320 C120,250 220,280 330,240 C450,200 560,260 680,232 C800,206 900,250 1000,236 L1000,560 L0,560 Z" fill="#6E8D80" />
        {backPines.map((p, i) => (
          <Pine key={`bp-${i}`} x={p.x} base={322 + (i % 3) * 6} scale={0.9 + (i % 4) * 0.12} season={season} />
        ))}
        {/* Forest floor. */}
        <path d="M0,382 C200,360 360,372 520,366 C690,360 820,374 1000,366 L1000,560 L0,560 Z" fill={s.foliage.grass} />
        {/* The trail, narrowing into the trees. */}
        <path d="M430,560 C470,480 500,420 512,368 L528,368 C540,420 560,480 600,560 Z" fill={W.stone} opacity={0.75} />
        {sunbeams &&
          [[300, 0], [520, 0], [700, 0]].map(([bx], i) => (
            <g key={`beam-${i}`} pointerEvents="none">
              <polygon
                className="lw-sunbeam"
                points={`${bx},0 ${bx + 60},0 ${bx + 160},420 ${bx + 60},420`}
                fill="#FFF3CF"
                opacity={0.07}
                style={{ animationDuration: `${9 + i * 3}s`, animationDelay: `${-i * 2.5}s` }}
              />
            </g>
          ))}

        {TREES.map((t, i) => (
          <Tree key={`tree-${i}`} x={t.x} base={t.base} season={season} scale={t.scale} tone={(i % 3) * -0.06} swayDuration={s.weather === 'windy' ? 3.3 + i * 0.3 : 7 + i * 0.6} />
        ))}

        {/* Keepsakes hanging from the branches. */}
        {keepsakes.map((k) => {
          const { x, y } = slotPosition(k.slot);
          const label = { label: k.title, description: formatDate(k.date) };
          return (
            <g key={k.id} transform={`translate(${x} ${y})`}>
              <g className="lw-hang" style={{ animationDuration: `${5 + (k.slot % 4) * 0.8}s`, animationDelay: `${-k.slot * 0.6}s` }}>
                <g
                  className="lw-hot"
                  role="link"
                  tabIndex={0}
                  aria-label={`${k.title}, ${formatDate(k.date)}`}
                  onClick={() => router.push(`/memories/${encodeURIComponent(k.id)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/memories/${encodeURIComponent(k.id)}`);
                    }
                  }}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(label)}
                  onBlur={() => setHovered(null)}
                >
                  <title>{`${k.title} — ${formatDate(k.date)}`}</title>
                  <line x1={0} y1={0} x2={0} y2={12} stroke={W.ink} strokeWidth={0.8} opacity={0.6} />
                  {k.form === 'polaroid' ? (
                    <g transform={`translate(0 12) rotate(${(k.slot % 3) * 4 - 4})`}>
                      <rect x={-8} y={0} width={16} height={19} fill={W.paper} stroke="#CDBFA9" strokeWidth={0.8} />
                      <rect x={-6} y={2} width={12} height={11} fill={[W.sky, W.terracotta, W.forest, W.gold][k.slot % 4]} opacity={0.8} />
                    </g>
                  ) : (
                    <g transform="translate(0 12)">
                      <path d="M0,0 C9,4 9,16 0,22 C-9,16 -9,4 0,0 Z" fill={leafColour} stroke={W.forest} strokeWidth={0.8} />
                      <path d="M0,2 L0,20" stroke={W.forest} strokeWidth={0.7} />
                    </g>
                  )}
                  <g className="lw-ring" pointerEvents="none">
                    <rect x={-13} y={8} width={26} height={30} rx={6} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="5 4" />
                  </g>
                </g>
              </g>
            </g>
          );
        })}

        {/* A deer at the forest's edge, grazing. */}
        {deer && (
          <g transform="translate(900 452)" pointerEvents="none">
            <title>A deer</title>
            <ellipse cx={0} cy={0} rx={16} ry={8} fill="#A3774F" />
            <rect x={-12} y={4} width={3} height={16} fill="#8C6446" />
            <rect x={9} y={4} width={3} height={16} fill="#8C6446" />
            <g className="lw-graze" style={{ animationDuration: '7s' }}>
              <path d="M-12,-4 L-22,6 L-26,4 L-18,-8 Z" fill="#A3774F" />
              <path d="M-19,-8 L-22,-16 M-17,-8 L-16,-15" stroke="#6B4A35" strokeWidth={1.4} />
            </g>
          </g>
        )}

        {/* The two of you, walking the trail. */}
        <Figure avatar={avatars.user_1} x={494} y={470} name={data.couple.user1.name} standing lean={4} />
        <Figure avatar={avatars.user_2} x={530} y={470} name={data.couple.user2.name} standing lean={-4} />
        <path d="M502,452 Q507,456 512,456" fill="none" stroke={avatars.user_1.skin} strokeWidth={3} strokeLinecap="round" />
        <path d="M512,456 Q517,456 522,452" fill="none" stroke={avatars.user_2.skin} strokeWidth={3} strokeLinecap="round" />

        {/* Signboard. */}
        <g transform="translate(250 480)">
          <rect x={-2} y={-6} width={4} height={40} fill={W.wood} />
          <rect x={-56} y={-30} width={112} height={28} rx={4} fill="#B98A62" stroke={W.wood} strokeWidth={2} />
          <text x={0} y={-10} textAnchor="middle" fontSize={17} fill={W.paper} className="lw-handwritten">
            Memory Forest
          </text>
        </g>

        <Butterflies points={butterflies} accent={W.terracotta} />
        <Relight s={s} />
        <Fireflies points={fireflies} />
        <WeatherFront s={s} />
        <Birds points={birds} night={night} />
      </PlaceFrame>

      <PlacePanel
        title={all.length ? `${all.length} ${all.length === 1 ? 'memory' : 'memories'} in the forest` : 'The forest is waiting'}
        action={
          <Link href="/memories/new" className="text-xs font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
            Plant a memory
          </Link>
        }
      >
        {all.length === 0 ? (
          <EmptyNote>Save your first memory and it will hang here, on the nearest tree.</EmptyNote>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {all.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/memories/${encodeURIComponent(m.id)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 hover:shadow-sm transition-shadow"
                  style={{ borderColor: '#E7DCCB', background: '#FFFDF9' }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{m.title}</span>
                    <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                      {formatDate(m.date)} · {m.photoCount ? `${m.photoCount} photo${m.photoCount === 1 ? '' : 's'}` : 'words only'}
                    </span>
                  </span>
                  <span aria-hidden="true">{m.photoCount ? '🖼️' : '🍃'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PlacePanel>
    </div>
  );
}

export default MemoryForest;
