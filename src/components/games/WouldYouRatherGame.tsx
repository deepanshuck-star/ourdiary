'use client';

import React, { useState } from 'react';
import { Sparkles, Heart, Check, X, RefreshCw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  WOULD_YOU_RATHER_ITEMS,
  NEVER_HAVE_I_EVER_ITEMS,
  type WouldYouRatherItem,
  type NeverHaveIEverItem,
} from '@/lib/features/games';

export function WouldYouRatherGame() {
  const { data, activeProfile, partnerProfile, switchProfile } = useDiary();
  const coupleId = data.couple.id;

  const [mode, setMode] = useState<'wyr' | 'nhie'>('wyr');
  const [wyrIndex, setWyrIndex] = useState(0);
  const [nhieIndex, setNhieIndex] = useState(0);

  // Store answers per question id: { [questionId]: { user_1: 'A'|'B', user_2: 'A'|'B' } }
  const [wyrAnswers, setWyrAnswers] = useLocalState<Record<string, { user_1?: string; user_2?: string }>>(
    `games:wyr_answers:${coupleId || 'demo'}`,
    {}
  );

  const [nhieAnswers, setNhieAnswers] = useLocalState<Record<string, { user_1?: boolean; user_2?: boolean }>>(
    `games:nhie_answers:${coupleId || 'demo'}`,
    {}
  );

  const currentWyr: WouldYouRatherItem = WOULD_YOU_RATHER_ITEMS[wyrIndex % WOULD_YOU_RATHER_ITEMS.length];
  const currentNhie: NeverHaveIEverItem = NEVER_HAVE_I_EVER_ITEMS[nhieIndex % NEVER_HAVE_I_EVER_ITEMS.length];

  const currentWyrVote = wyrAnswers[currentWyr.id] || {};
  const currentNhieVote = nhieAnswers[currentNhie.id] || {};

  const user1Name = data.couple.user1.name;
  const user2Name = data.couple.user2.name;
  const mySlot = data.activeProfileId; // 'user_1' | 'user_2'

  const handleVoteWyr = (choice: 'A' | 'B') => {
    setWyrAnswers((prev) => ({
      ...prev,
      [currentWyr.id]: {
        ...prev[currentWyr.id],
        [mySlot]: choice,
      },
    }));
  };

  const handleVoteNhie = (iHave: boolean) => {
    setNhieAnswers((prev) => ({
      ...prev,
      [currentNhie.id]: {
        ...prev[currentNhie.id],
        [mySlot]: iHave,
      },
    }));
  };

  const bothVotedWyr = currentWyrVote.user_1 !== undefined && currentWyrVote.user_2 !== undefined;
  const isWyrMatch = bothVotedWyr && currentWyrVote.user_1 === currentWyrVote.user_2;

  const bothVotedNhie = currentNhieVote.user_1 !== undefined && currentNhieVote.user_2 !== undefined;

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-canvas border border-line">
          <button
            type="button"
            onClick={() => setMode('wyr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'wyr'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            🤔 Would You Rather
          </button>
          <button
            type="button"
            onClick={() => setMode('nhie')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'nhie'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            🙋 Never Have I Ever
          </button>
        </div>
      </div>

      {/* Active Voter Notice */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-line text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-ink-muted">Voting as:</span>
          <strong className="text-ink">{activeProfile.name}</strong>
        </div>

        <button
          type="button"
          onClick={() => switchProfile(partnerProfile.id)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Switch to {partnerProfile.name} to vote for both →
        </button>
      </div>

      {mode === 'wyr' ? (
        /* Would You Rather Card */
        <div className="space-y-4">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              Card #{wyrIndex + 1} of {WOULD_YOU_RATHER_ITEMS.length}
            </span>
            <h3 className="font-display text-2xl font-bold text-ink mt-2">Would You Rather…</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A */}
            <button
              type="button"
              onClick={() => handleVoteWyr('A')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                currentWyrVote[mySlot] === 'A'
                  ? 'border-primary bg-primary/10 ring-4 ring-primary/20 shadow-md scale-101'
                  : 'border-line bg-surface hover:bg-canvas/60 hover:border-primary/40'
              }`}
            >
              <div>
                <span className="inline-block px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-extrabold text-xs mb-3">
                  Option A
                </span>
                <p className="font-display text-lg font-bold text-ink leading-snug">{currentWyr.optionA}</p>
              </div>

              {/* Badges for who voted */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-xs">
                {currentWyrVote.user_1 === 'A' && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-semibold text-[10px]">
                    {user1Name}
                  </span>
                )}
                {currentWyrVote.user_2 === 'A' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-semibold text-[10px]">
                    {user2Name}
                  </span>
                )}
              </div>
            </button>

            {/* Option B */}
            <button
              type="button"
              onClick={() => handleVoteWyr('B')}
              className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                currentWyrVote[mySlot] === 'B'
                  ? 'border-primary bg-primary/10 ring-4 ring-primary/20 shadow-md scale-101'
                  : 'border-line bg-surface hover:bg-canvas/60 hover:border-primary/40'
              }`}
            >
              <div>
                <span className="inline-block px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-extrabold text-xs mb-3">
                  Option B
                </span>
                <p className="font-display text-lg font-bold text-ink leading-snug">{currentWyr.optionB}</p>
              </div>

              {/* Badges for who voted */}
              <div className="mt-4 pt-3 border-t border-line/60 flex items-center gap-2 text-xs">
                {currentWyrVote.user_1 === 'B' && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-semibold text-[10px]">
                    {user1Name}
                  </span>
                )}
                {currentWyrVote.user_2 === 'B' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-semibold text-[10px]">
                    {user2Name}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Reveal Result Banner */}
          {bothVotedWyr && (
            <div
              className={`p-4 rounded-2xl border text-center animate-in zoom-in-95 duration-200 ${
                isWyrMatch
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}
            >
              {isWyrMatch ? (
                <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Soulmate sync! You both picked the exact same option 💕</span>
                </p>
              ) : (
                <p className="font-bold text-sm flex items-center justify-center gap-1.5">
                  <Heart className="w-4 h-4 text-purple-600" />
                  <span>Opposites attract! Time to discuss why you chose differently 😊</span>
                </p>
              )}
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setWyrIndex((v) => v + 1)}
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2 shadow-cta transition-transform active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Scenario</span>
            </button>
          </div>
        </div>
      ) : (
        /* Never Have I Ever Card */
        <div className="space-y-4">
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-surface to-canvas border-2 border-line shadow-card text-center space-y-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest">
              Card #{nhieIndex + 1} of {NEVER_HAVE_I_EVER_ITEMS.length}
            </span>

            <p className="font-display text-xl sm:text-2xl font-bold text-ink max-w-lg mx-auto leading-relaxed">
              "{currentNhie.statement}"
            </p>

            <div className="flex justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => handleVoteNhie(true)}
                className={`px-5 py-3 rounded-2xl border-2 text-xs font-bold flex items-center gap-2 transition-all ${
                  currentNhieVote[mySlot] === true
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-4 ring-emerald-200'
                    : 'border-line bg-surface hover:bg-canvas text-ink'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>I Have! 🙋</span>
              </button>

              <button
                type="button"
                onClick={() => handleVoteNhie(false)}
                className={`px-5 py-3 rounded-2xl border-2 text-xs font-bold flex items-center gap-2 transition-all ${
                  currentNhieVote[mySlot] === false
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-4 ring-rose-200'
                    : 'border-line bg-surface hover:bg-canvas text-ink'
                }`}
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>Never! 🙅</span>
              </button>
            </div>

            {/* Both voted summary */}
            {bothVotedNhie && (
              <div className="mt-4 p-3 rounded-xl bg-canvas border border-line text-xs text-ink-muted">
                <span>{user1Name}: {currentNhieVote.user_1 ? 'Has done this!' : 'Never!'}</span>
                <span className="mx-2">•</span>
                <span>{user2Name}: {currentNhieVote.user_2 ? 'Has done this!' : 'Never!'}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setNhieIndex((v) => v + 1)}
              className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-2 shadow-cta transition-transform active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Statement</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
