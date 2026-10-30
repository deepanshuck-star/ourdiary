'use client';

import React from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchMessagesRemote, type ChatMessageRow } from '@/lib/supabase/chat';
import { stripLegacyProfileTag } from '@/lib/features/chat';
import { scatter } from '@/lib/world/world';
import { RIVER_BOATS, riverBoats, type Boat } from '@/lib/world/places';
import {
  Birds,
  Butterflies,
  Figure,
  Fireflies,
  Relight,
  Ripples,
  Sky,
  SkyDefs,
  Tree,
  W,
  WeatherFront,
  WorldPlaceholder,
  useRipples,
  useWorldAvatars,
  useWorldState,
} from '../kit';
import { EmptyNote, PlaceFrame, PlacePanel, type Hover } from '../PlaceFrame';

interface LocalChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

const LANES = [372, 404, 436];

function timeLabel(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function LoveRiver() {
  const { data, isLiveUser, currentUserId, partnerProfile, sendWarmHug } = useDiary();
  const s = useWorldState('river');
  const [avatars] = useWorldAvatars();
  const [hovered, setHovered] = React.useState<Hover>(null);
  const [openBoat, setOpenBoat] = React.useState<Boat | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const { ripples, rippleAt } = useRipples(svgRef);

  // The same messages the chat shows: from the server for a live couple,
  // from this device in demo mode. The river only ever reads them.
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const [remote, setRemote] = React.useState<ChatMessageRow[] | null>(null);
  const [local] = useLocalState<LocalChatMessage[]>(`chat:${coupleId || 'demo'}`, []);
  React.useEffect(() => {
    if (!supabase || !coupleId) return;
    let alive = true;
    fetchMessagesRemote(supabase, coupleId, 24)
      .then((rows) => alive && setRemote(rows))
      .catch(() => alive && setRemote([]));
    return () => {
      alive = false;
    };
  }, [supabase, coupleId]);

  if (!s) return <WorldPlaceholder />;

  const messages = (supabase ? remote ?? [] : local).map((m) => ({
    id: m.id,
    senderId: m.senderId,
    content: stripLegacyProfileTag(m.content),
    createdAt: m.createdAt,
  }));
  const myId = supabase ? currentUserId ?? '' : data.activeProfileId;
  const boats = riverBoats(messages, myId, RIVER_BOATS);
  const authorName = (b: Boat) => (b.from === 'me' ? 'You' : partnerProfile.name);

  const { life, night, season } = s;
  const birds = scatter(s.daySeed ^ 0x21, life.birds, { x: 200, y: 90, w: 600, h: 70 }, { min: 22, max: 36 });
  const butterflies = scatter(s.daySeed ^ 0x22, life.butterflies, { x: 160, y: 480, w: 600, h: 40 }, { min: 5, max: 9 });
  const fireflies = scatter(s.daySeed ^ 0x23, life.fireflies, { x: 120, y: 300, w: 760, h: 200 }, { min: 6, max: 11 });
  const fishJump = !night && s.weather !== 'snow';

  const line =
    s.ambience.line ??
    (boats.length ? 'Nadi tum dono ki baatein le kar beh rahi hai.' : 'Nadi shaant hai. Pehli kaagaz ki naav tum chhodo.');

  return (
    <div className="space-y-5">
      <PlaceFrame
        s={s}
        current="/world/river"
        title="Love River"
        line={line}
        sceneLabel={`Love River, with ${boats.length} paper boats carrying your messages.`}
        svgRef={svgRef}
        hovered={hovered}
        overlay={
          openBoat && (
            <div
              className="absolute left-1/2 top-14 -translate-x-1/2 w-[min(90%,26rem)] rounded-2xl px-4 py-3 shadow-sm"
              style={{ background: W.paper, color: W.ink }}
              role="status"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: openBoat.from === 'me' ? '#8A3F2C' : '#245C58' }}>
                {authorName(openBoat)} · {timeLabel(openBoat.createdAt)}
              </p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">{openBoat.text}</p>
              <button type="button" onClick={() => setOpenBoat(null)} className="mt-2 text-xs font-semibold underline underline-offset-4">
                Let it float on
              </button>
            </div>
          )
        }
      >
        <SkyDefs s={s} />
        <Sky s={s} />
        <path d="M0,290 C160,240 300,262 460,236 C620,212 760,250 1000,226 L1000,560 L0,560 Z" fill="#88A597" />
        {/* Far bank. */}
        <path d="M0,338 C220,318 420,332 620,322 C780,314 900,326 1000,320 L1000,560 L0,560 Z" fill={s.foliage.grass} opacity={0.9} />
        <Tree x={120} base={340} season={season} scale={0.8} swayDuration={7.5} />
        <Tree x={620} base={330} season={season} scale={0.7} swayDuration={8.2} />
        <Tree x={880} base={334} season={season} scale={0.85} swayDuration={6.9} />

        {/* The river, wide and slow. Touch it. */}
        <path d="M0,352 C200,340 420,358 620,346 C800,336 900,350 1000,344 L1000,466 C820,476 640,460 440,472 C260,482 120,468 0,476 Z" fill="url(#lw-river)" className="lw-river" onClick={rippleAt}>
          <title>The river — touch it</title>
        </path>
        {[[140, 380], [320, 420], [520, 390], [690, 440], [860, 380], [240, 452]].map(([sx, sy], i) => (
          <g key={`sh-${i}`} transform={`translate(${sx} ${sy})`} pointerEvents="none">
            <rect className="lw-shimmer" x={-12} y={-1} width={24} height={2} rx={1} fill={W.paper} style={{ animationDuration: `${4 + i}s`, animationDelay: `${-i * 0.9}s` }} />
          </g>
        ))}

        {/* A kingfisher waits on a low branch over the water. */}
        {!night && (
          <g transform="translate(186 336)" pointerEvents="none">
            <title>A kingfisher</title>
            <path d="M-40,6 L20,0" stroke={W.bark} strokeWidth={3} strokeLinecap="round" />
            <g transform="translate(4 -6)">
              <ellipse cx={0} cy={0} rx={6} ry={4.5} fill="#E08A4F" />
              <ellipse cx={-1} cy={-2.5} rx={5.5} ry={3} fill="#2F7E9A" />
              <circle cx={4} cy={-5} r={3} fill="#2F7E9A" />
              <path d="M6.5,-5 L12,-4 L6.5,-3.5 Z" fill={W.ink} />
            </g>
          </g>
        )}

        {/* Fish, now and then. At rest they are under the water. */}
        {fishJump &&
          [[380, 430, 11], [760, 410, 14]].map(([fx, fy, d], i) => (
            <g key={`fish-${i}`} transform={`translate(${fx} ${fy})`} pointerEvents="none">
              <g className="lw-jump" style={{ animationDuration: `${d}s`, animationDelay: `${-i * 5}s` }}>
                <ellipse rx={6} ry={2.6} fill="#C9D9DB" />
                <path d="M-6,0 L-10,-3 L-10,3 Z" fill="#C9D9DB" />
              </g>
            </g>
          ))}

        {life.ducks &&
          [[560, 448], [596, 456]].map(([dx, dy], i) => (
            <g key={`duck-${i}`} transform={`translate(${dx} ${dy})`} pointerEvents="none">
              <g className="lw-bob" style={{ animationDuration: `${3.4 + i}s` }}>
                <ellipse rx={9} ry={5} fill="#F3EDE0" />
                <circle cx={7} cy={-5} r={3.6} fill="#F3EDE0" />
                <path d="M10,-5 L14,-4 L10,-3 Z" fill={W.gold} />
              </g>
            </g>
          ))}

        {/* Paper boats: real messages, drifting downstream. */}
        {boats.map((b, i) => {
          const from = -(120 + i * 140);
          return (
            <g key={b.id} transform={`translate(${160 + i * 130} ${LANES[b.lane]})`}>
              <g
                className="lw-boat"
                style={{
                  animationDuration: `${46 + i * 7}s`,
                  animationDelay: `${-i * 9}s`,
                  ['--from' as string]: `${from}px`,
                  ['--to' as string]: `${1000 - (160 + i * 130) + 80}px`,
                }}
              >
                <g className="lw-rock">
                  <g
                    className="lw-hot lw-boat-hit"
                    role="button"
                    tabIndex={0}
                    aria-label={`A paper boat from ${authorName(b)}: ${b.text.slice(0, 80)}`}
                    onClick={() => setOpenBoat(b)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenBoat(b);
                      }
                    }}
                    onMouseEnter={() => setHovered({ label: `From ${authorName(b)}`, description: b.text.length > 40 ? `${b.text.slice(0, 40)}…` : b.text })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ label: `From ${authorName(b)}`, description: b.text.length > 40 ? `${b.text.slice(0, 40)}…` : b.text })}
                    onBlur={() => setHovered(null)}
                  >
                    <rect x={-20} y={-24} width={40} height={32} fill="transparent" />
                    <path d="M-16,0 L16,0 L10,7 L-10,7 Z" fill={W.paper} stroke="#CDBFA9" strokeWidth={0.8} />
                    <path d="M0,-18 L0,0 L-11,0 Z" fill={W.paper} stroke="#CDBFA9" strokeWidth={0.8} />
                    <path d="M0,-18 L10,0 L0,0 Z" fill={b.from === 'me' ? '#F2D3C8' : '#CFE3DF'} stroke="#CDBFA9" strokeWidth={0.8} />
                    <g className="lw-ring" pointerEvents="none">
                      <rect x={-22} y={-26} width={44} height={36} rx={8} fill="none" stroke={W.paper} strokeWidth={2} strokeDasharray="5 4" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          );
        })}

        {/* The bridge. */}
        <g pointerEvents="none">
          <path d="M700,470 Q790,396 880,466" fill="none" stroke={W.wood} strokeWidth={9} strokeLinecap="round" />
          {[716, 744, 772, 800, 828, 856].map((bx) => (
            <rect key={bx} x={bx} y={420 + Math.abs(bx - 790) * 0.55} width={2.5} height={16} fill={W.wood} />
          ))}
        </g>

        {/* Near bank, with pebbles and the two of you sitting by the water. */}
        <path d="M0,476 C120,468 260,482 440,472 C640,460 820,476 1000,466 L1000,560 L0,560 Z" fill={s.foliage.grass} />
        {[[120, 488], [148, 494], [300, 486], [620, 478], [654, 484], [940, 480]].map(([px, py], i) => (
          <ellipse key={`peb-${i}`} cx={px} cy={py} rx={6 - (i % 3)} ry={3} fill={W.stone} />
        ))}
        <Figure avatar={avatars.user_1} x={438} y={482} name={data.couple.user1.name} lean={5} />
        <Figure avatar={avatars.user_2} x={472} y={482} name={data.couple.user2.name} lean={-5} />
        <path d="M446,476 Q451,481 455,481" fill="none" stroke={avatars.user_1.skin} strokeWidth={3} strokeLinecap="round" />
        <path d="M455,481 Q459,481 464,476" fill="none" stroke={avatars.user_2.skin} strokeWidth={3} strokeLinecap="round" />
        {life.flowers &&
          [180, 210, 240, 680, 710, 900].map((fx, i) => (
            <g key={`fl-${fx}`} transform={`translate(${fx} 500)`}>
              <rect x={-0.8} y={-9} width={1.6} height={9} fill={W.forest} />
              <g className="lw-sway" style={{ animationDuration: `${4 + (i % 3)}s`, animationDelay: `${-i * 0.6}s` }}>
                <circle cy={-10} r={3.2} fill={i % 2 ? s.foliage.accent : W.terracotta} />
              </g>
            </g>
          ))}

        <Butterflies points={butterflies} accent={W.terracotta} />
        <Relight s={s} />
        <Fireflies points={fireflies} />
        <WeatherFront s={s} />
        <Ripples ripples={ripples} />
        <Birds points={birds} night={night} />
      </PlaceFrame>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <PlacePanel title="On the water">
          {boats.length === 0 ? (
            <EmptyNote>No messages yet. Anything either of you writes in chat floats down this river.</EmptyNote>
          ) : (
            <ul className="space-y-2">
              {boats
                .slice()
                .reverse()
                .map((b) => (
                  <li key={b.id} className="rounded-xl border px-3 py-2" style={{ borderColor: '#E7DCCB', background: b.from === 'me' ? '#FBF1EC' : '#EEF6F4' }}>
                    <p className="text-[11px] font-bold" style={{ color: b.from === 'me' ? '#8A3F2C' : '#245C58' }}>
                      {authorName(b)} · {timeLabel(b.createdAt)}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{b.text}</p>
                  </li>
                ))}
            </ul>
          )}
        </PlacePanel>
        <PlacePanel title="From the riverbank">
          <div className="space-y-3">
            <Link
              href="/chat"
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-center"
              style={{ background: W.ink, color: W.paper }}
            >
              Float a message
            </Link>
            <button
              type="button"
              onClick={() => sendWarmHug()}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold border"
              style={{ borderColor: '#DCCFBC', color: W.ink, background: '#FFFDF9' }}
            >
              Send {partnerProfile.name} a warm hug
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: W.inkSoft }}>
              Boats are your real messages, the latest {RIVER_BOATS}. Each is marked with who actually wrote it.
            </p>
          </div>
        </PlacePanel>
      </div>
    </div>
  );
}

export default LoveRiver;
