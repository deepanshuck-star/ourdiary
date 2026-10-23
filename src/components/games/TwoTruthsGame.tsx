'use client';

import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import { isTwoTruthsCorrect, validateTwoTruths, type TwoTruthsRound } from '@/lib/features/games/conversation';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus';

export function TwoTruthsGame() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<TwoTruthsRound & Record<string, unknown>>('twotruths');
  const { state, myId, partnerId, loading, notice, isRemote } = game;

  const [statements, setStatements] = useState(['', '', '']);
  const [lieIndex, setLieIndex] = useState(0);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateTwoTruths(statements, lieIndex);
    if (problem) {
      setError(problem);
      return;
    }
    if (!myId || !partnerId) return;
    setError('');
    await game.start(
      {
        authorId: myId,
        statements: statements.map((s) => s.trim()),
        lieIndex,
      } as TwoTruthsRound & Record<string, unknown>,
      partnerId
    );
    setStatements(['', '', '']);
    setLieIndex(0);
  };

  const guess = async (index: number) => {
    if (!state || state.guessIndex !== undefined) return;
    await game.move({ ...state, guessIndex: index } as TwoTruthsRound & Record<string, unknown>, null, 'finished');
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <form onSubmit={submit} className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          Three things about yourself — two true, one invented. The good ones are plausible, not outrageous.
        </p>
        {statements.map((value, i) => (
          <div key={i}>
            <label htmlFor={`tt-${i}`} className="block text-xs font-semibold text-ink mb-1">
              Statement {i + 1}
            </label>
            <input
              id={`tt-${i}`}
              value={value}
              onChange={(e) => {
                const next = [...statements];
                next[i] = e.target.value;
                setStatements(next);
              }}
              className={inputClass}
              required
            />
          </div>
        ))}

        <fieldset>
          <legend className="block text-xs font-semibold text-ink mb-1.5">Which one is the lie?</legend>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLieIndex(i)}
                aria-pressed={lieIndex === i}
                className={`px-4 py-2 rounded-full text-xs font-semibold ${
                  lieIndex === i ? 'bg-primary text-on-primary shadow-cta' : 'bg-canvas border border-line text-ink'
                }`}
              >
                Statement {i + 1}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Send to {partnerProfile.name}
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    );
  }

  const iAmAuthor = state.authorId === myId;
  const authorName = iAmAuthor ? activeProfile.name : partnerProfile.name;
  const result = isTwoTruthsCorrect(state);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {result === null
            ? iAmAuthor
              ? `${partnerProfile.name} is deciding`
              : `Which one is ${authorName} making up?`
            : result
              ? 'Caught it 🎉'
              : 'Fooled them'}
        </p>
        <button
          type="button"
          onClick={() => game.end()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New round
        </button>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <ol className="space-y-2">
        {state.statements.map((statement, i) => {
          const revealed = result !== null;
          const isLie = i === state.lieIndex;
          const wasPicked = state.guessIndex === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => guess(i)}
                disabled={iAmAuthor || revealed}
                className={`w-full text-left px-4 py-3 rounded-2xl border text-sm transition-colors ${
                  !revealed
                    ? 'border-line bg-surface text-ink hover:border-primary disabled:hover:border-line'
                    : isLie
                      ? 'border-danger bg-danger/10 text-danger font-semibold'
                      : 'border-line bg-surface text-ink'
                }`}
              >
                {statement}
                {revealed && isLie && <span className="block text-xs mt-1">The lie</span>}
                {revealed && wasPicked && !isLie && (
                  <span className="block text-xs mt-1 text-ink-muted">Their pick</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {!isRemote && (
        <p className="text-xs text-ink-muted italic">
          Demo mode — switch profiles in the navbar to guess as the other one.
        </p>
      )}
    </div>
  );
}

export default TwoTruthsGame;
