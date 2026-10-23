'use client';

import React, { useState } from 'react';
import { Check, RotateCcw, Send } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  STORY_OPENERS,
  addSentence,
  createStory,
  otherStoryPlayer,
  storyText,
  storyWordCount,
  validateSentence,
  type StoryState,
} from '@/lib/features/games/collab';

export function StoryTennisGame() {
  const { activeProfile, partnerProfile, showToast } = useDiary();
  const game = useGameSession<StoryState & Record<string, unknown>>('storytennis');
  const { state, myId, partnerId, isMyTurn, turnUserId, loading, notice, isRemote } = game;

  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async (opener?: string) => {
    if (!myId || !partnerId) return;
    const fresh = createStory([myId, partnerId], title || opener || '');
    await game.start(fresh as StoryState & Record<string, unknown>, myId);
    setTitle('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state || !myId) return;
    const problem = validateSentence(draft);
    if (problem) {
      setError(problem);
      return;
    }
    const next = addSentence(state, draft, myId);
    if (!next) return;
    setError('');
    const ok = await game.move(
      next as StoryState & Record<string, unknown>,
      otherStoryPlayer(next, myId)
    );
    if (ok) setDraft('');
  };

  const finish = async () => {
    if (!state) return;
    await game.move({ ...state, finished: true } as StoryState & Record<string, unknown>, null, 'finished');
  };

  const copy = async () => {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(storyText(state));
      showToast('Story copied', 'success');
    } catch {
      showToast('Your browser wouldn’t let us copy that.', 'warn');
    }
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-line bg-surface p-5 space-y-4 shadow-sm">
        <p className="text-sm text-ink-muted">
          One sentence each, no planning, no editing theirs. It goes somewhere stupid within four lines —
          that’s the game.
        </p>
        <div>
          <label htmlFor="st-title" className="block text-xs font-semibold text-ink mb-1">
            Give it a title <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="st-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The wrong train"
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <button
          type="button"
          onClick={() => begin()}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start a story
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}

        <div className="pt-3 border-t border-line">
          <p className="text-xs font-semibold text-ink mb-2">Or start from one of these:</p>
          <ul className="space-y-1.5">
            {STORY_OPENERS.map((opener) => (
              <li key={opener}>
                <button
                  type="button"
                  onClick={() => begin(opener)}
                  disabled={!partnerId}
                  className="text-left text-xs text-ink-muted hover:text-ink disabled:opacity-60"
                >
                  “{opener}”
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {state.finished
              ? 'Finished'
              : isMyTurn
                ? 'Your sentence'
                : `Waiting for ${nameFor(turnUserId)}`}
          </p>
          {state.title && <p className="text-xs text-ink-muted">{state.title}</p>}
        </div>
        <button
          type="button"
          onClick={() => game.end()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New story
        </button>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <div className="rounded-[1.25rem] bg-canvas border border-line p-5 min-h-[9rem]">
        {state.sentences.length === 0 ? (
          <p className="text-sm text-ink-muted">Blank page. Someone has to go first.</p>
        ) : (
          <p className="text-sm text-ink leading-relaxed">
            {state.sentences.map((s, i) => (
              <span
                key={i}
                className={s.playerId === myId ? 'text-ink' : 'text-ink-muted'}
                title={`${nameFor(s.playerId)} wrote this`}
              >
                {s.text}{' '}
              </span>
            ))}
          </p>
        )}
      </div>

      {!state.finished && (
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="st-line" className="sr-only">
            Your sentence
          </label>
          <textarea
            id="st-line"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
            disabled={!isMyTurn}
            rows={2}
            placeholder="One sentence…"
            className="flex-1 resize-none px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!isMyTurn || !draft.trim()}
            aria-label="Add sentence"
            className="p-3 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
        <span>
          {state.sentences.length} sentence{state.sentences.length === 1 ? '' : 's'} ·{' '}
          {storyWordCount(state)} words
        </span>
        {!state.finished && state.sentences.length > 1 && (
          <button
            type="button"
            onClick={finish}
            className="inline-flex items-center gap-1.5 font-semibold text-ink-muted hover:text-ink"
          >
            <Check className="w-3.5 h-3.5" /> Call it finished
          </button>
        )}
        {state.sentences.length > 0 && (
          <button type="button" onClick={copy} className="font-semibold text-ink-muted hover:text-ink">
            Copy the story
          </button>
        )}
        {!isRemote && <span className="italic">Demo mode — both sides on this device.</span>}
      </div>
    </div>
  );
}

export default StoryTennisGame;
