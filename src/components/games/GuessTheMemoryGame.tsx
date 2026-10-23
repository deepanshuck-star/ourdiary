'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  availableGuessFields,
  buildGuessRound,
  type GuessField,
  type GuessRound,
} from '@/lib/features/games/memoryGames';

const FIELD_LABEL: Record<GuessField, string> = {
  year: 'Which year was this?',
  location: 'Where was this?',
  title: 'Which memory is this?',
};

export function GuessTheMemoryGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id || 'demo';
  const [best, setBest] = useLocalState<number>(`games:guessmemory_best:${coupleId}`, 0);

  const [round, setRound] = useState<GuessRound | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [fields, setFields] = useState<GuessField[]>([]);

  // Rounds are built on the client only: buildGuessRound uses Math.random,
  // which must not run while Next prerenders this page.
  const deal = useCallback(() => {
    const usable = availableGuessFields(data.memories);
    setFields(usable);
    if (usable.length === 0) {
      setRound(null);
      return;
    }
    const field = usable[Math.floor(Math.random() * usable.length)];
    setRound(buildGuessRound(data.memories, field));
    setPicked(null);
  }, [data.memories]);

  useEffect(() => {
    deal();
  }, [deal]);

  const answer = (option: string) => {
    if (!round || picked) return;
    setPicked(option);
    if (option === round.answer) {
      const next = streak + 1;
      setStreak(next);
      if (next > best) setBest(next);
    } else {
      setStreak(0);
    }
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-ink-muted rounded-[1.25rem] border border-dashed border-line p-6">
        Not enough to ask about yet. Add a few memories with photos, and give them dates or places — the
        questions are built from your own diary, so it needs something to work with.
      </p>
    );
  }

  if (!round) return <p className="text-sm text-ink-muted">Dealing…</p>;

  const memory = data.memories.find((m) => m.id === round.memoryId);

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

      <div className="rounded-[1.25rem] overflow-hidden border border-line bg-surface shadow-card">
        <div className="relative w-full aspect-[4/3] bg-canvas">
          <img
            src={round.photoUrl}
            alt="A photo from one of your memories, details hidden"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-5 space-y-4">
          <p className="font-semibold text-ink">{FIELD_LABEL[round.field]}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {round.options.map((option) => {
              const isAnswer = option === round.answer;
              const chosen = option === picked;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => answer(option)}
                  disabled={Boolean(picked)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium text-left border transition-colors ${
                    !picked
                      ? 'border-line bg-canvas text-ink hover:border-primary'
                      : isAnswer
                        ? 'border-primary bg-primary text-on-primary'
                        : chosen
                          ? 'border-danger bg-danger/10 text-danger'
                          : 'border-line bg-canvas text-ink-muted'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {picked && (
            <div className="pt-2 border-t border-line space-y-2" aria-live="polite">
              <p className="text-sm font-semibold text-ink">
                {picked === round.answer ? 'Right 💛' : `Not quite — it was ${round.answer}`}
              </p>
              {memory && (
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{memory.title}</span>
                  {memory.location ? ` · ${memory.location}` : ''} · {memory.date}
                </p>
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
    </div>
  );
}

export default GuessTheMemoryGame;
