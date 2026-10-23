'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  MAX_WRONG_GUESSES,
  createHangman,
  guessLetter,
  maskedPhrase,
  remainingGuesses,
  validatePhrase,
  wrongLetters,
  type HangmanState,
} from '@/lib/features/games/hangman';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function HangmanGame() {
  const { partnerProfile } = useDiary();
  const game = useGameSession<HangmanState & Record<string, unknown>>('hangman');
  const { state, myId, partnerId, loading, notice, isRemote } = game;

  const [phrase, setPhrase] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [peek, setPeek] = useState(false);

  const setWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validatePhrase(phrase);
    if (problem) {
      setError(problem);
      return;
    }
    if (!myId || !partnerId) return;
    setError('');
    const fresh = createHangman(phrase, hint, myId, partnerId);
    // The guesser holds the turn: the setter only watches.
    await game.start(fresh as HangmanState & Record<string, unknown>, partnerId);
    setPhrase('');
    setHint('');
  };

  const guess = async (letter: string) => {
    if (!state || state.guesserId !== myId) return;
    const next = guessLetter(state, letter);
    if (!next) return;
    const over = next.outcome !== 'playing';
    await game.move(
      next as HangmanState & Record<string, unknown>,
      over ? null : state.guesserId,
      over ? 'finished' : 'active'
    );
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <form onSubmit={setWord} className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          Pick something {partnerProfile.name} would know — an in-joke, a place, the name of the restaurant.
          Letters and spaces only.
        </p>
        <div>
          <label htmlFor="hm-phrase" className="block text-xs font-semibold text-ink mb-1">
            Your word or phrase
          </label>
          <input
            id="hm-phrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="our first date"
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            required
          />
        </div>
        <div>
          <label htmlFor="hm-hint" className="block text-xs font-semibold text-ink mb-1">
            Hint <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="hm-hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="where it all began"
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <button
          type="submit"
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Set it for {partnerProfile.name}
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

  const iAmGuesser = state.guesserId === myId;
  const misses = wrongLetters(state);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {state.outcome === 'won'
            ? 'Got it 🎉'
            : state.outcome === 'lost'
              ? `Out of guesses — it was “${state.phrase}”`
              : iAmGuesser
                ? `${remainingGuesses(state)} guesses left`
                : `${partnerProfile.name} is guessing`}
        </p>
        <button
          type="button"
          onClick={() => game.end()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New word
        </button>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <div className="rounded-[1.25rem] bg-canvas border border-line p-6 text-center space-y-3">
        <p className="font-mono text-xl sm:text-2xl tracking-[0.3em] text-ink break-words">
          {maskedPhrase(state)}
        </p>
        {state.hint && <p className="text-xs text-ink-muted">Hint: {state.hint}</p>}
        <div className="flex items-center justify-center gap-1" aria-label="Guesses remaining">
          {Array.from({ length: MAX_WRONG_GUESSES }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < state.wrong ? 'bg-danger' : 'bg-line'}`}
            />
          ))}
        </div>
        {misses.length > 0 && (
          <p className="text-xs text-ink-muted">
            Missed: <span className="font-mono">{misses.join(' ')}</span>
          </p>
        )}
      </div>

      {iAmGuesser && state.outcome === 'playing' ? (
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5">
          {ALPHABET.map((letter) => {
            const used = state.guessed.includes(letter);
            return (
              <button
                key={letter}
                type="button"
                onClick={() => guess(letter)}
                disabled={used}
                className={`aspect-square rounded-xl text-sm font-semibold transition-colors ${
                  used
                    ? state.phrase.includes(letter)
                      ? 'bg-primary text-on-primary'
                      : 'bg-line text-ink-muted'
                    : 'bg-surface border border-line text-ink hover:border-primary'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ) : state.outcome === 'playing' ? (
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-2">
          <p className="text-xs text-ink-muted">
            You set this one, so you’re watching. Try not to give it away.
          </p>
          <button
            type="button"
            onClick={() => setPeek((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            {peek ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {peek ? 'Hide the word' : 'Remind me what I set'}
          </button>
          {peek && <p className="font-mono text-sm text-ink">{state.phrase}</p>}
        </div>
      ) : null}

      {!isRemote && <p className="text-xs text-ink-muted italic">Demo mode — both sides on this device.</p>}
    </div>
  );
}

export default HangmanGame;
