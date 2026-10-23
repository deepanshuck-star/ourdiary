'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Globe2, MapPin, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { locationKey, type GeocodeCache } from '@/lib/features/geocode-queue';
import {
  buildWhereRound,
  haversineKm,
  type PlacedMemory,
  type WhereRound,
} from '@/lib/features/games/memoryGames';

export function WhereWereWeGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id || 'demo';

  // The Memory Globe already geocodes every location and caches the result.
  // Reading the same cache means this game costs no extra lookups — and
  // nothing is geocoded here, so it can't trip the rate limit either.
  const [cache] = useLocalState<GeocodeCache>(`globe-geocache:${coupleId}`, {});
  const [best, setBest] = useLocalState<number>(`games:where_best:${coupleId}`, 0);

  const placed = useMemo<PlacedMemory[]>(() => {
    const out: PlacedMemory[] = [];
    for (const memory of data.memories) {
      const key = locationKey(memory.location);
      if (!key) continue;
      const entry = cache[key];
      if (entry?.status !== 'found') continue;
      out.push({
        id: memory.id,
        title: memory.title,
        location: memory.location.trim(),
        lat: entry.lat,
        lng: entry.lng,
      });
    }
    return out;
  }, [data.memories, cache]);

  const [round, setRound] = useState<WhereRound | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  // Client-only: buildWhereRound uses Math.random.
  const deal = useCallback(() => {
    setRound(buildWhereRound(placed));
    setPicked(null);
  }, [placed]);

  useEffect(() => {
    deal();
  }, [deal]);

  const answer = (id: string) => {
    if (!round || picked) return;
    setPicked(id);
    if (id === round.answerId) {
      const next = streak + 1;
      setStreak(next);
      if (next > best) setBest(next);
    } else {
      setStreak(0);
    }
  };

  if (placed.length < 2) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-6 space-y-3">
        <p className="text-sm text-ink-muted">
          This plays off the places already pinned on your Memory Globe, and it needs at least two of them.
          {placed.length === 0
            ? ' Nothing is pinned yet — open the globe once and let it look your locations up.'
            : ' Only one is pinned so far.'}
        </p>
        <Link
          href="/globe"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
        >
          <Globe2 className="w-3.5 h-3.5" /> Open the Memory Globe
        </Link>
      </div>
    );
  }

  if (!round) return <p className="text-sm text-ink-muted">Dealing…</p>;

  const correct = round.options.find((o) => o.id === round.answerId)!;
  const chosen = picked ? round.options.find((o) => o.id === picked) : null;
  const missKm = chosen && chosen.id !== correct.id ? haversineKm(chosen, correct) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Streak <span className="font-semibold text-ink">{streak}</span> · best{' '}
          <span className="font-semibold text-ink">{best}</span>
        </p>
        <button
          type="button"
          onClick={deal}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Skip
        </button>
      </div>

      <div className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-card space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Where were we?</p>
          <p className="font-display text-xl font-semibold text-ink mt-1">{round.title}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {round.options.map((option) => {
            const isAnswer = option.id === round.answerId;
            const isChosen = option.id === picked;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => answer(option.id)}
                disabled={Boolean(picked)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-medium text-left border transition-colors flex items-center gap-2 ${
                  !picked
                    ? 'border-line bg-canvas text-ink hover:border-primary'
                    : isAnswer
                      ? 'border-primary bg-primary text-on-primary'
                      : isChosen
                        ? 'border-danger bg-danger/10 text-danger'
                        : 'border-line bg-canvas text-ink-muted'
                }`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{option.location}</span>
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="pt-3 border-t border-line space-y-2" aria-live="polite">
            <p className="text-sm font-semibold text-ink">
              {picked === round.answerId ? 'Right 💛' : `It was ${correct.location}`}
            </p>
            {missKm !== null && (
              <p className="text-xs text-ink-muted">You were about {Math.round(missKm)} km off.</p>
            )}
            <button
              type="button"
              onClick={deal}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
            >
              Next one
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhereWereWeGame;
