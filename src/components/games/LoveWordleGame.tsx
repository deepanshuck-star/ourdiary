'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Lightbulb, Trophy, Delete } from 'lucide-react';
import { useLocalState } from '@/lib/local-store';
import { useDiary } from '@/store/DiaryContext';
import {
  evaluateWordleGuess,
  getWordOfTheDay,
  LOVE_WORDS,
  type WordleLetterState,
} from '@/lib/features/games';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

export function LoveWordleGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id;

  const [targetWord, setTargetWord] = useState(() => getWordOfTheDay());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hintUsed, setHintUsed] = useState(false);
  const [streak, setStreak] = useLocalState<number>(`games:wordle_streak:${coupleId || 'demo'}`, 0);

  const isComplete = gameStatus !== 'playing';

  const handleKeyPress = useCallback((key: string) => {
    if (isComplete) return;

    if (key === 'ENTER') {
      if (currentGuess.length !== 5) return;
      const nextGuesses = [...guesses, currentGuess];
      setGuesses(nextGuesses);
      setCurrentGuess('');

      if (currentGuess === targetWord) {
        setGameStatus('won');
        setStreak((s) => s + 1);
      } else if (nextGuesses.length >= 6) {
        setGameStatus('lost');
        setStreak(0);
      }
    } else if (key === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (/^[A-Za-z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess((prev) => prev + key.toUpperCase());
    }
  }, [currentGuess, guesses, isComplete, targetWord, setStreak]);

  // Physical keyboard listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') handleKeyPress('ENTER');
      else if (e.key === 'Backspace') handleKeyPress('BACKSPACE');
      else if (/^[a-zA-Z]$/.test(e.key)) handleKeyPress(e.key.toUpperCase());
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyPress]);

  const handleNewWord = () => {
    const random = LOVE_WORDS[Math.floor(Math.random() * LOVE_WORDS.length)];
    setTargetWord(random);
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setHintUsed(false);
  };

  // Compute status per letter for virtual keyboard coloring
  const letterStatuses: Record<string, WordleLetterState> = {};
  guesses.forEach((guess) => {
    const evalResult = evaluateWordleGuess(guess, targetWord);
    guess.split('').forEach((letter, i) => {
      const state = evalResult[i];
      const existing = letterStatuses[letter];
      if (existing === 'correct') return;
      if (existing === 'present' && state !== 'correct') return;
      letterStatuses[letter] = state;
    });
  });

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-line text-xs">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Love Streak: {streak} 🔥</span>
        </div>

        <div className="flex items-center gap-2">
          {!hintUsed && !isComplete && (
            <button
              type="button"
              onClick={() => {
                setHintUsed(true);
                setCurrentGuess(targetWord[0]);
              }}
              className="px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 font-semibold flex items-center gap-1 hover:bg-amber-100"
            >
              <Lightbulb className="w-3 h-3 text-amber-600" />
              <span>Hint</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNewWord}
            className="px-2.5 py-1 rounded-full border border-line bg-canvas hover:bg-surface text-ink font-semibold flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>New Word</span>
          </button>
        </div>
      </div>

      {/* Wordle Grid (6 rows x 5 tiles) */}
      <div className="flex flex-col gap-2 items-center select-none py-2">
        {Array.from({ length: 6 }).map((_, rowIndex) => {
          const guess = guesses[rowIndex];
          const isCurrentRow = rowIndex === guesses.length;
          const rowLetters = guess ? guess.split('') : isCurrentRow ? currentGuess.split('') : [];
          const rowEvaluation = guess ? evaluateWordleGuess(guess, targetWord) : null;

          return (
            <div key={rowIndex} className="flex gap-2">
              {Array.from({ length: 5 }).map((_, colIndex) => {
                const letter = rowLetters[colIndex] || '';
                const state = rowEvaluation ? rowEvaluation[colIndex] : null;

                let tileBg = 'bg-surface border-line text-ink';
                if (state === 'correct') {
                  tileBg = 'bg-emerald-600 border-emerald-600 text-white shadow-xs';
                } else if (state === 'present') {
                  tileBg = 'bg-amber-500 border-amber-500 text-white shadow-xs';
                } else if (state === 'absent') {
                  tileBg = 'bg-slate-400 dark:bg-slate-700 border-slate-400 dark:border-slate-700 text-white';
                } else if (letter) {
                  tileBg = 'bg-surface border-primary text-ink ring-2 ring-primary/20 scale-102';
                }

                return (
                  <div
                    key={colIndex}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex items-center justify-center font-display font-black text-xl sm:text-2xl transition-all duration-300 ${tileBg}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Result Announcement */}
      {isComplete && (
        <div
          className={`p-4 rounded-2xl border text-center animate-in zoom-in-95 duration-200 ${
            gameStatus === 'won'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {gameStatus === 'won' ? (
            <div>
              <p className="font-extrabold text-base flex items-center justify-center gap-1.5">
                <span>🎉 Brilliant! You guessed "{targetWord}"!</span>
              </p>
              <p className="text-xs text-emerald-800 mt-1">
                Completed in {guesses.length}/6 guesses!
              </p>
            </div>
          ) : (
            <div>
              <p className="font-extrabold text-base">So close! The secret word was "{targetWord}"</p>
              <p className="text-xs text-rose-800 mt-1">Don't worry, try another round!</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleNewWord}
            className="mt-3 px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold shadow-cta"
          >
            Play Next Word
          </button>
        </div>
      )}

      {/* Virtual Keyboard */}
      <div className="space-y-1.5 pt-2 select-none">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((k) => {
              const status = letterStatuses[k];
              const isWide = k === 'ENTER' || k === 'BACKSPACE';

              let keyClass = 'bg-surface hover:bg-canvas border-line text-ink';
              if (status === 'correct') {
                keyClass = 'bg-emerald-600 border-emerald-600 text-white';
              } else if (status === 'present') {
                keyClass = 'bg-amber-500 border-amber-500 text-white';
              } else if (status === 'absent') {
                keyClass = 'bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-500';
              }

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyPress(k)}
                  className={`h-10 sm:h-12 rounded-xl font-bold border transition-colors flex items-center justify-center active:scale-95 ${
                    isWide ? 'px-2.5 sm:px-3 text-[11px]' : 'w-8 sm:w-10 text-xs sm:text-sm'
                  } ${keyClass}`}
                >
                  {k === 'BACKSPACE' ? <Delete className="w-4 h-4" /> : k}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
