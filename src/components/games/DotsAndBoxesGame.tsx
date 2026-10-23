'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import {
  createDots,
  dotsWinner,
  drawLine,
  isComplete,
  isLineDrawn,
  scores,
  type DotsState,
  type LineKind,
} from '@/lib/features/games/dotsAndBoxes';

const SIZE = 4;

export function DotsAndBoxesGame() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<DotsState & Record<string, unknown>>('dots');
  const { state, myId, partnerId, isMyTurn, turnUserId, loading, notice, isRemote } = game;

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async () => {
    if (!myId || !partnerId) return;
    await game.start(createDots([myId, partnerId], SIZE) as DotsState & Record<string, unknown>, myId);
  };

  const play = async (kind: LineKind, row: number, col: number) => {
    if (!state || !myId || !isMyTurn) return;
    const result = drawLine(state, kind, row, col, myId);
    if (!result) return;
    const finished = isComplete(result.state);
    await game.move(
      result.state as DotsState & Record<string, unknown>,
      finished ? null : result.nextPlayer,
      finished ? 'finished' : 'active'
    );
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading the board…</p>;

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-8 text-center space-y-3">
        <p className="text-sm text-ink-muted">
          Draw a line each. Close a box and you go again — that’s where the game is won.
        </p>
        <button
          type="button"
          onClick={begin}
          disabled={!partnerId}
          className="px-5 py-2.5 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-60"
        >
          Start a game
        </button>
        {!partnerId && <p className="text-xs text-ink-muted">Your partner needs to join your space first.</p>}
      </div>
    );
  }

  const tally = scores(state);
  const winner = dotsWinner(state);

  // Dots sit on a grid of (SIZE+1) columns; lines occupy the gaps between.
  const cell = 'w-10 h-10 sm:w-12 sm:h-12';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {winner === 'draw'
            ? 'A dead heat'
            : winner
              ? `${nameFor(winner)} wins 🎉`
              : isMyTurn
                ? state.claimedLast
                  ? 'You closed a box — go again'
                  : 'Your turn'
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

      <div className="rounded-[1.25rem] bg-canvas border border-line p-4 overflow-x-auto">
        <div className="inline-block">
          {Array.from({ length: SIZE + 1 }).map((_, row) => (
            <React.Fragment key={`r${row}`}>
              {/* Dots with the horizontal lines between them */}
              <div className="flex items-center">
                {Array.from({ length: SIZE + 1 }).map((__, col) => (
                  <React.Fragment key={`d${row}-${col}`}>
                    <span className="w-2 h-2 rounded-full bg-ink/60 flex-shrink-0" aria-hidden="true" />
                    {col < SIZE && (
                      <button
                        type="button"
                        onClick={() => play('h', row, col)}
                        disabled={!isMyTurn || isLineDrawn(state, 'h', row, col) || Boolean(winner)}
                        aria-label={`Horizontal line, row ${row + 1}, gap ${col + 1}`}
                        className={`${cell} h-2 rounded-full transition-colors ${
                          isLineDrawn(state, 'h', row, col)
                            ? 'bg-primary'
                            : 'bg-transparent hover:bg-primary/30 disabled:hover:bg-transparent'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Vertical lines, with the boxes they enclose */}
              {row < SIZE && (
                <div className="flex items-center">
                  {Array.from({ length: SIZE + 1 }).map((__, col) => (
                    <React.Fragment key={`v${row}-${col}`}>
                      <button
                        type="button"
                        onClick={() => play('v', row, col)}
                        disabled={!isMyTurn || isLineDrawn(state, 'v', row, col) || Boolean(winner)}
                        aria-label={`Vertical line, gap ${row + 1}, column ${col + 1}`}
                        className={`${cell} w-2 rounded-full transition-colors ${
                          isLineDrawn(state, 'v', row, col)
                            ? 'bg-primary'
                            : 'bg-transparent hover:bg-primary/30 disabled:hover:bg-transparent'
                        }`}
                      />
                      {col < SIZE && (
                        <span
                          className={`${cell} flex items-center justify-center text-[10px] font-bold ${
                            state.boxes[row * SIZE + col] === myId
                              ? 'text-primary'
                              : state.boxes[row * SIZE + col]
                                ? 'text-ink-muted'
                                : 'text-transparent'
                          }`}
                        >
                          {state.boxes[row * SIZE + col]
                            ? nameFor(state.boxes[row * SIZE + col]).slice(0, 1).toUpperCase()
                            : '·'}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

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

export default DotsAndBoxesGame;
