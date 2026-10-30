'use client';

import React from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { scatter } from '@/lib/world/world';
import { daysUntilNextAnniversary } from '@/lib/world/places';
import {
  Figure,
  Fireflies,
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

function formatDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StarlightHill() {
  const { data, partnerProfile } = useDiary();
  // Starlight Hill keeps its own hour: it is always night here.
  const s = useWorldState('starlight', 'night');
  const [avatars] = useWorldAvatars();
  const [hovered, setHovered] = React.useState<Hover>(null);
  const [milestone, setMilestone] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  if (!s) return <WorldPlaceholder />;

  const me = data.activeProfileId;
  const unlocked = data.letters.filter((l) => !l.isDraft && l.unlockDate <= s.todayIso);
  const forMe = unlocked.filter((l) => l.toId === me).sort((a, b) => b.unlockDate.localeCompare(a.unlockDate));
  const fromPartner = unlocked.filter((l) => l.fromId !== me);
  const tender = data.memories
    .filter((m) => m.mood === 'romantic' || m.mood === 'touching')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const start = Date.parse(`${data.couple.startDate}T00:00:00`);
  const together = Number.isNaN(start) ? null : Math.max(0, Math.floor((s.now - start) / 86_400_000));
  const nextAnniversary = daysUntilNextAnniversary(data.couple.anniversaryDate, s.todayIso);

  // A band of stars that is always here, cloud or no cloud — it is what the
  // hill is for. The general sky adds its own when the night is clear.
  const band = scatter(s.coupleSeed ^ 0x41, 46, { x: 0, y: 8, w: 1000, h: 230 }, { min: 3, max: 8 });
  const fireflies = scatter(s.daySeed ^ 0x42, Math.max(5, s.life.fireflies), { x: 200, y: 340, w: 620, h: 130 }, { min: 6, max: 11 });
  const townLights = scatter(s.coupleSeed ^ 0x43, 18, { x: 60, y: 392, w: 300, h: 26 }, { min: 4, max: 9 });

  const line = s.ambience.line ?? 'Yahan raat hamesha rehti hai. Baith jao, taare dekho.';

  return (
    <div className="space-y-5">
      <PlaceFrame
        s={s}
        current="/world/starlight"
        title="Starlight Hill"
        line={line}
        sceneLabel="Starlight Hill at night: a bench for two under the stars, with a lantern and fireflies."
        svgRef={svgRef}
        hovered={hovered}
        overlay={
          milestone &&
          together !== null && (
            <div className="absolute left-1/2 top-14 -translate-x-1/2 rounded-2xl px-4 py-2 text-center shadow-sm" style={{ background: W.paper, color: W.ink }} role="status">
              <p className="lw-handwritten text-2xl leading-none">Day {together.toLocaleString()} together</p>
              {nextAnniversary !== null && (
                <p className="text-[11px] mt-1" style={{ color: '#6B5E55' }}>
                  {nextAnniversary === 0 ? 'Your anniversary is today' : `${nextAnniversary} days until your anniversary`}
                </p>
              )}
            </div>
          )
        }
      >
        <SkyDefs s={s} />
        <Sky s={s} sunX={240} />
        {band.map((st, i) => (
          <g key={`band-${i}`} transform={`translate(${st.x} ${st.y})`} pointerEvents="none">
            <circle className="lw-twinkle" r={0.9 + st.scale * 0.8} fill="#F6F1E4" style={{ animationDuration: `${st.duration}s`, animationDelay: `${st.delay}s` }} />
          </g>
        ))}
        <g transform="translate(860 40)" pointerEvents="none">
          <g className="lw-shooting" style={{ animationDuration: '14s' }}>
            <path d="M0,0 L-34,17" stroke="#FFF6DA" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        </g>

        {/* The valley below, and a town still awake. */}
        <path d="M0,380 C200,370 360,392 520,384 C700,376 840,392 1000,384 L1000,560 L0,560 Z" fill="#2C3A44" />
        {townLights.map((t, i) => (
          <g key={`town-${i}`} transform={`translate(${t.x} ${t.y})`} pointerEvents="none">
            <rect className="lw-glow" x={-1.5} y={-1.5} width={3} height={3} fill="#FFDFA0" style={{ animationDuration: `${t.duration}s`, animationDelay: `${t.delay}s` }} />
          </g>
        ))}

        {/* The hill. */}
        <path d="M320,560 C420,452 560,420 680,424 C800,428 900,470 1000,520 L1000,560 Z" fill="#3A4B42" />
        <path d="M0,560 L0,470 C120,450 240,476 360,520 L400,560 Z" fill="#33433B" />
        {[440, 480, 530, 760, 820, 880, 930].map((gx, i) => (
          <g key={`grass-${gx}`} transform={`translate(${gx} ${440 + Math.abs(gx - 680) * 0.12})`} pointerEvents="none">
            <g className="lw-sway" style={{ animationDuration: `${4 + (i % 3)}s`, animationDelay: `${-i * 0.7}s` }}>
              <path d="M0,0 L-2,-12 M0,0 L2,-14 M0,0 L5,-10" stroke="#5E7A66" strokeWidth={1.4} strokeLinecap="round" />
            </g>
          </g>
        ))}

        {/* A bench for two, and the two of you on it. */}
        <rect x={612} y={402} width={104} height={5} rx={2} fill={W.wood} />
        <rect x={618} y={407} width={3} height={16} fill={W.wood} />
        <rect x={707} y={407} width={3} height={16} fill={W.wood} />
        <Figure avatar={avatars.user_1} x={642} y={422} lean={7} name={data.couple.user1.name} />
        <Figure avatar={avatars.user_2} x={686} y={422} lean={-7} name={data.couple.user2.name} />
        <path d="M650,416 Q657,421 664,421" fill="none" stroke={avatars.user_1.skin} strokeWidth={3.4} strokeLinecap="round" />
        <path d="M664,421 Q671,421 678,416" fill="none" stroke={avatars.user_2.skin} strokeWidth={3.4} strokeLinecap="round" />
        <rect x={610} y={422} width={108} height={6} rx={2} fill={W.wood} />
        <rect x={616} y={428} width={3} height={14} fill={W.wood} />
        <rect x={709} y={428} width={3} height={14} fill={W.wood} />

        {/* A lantern on the grass beside them. */}
        <g transform="translate(748 432)">
          <rect x={-1} y={-34} width={2} height={8} fill={W.ink} />
          <rect x={-7} y={-26} width={14} height={18} rx={3} fill="#FFDFA0" stroke={W.ink} strokeWidth={1.6} />
        </g>

        <Relight s={s} />
        <circle cx={748} cy={415} r={40} fill="url(#lw-glow)" className="lw-glow" pointerEvents="none" />
        <Fireflies points={fireflies} />
        <WeatherFront s={s} />

        {/* The brightest star holds your milestone. */}
        <g
          transform="translate(520 92)"
          className="lw-hot"
          role="button"
          tabIndex={0}
          aria-label="The brightest star — tap to see your milestone"
          onClick={() => setMilestone((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMilestone((v) => !v);
            }
          }}
          onMouseEnter={() => setHovered({ label: 'The brightest star', description: 'Your milestone' })}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered({ label: 'The brightest star', description: 'Your milestone' })}
          onBlur={() => setHovered(null)}
        >
          <title>The brightest star</title>
          <circle r={18} fill="transparent" />
          <circle r={13} fill="url(#lw-glow)" className="lw-glow" />
          <path d="M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z" fill="#FFF6DA" />
          <g className="lw-ring" pointerEvents="none">
            <circle r={18} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="5 4" />
          </g>
        </g>
      </PlaceFrame>

      <div className="grid lg:grid-cols-2 gap-5">
        <PlacePanel
          title="Letters for you"
          action={
            <Link href="/letters" className="text-xs font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
              All letters
            </Link>
          }
        >
          {forMe.length === 0 ? (
            <EmptyNote>No letters have opened for you yet. When one does, it will be waiting here.</EmptyNote>
          ) : (
            <ul className="space-y-1.5">
              {forMe.slice(0, 6).map((l) => (
                <li key={l.id}>
                  <Link href="/letters" className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: '#E7DCCB', background: l.readAt ? '#FFFDF9' : '#FBF1EC' }}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{l.title}</span>
                      <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                        Opened {formatDate(l.unlockDate)}
                      </span>
                    </span>
                    {!l.readAt && (
                      <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ background: '#F6E3DC', color: '#8A3F2C' }}>
                        Unread
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PlacePanel>

        <PlacePanel title="When I miss you">
          {fromPartner.length === 0 && tender.length === 0 ? (
            <EmptyNote>
              Letters from {partnerProfile.name}, and memories you marked romantic or touching, gather here for the days you need them.
            </EmptyNote>
          ) : (
            <ul className="space-y-1.5">
              {fromPartner.slice(0, 3).map((l) => (
                <li key={`l-${l.id}`}>
                  <Link href="/letters" className="block rounded-xl border px-3 py-2" style={{ borderColor: '#E7DCCB', background: '#FFFDF9' }}>
                    <span className="block text-sm font-semibold truncate">✉️ {l.title}</span>
                    <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                      A letter from {partnerProfile.name}
                    </span>
                  </Link>
                </li>
              ))}
              {tender.map((m) => (
                <li key={`m-${m.id}`}>
                  <Link href={`/memories/${encodeURIComponent(m.id)}`} className="block rounded-xl border px-3 py-2" style={{ borderColor: '#E7DCCB', background: '#FFFDF9' }}>
                    <span className="block text-sm font-semibold truncate">♡ {m.title}</span>
                    <span className="block text-[11px]" style={{ color: W.inkSoft }}>
                      {formatDate(m.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PlacePanel>

        <PlacePanel
          title="Dates that matter"
          action={
            <Link href="/countdowns" className="text-xs font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
              Countdowns
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: '#E7DCCB', background: '#FFFDF9' }}>
              <p className="lw-handwritten text-3xl leading-none">{together === null ? '—' : together.toLocaleString()}</p>
              <p className="text-[11px] mt-1" style={{ color: W.inkSoft }}>
                days together
              </p>
            </div>
            <div className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: '#E7DCCB', background: '#FFFDF9' }}>
              <p className="lw-handwritten text-3xl leading-none">{nextAnniversary === null ? '—' : nextAnniversary}</p>
              <p className="text-[11px] mt-1" style={{ color: W.inkSoft }}>
                {nextAnniversary === 0 ? 'anniversary today' : 'days to your anniversary'}
              </p>
            </div>
          </div>
        </PlacePanel>

        <PlacePanel title="Voice notes">
          <EmptyNote>
            Voice notes are kept inside the memory they belong to. Open a memory to listen.{' '}
            <Link href="/memories" className="font-semibold underline underline-offset-4" style={{ color: '#8A3F2C' }}>
              Your memories
            </Link>
          </EmptyNote>
        </PlacePanel>
      </div>
    </div>
  );
}

export default StarlightHill;
