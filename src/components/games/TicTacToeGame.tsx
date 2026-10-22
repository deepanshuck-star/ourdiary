'use client';

import React, { useState } from 'react';
import { RotateCcw, Trophy, Gift } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  checkTicTacToeWinner,
  COUPLE_STAKES,
  type TicTacToeCell,
} from '@/lib/features/games';

interface TicTacToeState {
  board: TicTacToeCell[];
  turn: 'user_1' | 'user_2';
  score: { user_1: number; user_2: number; draws: number };
  stake: string;
}

export function TicTacToeGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id;

  const [gameState, setGameState] = useLocalState<TicTacToeState>(
    `games:tictactoe:${coupleId || 'demo'}`,
    {
      board: Array(9).fill(null),
      turn: 'user_1',
      score: { user_1: 0, user_2: 0, draws: 0 },
      stake: COUPLE_STAKES[0],
    }
  );

  const [customStake, setCustomStake] = useState('');
  const [showStakePicker, setShowStakePicker] = useState(false);

  const { board, turn, score, stake } = gameState;
  const { winner, line } = checkTicTacToeWinner(board);

  const user1Name = data.couple.user1.name;
  const user2Name = data.couple.user2.name;

  const handleCellClick = (index: number) => {
    if (board[index] !== null || winner !== null) return;

    const newBoard = [...board];
    newBoard[index] = turn;
    const nextTurn = turn === 'user_1' ? 'user_2' : 'user_1';

    const check = checkTicTacToeWinner(newBoard);
    const newScore = { ...score };
    if (check.winner === 'user_1') newScore.user_1 += 1;
    else if (check.winner === 'user_2') newScore.user_2 += 1;
    else if (check.winner === 'draw') newScore.draws += 1;

    setGameState((prev) => ({
      ...prev,
      board: newBoard,
      turn: nextTurn,
      score: newScore,
    }));
  };

  const handleResetBoard = () => {
    setGameState((prev) => ({
      ...prev,
      board: Array(9).fill(null),
      turn: prev.turn === 'user_1' ? 'user_2' : 'user_1', // rotate first turn
    }));
  };

  const handleResetScore = () => {
    setGameState((prev) => ({
      ...prev,
      board: Array(9).fill(null),
      score: { user_1: 0, user_2: 0, draws: 0 },
    }));
  };

  const currentTurnName = turn === 'user_1' ? user1Name : user2Name;
  const currentTurnIcon = turn === 'user_1' ? '💖' : '💋';

  return (
    <div className="space-y-6">
      {/* Game Stakes Header */}
      <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 dark:from-rose-950/30 dark:via-pink-950/20 dark:to-purple-950/30 border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Playing For High Stakes</p>
            <p className="text-sm font-semibold text-ink truncate mt-0.5">{stake}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowStakePicker((v) => !v)}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-line bg-surface hover:bg-canvas text-ink transition-colors shadow-2xs shrink-0"
        >
          {showStakePicker ? 'Close Stakes' : 'Change Stake'}
        </button>
      </div>

      {/* Stake Picker Dropdown */}
      {showStakePicker && (
        <div className="bg-surface border border-line rounded-2xl p-4 shadow-card space-y-3 animate-in fade-in zoom-in-95">
          <p className="text-xs font-bold text-ink uppercase tracking-wider">Select or write a romantic stake:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {COUPLE_STAKES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setGameState((prev) => ({ ...prev, stake: s }));
                  setShowStakePicker(false);
                }}
                className={`text-left text-xs p-2.5 rounded-xl border transition-all ${
                  stake === s
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-line hover:border-primary/50 text-ink bg-canvas/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t border-line">
            <input
              type="text"
              placeholder="Or write custom reward (e.g. Winner gets breakfast in bed)..."
              value={customStake}
              onChange={(e) => setCustomStake(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <button
              type="button"
              disabled={!customStake.trim()}
              onClick={() => {
                if (customStake.trim()) {
                  setGameState((prev) => ({ ...prev, stake: customStake.trim() }));
                  setCustomStake('');
                  setShowStakePicker(false);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className={`p-3.5 rounded-2xl border transition-all ${
          turn === 'user_1' && !winner
            ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
            : 'border-line bg-surface'
        }`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-lg">💖</span>
            <p className="text-xs font-bold text-ink truncate max-w-[100px]">{user1Name}</p>
          </div>
          <p className="text-2xl font-display font-extrabold text-primary">{score.user_1}</p>
          <span className="text-[10px] text-ink-muted">Wins</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-line bg-surface/60 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-ink-muted mb-1">Ties</p>
          <p className="text-2xl font-display font-bold text-ink-muted">{score.draws}</p>
          <span className="text-[10px] text-ink-muted">Draws</span>
        </div>

        <div className={`p-3.5 rounded-2xl border transition-all ${
          turn === 'user_2' && !winner
            ? 'border-rose-400 bg-rose-50/50 shadow-xs ring-2 ring-rose-400/20'
            : 'border-line bg-surface'
        }`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-lg">💋</span>
            <p className="text-xs font-bold text-ink truncate max-w-[100px]">{user2Name}</p>
          </div>
          <p className="text-2xl font-display font-extrabold text-rose-500">{score.user_2}</p>
          <span className="text-[10px] text-ink-muted">Wins</span>
        </div>
      </div>

      {/* Status Banner */}
      <div className="text-center py-2">
        {winner ? (
          winner === 'draw' ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
              <span>🤝 It’s a tie! Rematch time!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-sm font-bold shadow-xs animate-bounce">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span>
                {winner === 'user_1' ? user1Name : user2Name} WINS! 🎉 ({stake})
              </span>
            </div>
          )
        ) : (
          <div className="inline-flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Turn: <strong className="text-ink">{currentTurnName}</strong> ({currentTurnIcon})
            </span>
          </div>
        )}
      </div>

      {/* 3x3 Game Board */}
      <div className="max-w-[320px] mx-auto">
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-3xl bg-surface border-2 border-line shadow-card">
          {board.map((cell, idx) => {
            const isWinningCell = line?.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                disabled={cell !== null || winner !== null}
                className={`h-24 sm:h-28 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl transition-all select-none ${
                  isWinningCell
                    ? 'bg-amber-100 border-2 border-amber-400 ring-4 ring-amber-300/40 animate-pulse'
                    : cell !== null
                    ? 'bg-canvas/80 border border-line'
                    : 'bg-canvas/40 hover:bg-canvas border border-transparent hover:border-primary/40 active:scale-95'
                }`}
              >
                {cell === 'user_1' && <span className="transform animate-in zoom-in-75 duration-150">💖</span>}
                {cell === 'user_2' && <span className="transform animate-in zoom-in-75 duration-150">💋</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleResetBoard}
          className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold flex items-center gap-2 shadow-cta transition-transform active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Round</span>
        </button>

        <button
          type="button"
          onClick={handleResetScore}
          className="px-4 py-2 rounded-full border border-line bg-surface hover:bg-canvas text-ink-muted hover:text-ink text-xs font-medium transition-colors"
        >
          Reset Score
        </button>
      </div>
    </div>
  );
}
