'use client';

import React from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { W } from './kit';

/**
 * Every place in the world, with what it actually holds. A small painted
 * vignette for each, drawn from the same shapes as the scenes, so the map
 * looks like the world it leads into.
 */
export function WorldMap() {
  const { data } = useDiary();
  const reached = data.bucketList.filter((d) => d.completed).length;
  const places = [
    {
      href: '/dashboard',
      name: 'Our Little Home',
      blurb: 'The house on the hill. Today, the mailbox, the two of you on the bench.',
      count: 'Today',
      art: <HomeArt />,
    },
    {
      href: '/world/forest',
      name: 'Memory Forest',
      blurb: 'Every memory you save hangs from a tree here.',
      count: `${data.memories.length} ${data.memories.length === 1 ? 'memory' : 'memories'}`,
      art: <ForestArt />,
    },
    {
      href: '/world/river',
      name: 'Love River',
      blurb: 'Your messages float by as paper boats. Send a hug from the bank.',
      count: 'Your messages',
      art: <RiverArt />,
    },
    {
      href: '/world/mountains',
      name: 'Dream Mountains',
      blurb: 'Dreams wait on the trail. The ones you reach get a flag.',
      count: `${reached} of ${data.bucketList.length} reached`,
      art: <MountainArt />,
    },
    {
      href: '/world/starlight',
      name: 'Starlight Hill',
      blurb: 'Always night. Letters, anniversaries, and the bench under the stars.',
      count: `${data.letters.filter((l) => !l.isDraft).length} letters`,
      art: <StarArt />,
    },
    {
      href: '/journey',
      name: 'The Train',
      blurb: 'Ride through the world, stopping at every milestone.',
      count: 'Your journey',
      art: <TrainArt />,
    },
  ];
  return (
    <div className="space-y-5">
      <header className="rounded-[2rem] border px-6 py-6" style={{ background: W.paper, borderColor: '#E7DCCB', color: W.ink }}>
        <h1 className="lw-handwritten text-4xl leading-none">Hum dono ki chhoti si duniya</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: W.inkSoft }}>
          A little world, and every place in it leads to something of yours.
        </p>
      </header>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="block rounded-[1.5rem] overflow-hidden border hover:shadow-card transition-shadow focus:outline-none focus-visible:ring-2"
              style={{ background: W.paper, borderColor: '#E7DCCB', color: W.ink }}
            >
              <svg viewBox="0 0 300 140" className="block w-full h-auto" aria-hidden="true">
                {p.art}
              </svg>
              <div className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="lw-handwritten text-2xl leading-none">{p.name}</h2>
                  <span className="text-[11px] font-semibold" style={{ color: W.inkSoft }}>
                    {p.count}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: W.inkSoft }}>
                  {p.blurb}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ground({ sky = W.sky, grass = '#7EA56C' }: { sky?: string; grass?: string }) {
  return (
    <>
      <rect width={300} height={140} fill={sky} />
      <path d="M0,96 C80,82 180,92 300,84 L300,140 L0,140 Z" fill={grass} />
    </>
  );
}

function HomeArt() {
  return (
    <>
      <Ground />
      <circle cx={240} cy={30} r={12} fill={W.gold} />
      <rect x={96} y={62} width={56} height={36} fill={W.paper} />
      <polygon points="90,64 124,38 158,64" fill={W.terracotta} />
      <rect x={118} y={76} width={12} height={22} rx={5} fill="#7A4E3A" />
      <rect x={182} y={86} width={44} height={3} fill={W.wood} />
      <circle cx={194} cy={74} r={5} fill="#D09F78" />
      <circle cx={214} cy={74} r={5} fill="#D09F78" />
      <rect x={189} y={79} width={10} height={9} rx={4} fill={W.terracotta} />
      <rect x={209} y={79} width={10} height={9} rx={4} fill={W.teal} />
    </>
  );
}

function ForestArt() {
  return (
    <>
      <Ground sky="#BFD6C9" grass="#6F9A6B" />
      {[50, 110, 170, 230].map((x, i) => (
        <g key={x}>
          <rect x={x - 3} y={64} width={6} height={32} fill={W.bark} />
          <circle cx={x} cy={56} r={22 - (i % 2) * 4} fill={i % 2 ? '#56775C' : '#6F9A6B'} />
          <rect x={x + 8} y={66} width={9} height={11} fill={W.paper} stroke="#CDBFA9" strokeWidth={0.6} />
        </g>
      ))}
    </>
  );
}

function RiverArt() {
  return (
    <>
      <Ground sky="#BCD4DD" />
      <path d="M0,82 C100,74 200,88 300,80 L300,112 C200,120 100,106 0,116 Z" fill={W.teal} />
      <path d="M120,94 L144,94 L139,100 L125,100 Z M132,82 L132,94 L124,94 Z" fill={W.paper} />
      <path d="M200,90 L222,90 L217,96 L205,96 Z M211,79 L211,90 L218,90 Z" fill={W.paper} />
      <path d="M40,104 Q70,80 100,102" fill="none" stroke={W.wood} strokeWidth={4} />
    </>
  );
}

function MountainArt() {
  return (
    <>
      <rect width={300} height={140} fill="#B9CFD6" />
      <polygon points="20,140 150,24 280,140" fill="#7E968F" />
      <polygon points="130,42 150,24 170,42 160,40 150,46 140,40" fill={W.paper} />
      <polyline points="120,130 160,110 132,92 170,72 146,52" fill="none" stroke={W.stone} strokeWidth={3} strokeLinecap="round" />
      <path d="M160,110 L160,96 L170,100 L160,104" fill={W.terracotta} stroke={W.ink} strokeWidth={0.8} />
    </>
  );
}

function StarArt() {
  return (
    <>
      <rect width={300} height={140} fill="#1E242C" />
      {[[30, 20], [80, 40], [130, 14], [200, 30], [250, 50], [60, 64], [170, 58], [270, 18]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} fill="#F6F1E4" />
      ))}
      <circle cx={232} cy={34} r={10} fill="#F1EBDD" />
      <path d="M60,140 C120,92 220,88 300,120 L300,140 Z" fill="#3A4B42" />
      <rect x={150} y={96} width={40} height={3} fill={W.wood} />
      <circle cx={204} cy={92} r={10} fill="#FFDFA0" opacity={0.35} />
      <rect x={200} y={88} width={7} height={9} rx={2} fill="#FFDFA0" />
    </>
  );
}

function TrainArt() {
  return (
    <>
      <Ground sky="#E9C7A0" grass="#A9A36A" />
      <circle cx={70} cy={74} r={20} fill="#F0A868" />
      <rect x={0} y={100} width={300} height={2} fill="#5E6E66" />
      <rect x={150} y={84} width={30} height={15} rx={3} fill={W.terracotta} />
      <rect x={174} y={77} width={5} height={8} fill={W.ink} />
      <rect x={116} y={86} width={30} height={13} rx={2} fill={W.teal} />
      <rect x={82} y={86} width={30} height={13} rx={2} fill={W.gold} />
    </>
  );
}

export default WorldMap;
