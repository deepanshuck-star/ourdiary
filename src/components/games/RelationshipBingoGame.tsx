'use client';

import React, { useMemo, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { useNow } from '@/hooks/useNow';
import {
  BINGO_IDEAS,
  BINGO_SIZE,
  bingoLines,
  bingoProgress,
  createBingoCard,
  isBlackout,
  toggleSquare,
  type BingoState,
} from '@/lib/features/games/collab';

function localToday(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function RelationshipBingoGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id || 'demo';
  // Shared: one card between the two of you, ticked off over months.
  const [card, setCard] = useLocalState<BingoState | null>(`games:bingo:${coupleId}`, null);
  const [confirmNew, setConfirmNew] = useState(false);

  // Client-only clock: a date read during the prerender would be frozen at
  // build time and fails the build outright.
  const nowMs = useNow(60_000);
  const today = nowMs === null ? null : localToday(nowMs);

  const lines = useMemo(() => (card ? bingoLines(card) : []), [card]);
  const inLine = useMemo(() => new Set(lines.flat()), [lines]);

  const deal = () => {
    if (!today) return;
    // Shuffled here rather than in the pure module so Math.random stays off
    // the prerender path.
    const ideas = [...BINGO_IDEAS].sort(() => Math.random() - 0.5);
    setCard(createBingoCard(ideas, today));
    setConfirmNew(false);
  };

  if (!today) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!card) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-8 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          Twenty-five things to do together, ticked off over months rather than an evening. A full line
          wins — you don’t need the whole card.
        </p>
        <button
          type="button"
          onClick={deal}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
        >
          Deal our card
        </button>
      </div>
    );
  }

  const progress = bingoProgress(card);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{progress.done}</span>/{progress.total} done
          {progress.lines > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-primary">
                {progress.lines} line{progress.lines === 1 ? '' : 's'}
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setConfirmNew(true)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New card
        </button>
      </div>

      {confirmNew && (
        <div className="rounded-2xl border border-line bg-canvas p-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink">A new card wipes everything you’ve ticked off. Sure?</p>
          <button
            type="button"
            onClick={deal}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-danger text-canvas"
          >
            Deal a new one
          </button>
          <button
            type="button"
            onClick={() => setConfirmNew(false)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Keep this card
          </button>
        </div>
      )}

      {progress.lines > 0 && (
        <p
          className="rounded-2xl bg-secondary text-ink p-3 text-sm font-semibold flex items-center gap-2"
          aria-live="polite"
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
          {isBlackout(card)
            ? 'Blackout. The entire card. Extraordinary.'
            : `Bingo — ${progress.lines} line${progress.lines === 1 ? '' : 's'} complete.`}
        </p>
      )}

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${BINGO_SIZE}, minmax(0, 1fr))` }}
      >
        {card.squares.map((square, i) => (
          <button
            key={square.id}
            type="button"
            onClick={() => setCard(toggleSquare(card, square.id, today))}
            aria-pressed={square.done}
            className={`aspect-square rounded-xl p-1.5 text-[10px] sm:text-xs font-medium leading-tight transition-colors border flex items-center justify-center text-center ${
              square.done
                ? inLine.has(i)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-secondary text-ink border-secondary'
                : 'bg-surface text-ink border-line hover:border-primary'
            }`}
          >
            {square.text}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-muted">
        Tap a square when you’ve done it. The middle one is free and stays ticked.
      </p>
    </div>
  );
}

export default RelationshipBingoGame;
