'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  C4_COLS,
  C4_ROWS,
  createConnect4,
  dropDisc,
  indexOf,
  isColumnPlayable,
  landingRow,
  otherPlayer,
  type Connect4State,
} from '@/lib/features/games/connect4';

export function Connect4Game() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<Connect4State & Record<string, unknown>>('connect4');
  const { state, myId, partnerId, isMyTurn, turnUserId, loading, notice, isRemote } = game;

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async () => {
    if (!myId || !partnerId) return;
    // Whoever presses start goes first.
    await game.start(createConnect4([myId, partnerId]) as Connect4State & Record<string, unknown>, myId);
  };

  const play = async (col: number) => {
    if (!state || !myId || !isMyTurn) return;
    if (!isColumnPlayable(state, col)) return;
    const next = dropDisc(state, col, myId);
    if (!next) return;
    const over = Boolean(next.winner) || next.draw;
    await game.move(
      next as Connect4State & Record<string, unknown>,
      over ? null : otherPlayer(next, myId),
      over ? 'finished' : 'active'
    );
  };

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading the board…</p>;
  }

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-8 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          Four in a row wins. {isRemote ? 'Your moves appear on their phone as you make them.' : ''}
        </p>
        <button
          type="button"
          onClick={begin}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start a game
        </button>
        {!partnerId && (
          <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>
        )}
      </div>
    );
  }

  const over = Boolean(state.winner) || state.draw;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {state.winner
            ? `${nameFor(state.winner)} wins 🎉`
            : state.draw
              ? 'A draw — board’s full'
              : isMyTurn
                ? 'Your turn'
                : `Waiting for ${nameFor(turnUserId)}`}
        </p>
        <button
          type="button"
          onClick={begin}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> New game
        </button>
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-canvas border border-line p-3">
          {notice}
        </p>
      )}

      <div className="rounded-[1.25rem] bg-canvas border border-line p-2 sm:p-3 overflow-x-auto">
        <div
          className="grid gap-1 sm:gap-1.5 min-w-[18rem]"
          style={{ gridTemplateColumns: `repeat(${C4_COLS}, minmax(0, 1fr))` }}
          role="grid"
          aria-label="Connect 4 board"
        >
          {Array.from({ length: C4_ROWS }).map((_, row) =>
            Array.from({ length: C4_COLS }).map((__, col) => {
              const i = indexOf(row, col);
              const owner = state.board[i];
              const winning = state.winningLine?.includes(i);
              const playable = !over && isMyTurn && landingRow(state.board, col) !== -1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => play(col)}
                  disabled={!playable}
                  aria-label={
                    owner
                      ? `Row ${row + 1}, column ${col + 1}: ${nameFor(owner)}`
                      : `Drop into column ${col + 1}`
                  }
                  className={`aspect-square rounded-full border transition-colors ${
                    winning ? 'ring-2 ring-primary' : ''
                  } ${
                    owner === myId
                      ? 'bg-primary border-primary'
                      : owner
                        ? 'bg-secondary border-secondary'
                        : 'bg-surface border-line hover:border-primary disabled:hover:border-line'
                  }`}
                />
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary inline-block" /> {activeProfile.name}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-secondary inline-block" /> {partnerProfile.name}
        </span>
        {!isRemote && <span className="italic">Demo mode — both sides on this device.</span>}
      </div>
    </div>
  );
}

export default Connect4Game;
