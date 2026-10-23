'use client';

import React, { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  SET_BLURBS,
  THIRTY_SIX_QUESTIONS,
  aronProgress,
  nextAronQuestion,
} from '@/lib/features/games/conversation';

export function ThirtySixQuestionsGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id || 'demo';
  // Shared across devices: this is a journey you make together, so one of
  // you marking a question done should move it on for both.
  const [answered, setAnswered] = useLocalState<string[]>(`games:aron:${coupleId}`, []);
  const [confirmReset, setConfirmReset] = useState(false);

  const current = nextAronQuestion(answered);
  const progress = aronProgress(answered);

  const markDone = () => {
    if (!current) return;
    setAnswered([...answered, current.id]);
  };

  const back = () => {
    setAnswered(answered.slice(0, -1));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {progress.done} of {progress.total} answered
          </p>
          <p className="text-xs text-ink-muted">
            Set {progress.set} — {SET_BLURBS[progress.set]}
          </p>
        </div>
        {answered.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={back}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
            >
              Back one
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start over
            </button>
          </div>
        )}
      </div>

      <div
        className="h-1.5 rounded-full bg-line overflow-hidden"
        role="progressbar"
        aria-valuenow={progress.done}
        aria-valuemin={0}
        aria-valuemax={progress.total}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(progress.done / progress.total) * 100}%` }}
        />
      </div>

      {confirmReset && (
        <div className="rounded-2xl border border-line bg-canvas p-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink">Clear all {answered.length} and begin again?</p>
          <button
            type="button"
            onClick={() => {
              setAnswered([]);
              setConfirmReset(false);
            }}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-danger text-canvas"
          >
            Start over
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Keep going
          </button>
        </div>
      )}

      {current ? (
        <div className="rounded-[1.25rem] border border-line bg-surface p-6 sm:p-8 shadow-card space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Question {progress.done + 1}
          </p>
          <p className="font-display text-xl sm:text-2xl font-semibold text-ink leading-snug">
            {current.text}
          </p>
          <p className="text-xs text-ink-muted">
            Both of you answer before moving on. Take as long as it takes — rushing defeats the point.
          </p>
          <button
            type="button"
            onClick={markDone}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
          >
            We’ve both answered <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="rounded-[1.25rem] border border-line bg-surface p-8 text-center space-y-3 shadow-card">
          <p className="font-display text-2xl font-semibold text-ink">All thirty-six.</p>
          <p className="text-sm text-ink-muted">
            Aron’s study finished with four minutes of silent eye contact. You may as well.
          </p>
        </div>
      )}

      <details className="rounded-2xl border border-line bg-canvas p-4">
        <summary className="text-sm font-semibold text-ink cursor-pointer">
          The ones you’ve been through ({answered.length})
        </summary>
        <ol className="mt-3 space-y-1.5">
          {THIRTY_SIX_QUESTIONS.filter((q) => answered.includes(q.id)).map((q) => (
            <li key={q.id} className="text-xs text-ink-muted">
              {q.text}
            </li>
          ))}
          {answered.length === 0 && <li className="text-xs text-ink-muted">Nothing yet.</li>}
        </ol>
      </details>
    </div>
  );
}

export default ThirtySixQuestionsGame;
