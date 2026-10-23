'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  buildTimelineRound,
  isTimelineSolved,
  scoreTimeline,
  type TimelineRound,
} from '@/lib/features/games/memoryGames';

export function TimelineRushGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id || 'demo';
  const [best, setBest] = useLocalState<number>(`games:timeline_best:${coupleId}`, 0);

  const [round, setRound] = useState<TimelineRound | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [tooFew, setTooFew] = useState(false);

  // Built on the client only — the shuffle uses Math.random, which must not
  // run during Next's prerender.
  const deal = useCallback(() => {
    const next = buildTimelineRound(data.memories, 5);
    setRound(next);
    setOrder(next ? next.items.map((i) => i.id) : []);
    setChecked(false);
    setTooFew(next === null);
  }, [data.memories]);

  useEffect(() => {
    deal();
  }, [deal]);

  // Arrow buttons rather than drag-and-drop: this has to work with a thumb
  // on a phone and with a keyboard, which HTML5 drag does neither of.
  const nudge = (index: number, direction: -1 | 1) => {
    if (checked) return;
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const check = () => {
    if (!round) return;
    setChecked(true);
    const score = scoreTimeline(order, round.solution);
    if (score > best) setBest(score);
  };

  if (tooFew) {
    return (
      <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-6">
        This needs at least three memories with real dates on them. Two would just be a coin flip.
      </p>
    );
  }

  if (!round) return <p className="text-sm text-ink-muted">Dealing…</p>;

  const score = checked ? scoreTimeline(order, round.solution) : 0;
  const solved = checked && isTimelineSolved(order, round.solution);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Oldest at the top. Best so far: <span className="font-semibold text-ink">{best}</span>/
          {round.items.length}
        </p>
        <button
          type="button"
          onClick={deal}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New round
        </button>
      </div>

      <ol className="space-y-2">
        {order.map((id, index) => {
          const item = round.items.find((i) => i.id === id)!;
          const rightPlace = checked && round.solution[index] === id;
          return (
            <li
              key={id}
              className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 shadow-sm ${
                checked ? (rightPlace ? 'border-primary' : 'border-danger/50') : 'border-line'
              }`}
            >
              <span className="w-6 text-center text-xs font-bold text-ink-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
                {checked && <p className="text-xs text-ink-muted">{item.date}</p>}
              </div>
              {!checked && (
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => nudge(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.title} earlier`}
                    className="p-1.5 rounded-full text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(index, 1)}
                    disabled={index === order.length - 1}
                    aria-label={`Move ${item.title} later`}
                    className="p-1.5 rounded-full text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {checked ? (
        <div className="rounded-2xl border border-line bg-canvas p-4 space-y-3" aria-live="polite">
          <p className="text-sm font-semibold text-ink">
            {solved
              ? 'Perfect order 🎉'
              : `${score} of ${round.items.length} in the right place`}
          </p>
          <button
            type="button"
            onClick={deal}
            className="px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
          >
            Play again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={check}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
        >
          Check my order
        </button>
      )}
    </div>
  );
}

export default TimelineRushGame;
