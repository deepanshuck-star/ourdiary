'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Clapperboard, Loader2, Play, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import { useNow } from '@/hooks/useNow';
import {
  countdownSeconds,
  createWatchParty,
  isReady,
  toggleReady,
  waitingOn,
  watchPhase,
  type WatchPartyState,
} from '@/lib/features/watchParty';

/**
 * The synced start. One of you says what you're watching and that you're
 * ready; the other confirms; both screens count down from the same instant.
 *
 * It rides on `game_sessions` rather than the shared JSON blob for the reason
 * migration 19 exists: two people pressing "ready" within the same second is
 * precisely the write both devices would otherwise clobber, and the one write
 * that matters here is the one that sets the clock.
 */
export function WatchTogetherSync() {
  const { partnerProfile } = useDiary();
  const reduceMotion = useReducedMotion() ?? false;
  const game = useGameSession<WatchPartyState>('watch-party');
  // Quarter-second ticks: a countdown that only updates once a second can
  // show "1" for almost two seconds depending on when the page rendered.
  const now = useNow(250);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const state = game.state;
  const phase = watchPhase(state, now ?? 0);
  const bothIds = [game.myId, game.partnerId];

  // `now` is the ticking clock from useNow, at most a quarter-second stale —
  // well inside the lead-in the countdown already allows for.
  const begin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game.myId || now === null) return;
    setBusy(true);
    await game.start(createWatchParty(title, game.myId, now ?? 0), null);
    setTitle('');
    setBusy(false);
  };

  const flipReady = async () => {
    if (!state || !game.myId || now === null) return;
    setBusy(true);
    await game.move(toggleReady(state, game.myId, bothIds, now ?? 0), null);
    setBusy(false);
  };

  const clear = async () => {
    setBusy(true);
    await game.end();
    setBusy(false);
  };

  const seconds = countdownSeconds(state, now ?? 0);
  const stillWaiting = waitingOn(state, bothIds);
  const waitingForPartner = stillWaiting.includes(game.partnerId || '');
  const iAmReady = isReady(state, game.myId);

  return (
    <section
      aria-labelledby="watch-sync-heading"
      className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card space-y-5"
    >
      <div>
        <h2 id="watch-sync-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-primary" aria-hidden="true" /> Press play together
        </h2>
        <p className="text-xs text-ink-muted mt-1">
          Both say you’re ready and you’ll get the same countdown on both screens. Nothing here can
          control the player itself — the start is the part that goes wrong, so that’s the part this fixes.
        </p>
      </div>

      {game.loading || now === null ? (
        <Loader2 className="w-5 h-5 text-primary animate-spin" aria-label="Loading" />
      ) : !state || phase === 'idle' || phase === 'over' ? (
        <form onSubmit={begin} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="watch-sync-title" className="block text-xs font-semibold text-ink-muted mb-1">
              What are you watching?
            </label>
            <input
              id="watch-sync-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="Movie night"
              className="w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !game.myId}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-40"
          >
            <Check className="w-4 h-4" aria-hidden="true" /> I’m ready
          </button>
        </form>
      ) : (
        <div className="rounded-[1.25rem] bg-hero border border-line p-5 sm:p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{state.title}</p>

          {phase === 'waiting' && (
            <>
              <p className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-3">
                {waitingForPartner
                  ? `Waiting for ${partnerProfile.name}`
                  : iAmReady
                    ? 'Waiting on the other screen'
                    : `${partnerProfile.name} is ready`}
              </p>
              <p className="text-sm text-ink-muted mt-1">
                {iAmReady
                  ? 'The countdown starts the moment they say they’re ready too.'
                  : 'Say you’re ready and the countdown starts on both screens at once.'}
              </p>
            </>
          )}

          {phase === 'counting' && (
            <motion.p
              key={seconds}
              initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-7xl sm:text-8xl font-semibold text-ink mt-3 tabular-nums"
              aria-live="assertive"
            >
              {seconds}
            </motion.p>
          )}

          {phase === 'playing' && (
            <motion.p
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display text-4xl sm:text-5xl font-semibold text-ink mt-3 flex items-center justify-center gap-3"
              aria-live="assertive"
            >
              <Play className="w-8 h-8 text-primary fill-primary" aria-hidden="true" /> Press play — now
            </motion.p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {phase !== 'playing' && (
              <button
                type="button"
                onClick={flipReady}
                disabled={busy || !game.myId}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold shadow-cta disabled:opacity-40 ${
                  iAmReady
                    ? 'bg-surface border border-line text-ink hover:bg-canvas'
                    : 'bg-primary hover:bg-primary-hover text-on-primary'
                }`}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                {iAmReady ? 'Actually, hold on' : 'I’m ready'}
              </button>
            )}
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-surface border border-line text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Start over
            </button>
          </div>
        </div>
      )}

      {!game.isRemote && (
        <p className="text-[11px] text-ink-muted">
          Demo mode runs on one device, so there’s no second screen to sync with. Switch viewpoints in
          the navbar to mark the other side ready.
        </p>
      )}
      {game.notice && (
        <p role="status" className="text-sm text-ink-muted font-medium">
          {game.notice}
        </p>
      )}
    </section>
  );
}
