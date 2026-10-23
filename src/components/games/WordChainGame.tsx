'use client';

import React, { useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  CHAIN_THEMES,
  addChainWord,
  chainScores,
  createWordChain,
  otherChainPlayer,
  requiredLetter,
  validateChainWord,
  type WordChainState,
} from '@/lib/features/games/wordChain';

export function WordChainGame() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<WordChainState & Record<string, unknown>>('wordchain');
  const { state, myId, partnerId, isMyTurn, turnUserId, loading, notice, isRemote } = game;

  const [draft, setDraft] = useState('');
  const [theme, setTheme] = useState(CHAIN_THEMES[0]);
  const [error, setError] = useState('');

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async () => {
    if (!myId || !partnerId) return;
    await game.start(
      createWordChain([myId, partnerId], theme) as WordChainState & Record<string, unknown>,
      myId
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !myId) return;
    const problem = validateChainWord(state, draft);
    if (problem) {
      setError(problem);
      return;
    }
    const next = addChainWord(state, draft, myId);
    if (!next) return;
    setError('');
    const ok = await game.move(
      next as WordChainState & Record<string, unknown>,
      otherChainPlayer(next, myId)
    );
    if (ok) setDraft('');
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          Each word starts with the last letter of the one before. No repeats. There’s no dictionary — if one
          of you objects, argue it out.
        </p>
        <div>
          <label htmlFor="wc-theme" className="block text-xs font-semibold text-ink mb-1">
            Theme
          </label>
          <select
            id="wc-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {CHAIN_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={begin}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start the chain
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}
      </div>
    );
  }

  const needed = requiredLetter(state);
  const tally = chainScores(state);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {isMyTurn ? 'Your turn' : `Waiting for ${nameFor(turnUserId)}`}
            {needed && <span className="text-ink-muted font-normal"> · must start with “{needed}”</span>}
          </p>
          {state.theme && <p className="text-xs text-ink-muted">{state.theme}</p>}
        </div>
        <button
          type="button"
          onClick={() => game.end()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New chain
        </button>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <div className="rounded-[1.25rem] bg-canvas border border-line p-4 min-h-[8rem]">
        {state.links.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing yet — start with any word.</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {state.links.map((link, i) => (
              <li
                key={`${link.word}-${i}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  link.playerId === myId
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface border border-line text-ink'
                }`}
              >
                {link.word}
              </li>
            ))}
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <label htmlFor="wc-word" className="sr-only">
          Your word
        </label>
        <input
          id="wc-word"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
          disabled={!isMyTurn}
          placeholder={needed ? `Starts with ${needed}…` : 'Any word to begin…'}
          className="flex-1 px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!isMyTurn || !draft.trim()}
          aria-label="Add word"
          className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-5 text-xs text-ink-muted">
        <span>
          <span className="font-semibold text-ink">{activeProfile.name}</span> {myId ? tally[myId] ?? 0 : 0}
        </span>
        <span>
          <span className="font-semibold text-ink">{partnerProfile.name}</span>{' '}
          {partnerId ? tally[partnerId] ?? 0 : 0}
        </span>
        {!isRemote && <span className="italic">Demo mode — both sides on this device.</span>}
      </div>
    </div>
  );
}

export default WordChainGame;
