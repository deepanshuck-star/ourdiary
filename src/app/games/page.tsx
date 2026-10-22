'use client';

import React, { useState } from 'react';
import {
  Gamepad2,
  Heart,
  Flame,
  HelpCircle,
  Puzzle,
  FileText,
  Palette,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { TicTacToeGame } from '@/components/games/TicTacToeGame';
import { TruthOrDareGame } from '@/components/games/TruthOrDareGame';
import { WouldYouRatherGame } from '@/components/games/WouldYouRatherGame';
import { MemoryMatchGame } from '@/components/games/MemoryMatchGame';
import { LoveWordleGame } from '@/components/games/LoveWordleGame';
import { LoveDoodleGame } from '@/components/games/LoveDoodleGame';

type GameId = 'tictactoe' | 'truthordare' | 'wouldyourather' | 'memorymatch' | 'wordle' | 'doodle';

interface GameTab {
  id: GameId;
  title: string;
  tagline: string;
  badge: string;
  icon: any;
  accent: string;
}

const GAME_TABS: GameTab[] = [
  {
    id: 'tictactoe',
    title: 'Hearts & Kisses',
    tagline: 'Tic-Tac-Toe with romantic stakes',
    badge: 'Popular',
    icon: Heart,
    accent: 'from-pink-500 to-rose-500',
  },
  {
    id: 'truthordare',
    title: 'Truth or Dare',
    tagline: 'Romantic, intimate & spicy prompts',
    badge: 'Spicy 🔥',
    icon: Flame,
    accent: 'from-red-500 to-rose-600',
  },
  {
    id: 'wouldyourather',
    title: 'Would You Rather',
    tagline: 'Dilemmas & Never Have I Ever',
    badge: 'Match',
    icon: HelpCircle,
    accent: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'memorymatch',
    title: 'Memory Match',
    tagline: 'Pair matching with real photos',
    badge: 'Photos',
    icon: Puzzle,
    accent: 'from-amber-500 to-orange-500',
  },
  {
    id: 'wordle',
    title: 'Love Wordle',
    tagline: 'Guess the daily 5-letter love word',
    badge: 'Daily',
    icon: FileText,
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'doodle',
    title: 'Love Doodle',
    tagline: 'Draw cute sketches for each other',
    badge: 'Creative',
    icon: Palette,
    accent: 'from-blue-500 to-cyan-500',
  },
];

export default function GamesArcadePage() {
  const { data, activeProfile } = useDiary();
  const [activeGame, setActiveGame] = useState<GameId>('tictactoe');

  const selectedTab = GAME_TABS.find((t) => t.id === activeGame) || GAME_TABS[0];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Section */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Couple Arcade • 100% Free</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight">
              Couple Games
            </h1>
            <p className="text-sm text-ink-muted mt-1 max-w-xl">
              Playful mini-games to laugh, compete, spark conversation, and earn romantic stakes together.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-surface border border-line text-xs shadow-2xs">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-ink-muted">Challengers:</span>
            <span className="font-bold text-ink">{data.couple.user1.name} & {data.couple.user2.name}</span>
          </div>
        </header>

        {/* Game Navigation Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {GAME_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeGame === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveGame(tab.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm scale-102 ring-2 ring-primary/20'
                    : 'border-line bg-surface hover:bg-canvas hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${tab.accent} shadow-2xs`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-canvas text-ink-muted border border-line">
                    {tab.badge}
                  </span>
                </div>

                <div>
                  <p className="font-display text-xs font-bold text-ink leading-tight truncate">
                    {tab.title}
                  </p>
                  <p className="text-[10px] text-ink-muted truncate mt-0.5">{tab.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Game Card Showcase */}
        <section
          aria-label={selectedTab.title}
          className="rounded-[1.5rem] border border-line bg-surface shadow-card p-5 sm:p-7 space-y-6"
        >
          {/* Header inside game box */}
          <div className="flex items-center justify-between border-b border-line pb-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {selectedTab.title}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {selectedTab.badge}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">{selectedTab.tagline}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <span>Playing as: <strong className="text-ink">{activeProfile.name}</strong></span>
            </div>
          </div>

          {/* Active Game Component */}
          <div className="pt-2">
            {activeGame === 'tictactoe' && <TicTacToeGame />}
            {activeGame === 'truthordare' && <TruthOrDareGame />}
            {activeGame === 'wouldyourather' && <WouldYouRatherGame />}
            {activeGame === 'memorymatch' && <MemoryMatchGame />}
            {activeGame === 'wordle' && <LoveWordleGame />}
            {activeGame === 'doodle' && <LoveDoodleGame />}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
