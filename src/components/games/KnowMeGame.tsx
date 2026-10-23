'use client';

import React, { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  KNOW_ME_PROMPTS,
  createKnowMeRound,
  isKnowMeGuessed,
  isKnowMeWritten,
  knowMeScore,
  type KnowMeRound,
} from '@/lib/features/games/memoryGames';

const ROUND_SIZE = 5;

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

export function KnowMeGame() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<KnowMeRound & Record<string, unknown>>('knowme');
  const { state, myId, partnerId, loading, notice, isRemote } = game;

  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const begin = async () => {
    if (!myId || !partnerId) return;
    // Prompts are chosen here rather than in the pure module so the pick is
    // client-side only — Math.random must not run during the prerender.
    const shuffled = [...KNOW_ME_PROMPTS].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    const fresh = createKnowMeRound(myId, shuffled);
    // The author writes first, so they hold the turn.
    await game.start(fresh as KnowMeRound & Record<string, unknown>, myId);
    setDrafts({});
  };

  const saveAnswers = async () => {
    if (!state || !partnerId) return;
    const answers = state.answers.map((a, i) => ({ ...a, truth: (drafts[i] ?? a.truth).trim() }));
    if (!answers.every((a) => a.truth !== '')) return;
    await game.move(
      { ...state, answers, phase: 'guessing' } as KnowMeRound & Record<string, unknown>,
      partnerId
    );
    setDrafts({});
  };

  const saveGuesses = async () => {
    if (!state) return;
    const answers = state.answers.map((a, i) => ({ ...a, guess: (drafts[i] ?? a.guess ?? '').trim() }));
    if (!answers.every((a) => (a.guess ?? '') !== '')) return;
    // Back to the author: only they can judge whether a guess is right.
    await game.move(
      { ...state, answers, phase: 'scoring' } as KnowMeRound & Record<string, unknown>,
      state.aboutId
    );
    setDrafts({});
  };

  const mark = async (index: number, correct: boolean) => {
    if (!state) return;
    const answers = state.answers.map((a, i) => (i === index ? { ...a, correct } : a));
    const allMarked = answers.every((a) => a.correct !== undefined);
    await game.move(
      { ...state, answers, phase: allMarked ? 'done' : 'scoring' } as KnowMeRound &
        Record<string, unknown>,
      state.aboutId,
      allMarked ? 'finished' : 'active'
    );
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-8 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          You answer five questions about yourself. {partnerProfile.name} guesses each one without seeing
          your answers. Only you can mark a guess right — you’re the one who knows.
        </p>
        <button
          type="button"
          onClick={begin}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start a round about me
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}
      </div>
    );
  }

  const iAmAuthor = state.aboutId === myId;
  const authorName = iAmAuthor ? activeProfile.name : partnerProfile.name;
  const { correct, total } = knowMeScore(state);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold text-ink" aria-live="polite">
        {state.phase === 'writing' && (iAmAuthor ? 'Write your answers' : `${authorName} is writing`)}
        {state.phase === 'guessing' && (iAmAuthor ? `${partnerProfile.name} is guessing` : `Guess ${authorName}’s answers`)}
        {state.phase === 'scoring' && (iAmAuthor ? 'Mark their guesses' : `${authorName} is marking`)}
        {state.phase === 'done' && `${correct} of ${total} right`}
      </p>
      <button
        type="button"
        onClick={() => game.end()}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
      >
        <RotateCcw className="w-3.5 h-3.5" /> New round
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {header}
      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <ol className="space-y-3">
        {state.answers.map((answer, index) => (
          <li key={answer.prompt} className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <p className="text-sm font-semibold text-ink">{answer.prompt}</p>

            {state.phase === 'writing' &&
              (iAmAuthor ? (
                <input
                  value={drafts[index] ?? answer.truth}
                  onChange={(e) => setDrafts((d) => ({ ...d, [index]: e.target.value }))}
                  placeholder="Honestly…"
                  aria-label={answer.prompt}
                  className={inputClass}
                />
              ) : (
                <p className="text-xs text-ink-muted">Waiting for {authorName}.</p>
              ))}

            {state.phase === 'guessing' &&
              (iAmAuthor ? (
                <p className="text-xs text-ink-muted">Your answer is hidden while they guess.</p>
              ) : (
                <input
                  value={drafts[index] ?? answer.guess ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [index]: e.target.value }))}
                  placeholder="Your guess…"
                  aria-label={`Your guess for: ${answer.prompt}`}
                  className={inputClass}
                />
              ))}

            {(state.phase === 'scoring' || state.phase === 'done') && (
              <div className="space-y-1.5">
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold text-ink">{authorName}:</span> {answer.truth}
                </p>
                <p className="text-xs text-ink-muted">
                  <span className="font-semibold text-ink">Guess:</span> {answer.guess || '—'}
                </p>
                {state.phase === 'scoring' && iAmAuthor && answer.correct === undefined && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => mark(index, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-on-primary"
                    >
                      <Check className="w-3.5 h-3.5" /> Close enough
                    </button>
                    <button
                      type="button"
                      onClick={() => mark(index, false)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-line text-ink"
                    >
                      <X className="w-3.5 h-3.5" /> Nope
                    </button>
                  </div>
                )}
                {answer.correct !== undefined && (
                  <p className={`text-xs font-semibold ${answer.correct ? 'text-primary' : 'text-danger'}`}>
                    {answer.correct ? 'Marked right' : 'Marked wrong'}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>

      {state.phase === 'writing' && iAmAuthor && (
        <button
          type="button"
          onClick={saveAnswers}
          disabled={!state.answers.every((a, i) => (drafts[i] ?? a.truth).trim() !== '')}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Lock my answers in
        </button>
      )}

      {state.phase === 'guessing' && !iAmAuthor && (
        <button
          type="button"
          onClick={saveGuesses}
          disabled={!state.answers.every((a, i) => (drafts[i] ?? a.guess ?? '').trim() !== '')}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Submit my guesses
        </button>
      )}

      {state.phase === 'done' && (
        <p className="text-sm font-semibold text-ink">
          {correct === total
            ? 'Every single one. Frankly, showing off.'
            : correct === 0
              ? 'Not one. There is work to do.'
              : `${correct} of ${total}. Not bad.`}
        </p>
      )}

      {!isRemote && (
        <p className="text-xs text-ink-muted italic">
          Demo mode — switch profiles in the navbar to play the other side.
        </p>
      )}
      {isKnowMeWritten(state) && !isKnowMeGuessed(state) && state.phase === 'guessing' && iAmAuthor && (
        <p className="text-xs text-ink-muted">Nudge them — they haven’t finished guessing.</p>
      )}
    </div>
  );
}

export default KnowMeGame;
