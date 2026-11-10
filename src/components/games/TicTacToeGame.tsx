'use client';

import React, { useState } from 'react';
import { RotateCcw, Trophy, Gift } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useGameSession } from '@/hooks/useGameSession';
import { useLiveRoomContext } from '@/components/providers/LiveRoomProvider';
import { PresenceTag } from '@/components/live/PresenceTag';
import { COUPLE_STAKES } from '@/lib/features/games';
import {
  canChangeStake,
  createHeartsKisses,
  isRoundOver,
  markFor,
  nextRound,
  placeMark,
  resetScore,
  setStake,
  type HeartsKissesState,
} from '@/lib/features/games/heartsKisses';

type HKState = HeartsKissesState & Record<string, unknown>;

/**
 * Hearts & Kisses — tic-tac-toe between the two of you, on two phones.
 *
 * The board is a shared game session: each person places only their own mark,
 * only on their own turn, and every move appears on the other phone as it is
 * made. It used to live in localStorage, which made it a one-phone game where
 * either person could tap both hearts and kisses and nothing reached the other.
 */
export function TicTacToeGame() {
  const { activeProfile, partnerProfile } = useDiary();
  const game = useGameSession<HKState>('tictactoe');
  const room = useLiveRoomContext();
  const { state, myId, partnerId, isMyTurn, loading, notice, isRemote } = game;

  const [customStake, setCustomStake] = useState('');
  const [showStakePicker, setShowStakePicker] = useState(false);

  const nameFor = (id: string | null) =>
    id === myId ? activeProfile.name : id === partnerId ? partnerProfile.name : 'Someone';

  const begin = async () => {
    if (!myId || !partnerId) return;
    // Whoever presses start opens the first round and plays hearts.
    const initial = createHeartsKisses([myId, partnerId], myId, COUPLE_STAKES[0]) as HKState;
    await game.start(initial, myId);
  };

  const save = (next: HeartsKissesState) => game.move(next as HKState, next.turn, 'active');

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading the board…</p>;
  }

  if (!state) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line bg-surface p-8 text-center space-y-3">
        <p className="text-4xl" aria-hidden="true">
          💖 💋
        </p>
        <p className="text-sm text-ink-muted">
          Three in a row wins, loser pays the stake.{' '}
          {isRemote ? 'Each of you plays from your own phone.' : ''}
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

  const roundOver = isRoundOver(state);
  // Mid-round the stake is locked; before the first move only the opener may
  // change it, because the server only accepts a write from whoever's turn it is.
  const stakeEditable = canChangeStake(state) && isMyTurn;
  const [hearts, kisses] = state.players;

  const handleCellClick = async (index: number) => {
    if (!myId) return;
    const next = placeMark(state, index, myId);
    if (next) await save(next);
  };

  const applyStake = async (value: string) => {
    const next = setStake(state, value);
    if (!next) return;
    if (await save(next)) {
      setCustomStake('');
      setShowStakePicker(false);
    }
  };

  const playerCard = (id: string) => {
    const isTurn = state.turn === id && !roundOver;
    const isMe = id === myId;
    return (
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          // Always bg-surface: a tinted bg-primary/5 card is not a "light card"
          // to the night themes, so it went dark while its neighbours stayed light.
          isTurn ? 'border-primary bg-surface shadow-xs ring-2 ring-primary/30' : 'border-line bg-surface'
        }`}
      >
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-lg" aria-hidden="true">
            {markFor(state, id)}
          </span>
          <p className="text-xs font-bold text-ink truncate max-w-[100px]">{nameFor(id)}</p>
        </div>
        <div className="h-4 mt-1 flex items-center justify-center">
          <PresenceTag available={room.available} here={room.partnerHere} isMe={isMe} />
        </div>
        <p className="text-2xl font-display font-extrabold text-primary mt-1">{state.score[id] ?? 0}</p>
        <span className="text-[10px] text-ink-muted">Wins</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stake */}
      <div className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Playing for</p>
            <p className="text-sm font-semibold text-ink mt-0.5">{state.stake}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowStakePicker((v) => !v)}
          disabled={!stakeEditable}
          title={stakeEditable ? undefined : 'The stake is locked once a round has started'}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-line bg-surface hover:bg-canvas text-ink transition-colors shadow-2xs shrink-0 disabled:opacity-50"
        >
          {showStakePicker ? 'Close' : 'Change stake'}
        </button>
      </div>

      {showStakePicker && stakeEditable && (
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-card space-y-3">
          <p className="text-xs font-bold text-ink uppercase tracking-wider">Pick or write a stake</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COUPLE_STAKES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyStake(s)}
                className={`text-left text-xs p-2.5 rounded-xl border transition-all ${
                  state.stake === s
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-line hover:border-primary/50 text-ink bg-surface'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-line">
            <input
              type="text"
              maxLength={200}
              placeholder="Or write your own (e.g. Winner gets breakfast in bed)…"
              value={customStake}
              onChange={(e) => setCustomStake(e.target.value)}
              className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-xl border border-line bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <button
              type="button"
              disabled={!customStake.trim()}
              onClick={() => applyStake(customStake)}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {playerCard(hearts)}
        <div className="p-3.5 rounded-2xl border border-line bg-surface flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-ink-muted mb-1">Round {state.round}</p>
          <p className="text-2xl font-display font-bold text-ink-muted">{state.score.draws}</p>
          <span className="text-[10px] text-ink-muted">Draws</span>
        </div>
        {playerCard(kisses)}
      </div>

      {/* Status */}
      <div className="text-center py-1" aria-live="polite">
        {state.winner ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-sm font-bold shadow-xs">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>
              {state.winner === myId ? 'You win! 🎉' : `${nameFor(state.winner)} wins! 🎉`} ({state.stake})
            </span>
          </div>
        ) : state.draw ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-line text-ink text-sm font-semibold">
            🤝 A draw — rematch?
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
            <span>
              {isMyTurn ? (
                <>
                  <strong className="text-ink">Your turn</strong> — place a {markFor(state, myId)}
                </>
              ) : (
                <>
                  Waiting for <strong className="text-ink">{nameFor(state.turn)}</strong> ({markFor(state, state.turn)})
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {notice && (
        <p role="status" className="text-xs text-ink-muted rounded-2xl bg-surface border border-line p-3 text-center">
          {notice}
        </p>
      )}

      {/* Board */}
      <div className="max-w-[320px] mx-auto">
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-3xl bg-surface border-2 border-line shadow-card">
          {state.board.map((cell, idx) => {
            const winning = state.winningLine?.includes(idx);
            const playable = !roundOver && isMyTurn && cell === null;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                disabled={!playable}
                aria-label={cell ? `Square ${idx + 1}: ${nameFor(cell)}` : `Square ${idx + 1}, empty`}
                className={`h-24 sm:h-28 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all select-none ${
                  winning
                    ? 'bg-amber-100 border-2 border-amber-400 ring-4 ring-amber-300/40 motion-safe:animate-pulse'
                    : cell !== null
                      ? 'bg-primary/5 border border-line'
                      : playable
                        ? 'bg-primary/5 hover:bg-primary/10 border border-transparent hover:border-primary/40 active:scale-95'
                        : 'bg-primary/5 border border-transparent'
                }`}
              >
                {cell && <span className="animate-in zoom-in-75 duration-150">{markFor(state, cell)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => save(nextRound(state))}
          disabled={!roundOver}
          className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold flex items-center gap-2 shadow-cta transition-transform active:scale-95 disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Next round</span>
        </button>

        <button
          type="button"
          onClick={() => save(resetScore(state))}
          disabled={!isMyTurn}
          className="px-4 py-2 rounded-full border border-line bg-surface hover:bg-canvas text-ink-muted hover:text-ink text-xs font-medium transition-colors disabled:opacity-50"
        >
          Reset score
        </button>
      </div>

      {!isRemote && (
        <p className="text-center text-xs italic text-ink-muted">
          Demo mode — switch profiles to play the other side on this device.
        </p>
      )}
    </div>
  );
}
