'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Gamepad2, Lock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { useLocalState } from '@/lib/local-store';
import { locationKey, type GeocodeCache } from '@/lib/features/geocode-queue';
import {
  CATEGORIES,
  GAMES,
  gameById,
  gamesInCategory,
  unmetRequirement,
  type LibraryStats,
} from '@/lib/features/games/registry';

import { TicTacToeGame } from '@/components/games/TicTacToeGame';
import { TruthOrDareGame } from '@/components/games/TruthOrDareGame';
import { WouldYouRatherGame } from '@/components/games/WouldYouRatherGame';
import { MemoryMatchGame } from '@/components/games/MemoryMatchGame';
import { LoveWordleGame } from '@/components/games/LoveWordleGame';
import { LoveDoodleGame } from '@/components/games/LoveDoodleGame';
import { Connect4Game } from '@/components/games/Connect4Game';
import { DotsAndBoxesGame } from '@/components/games/DotsAndBoxesGame';
import { HangmanGame } from '@/components/games/HangmanGame';
import { WordChainGame } from '@/components/games/WordChainGame';
import { GuessTheMemoryGame } from '@/components/games/GuessTheMemoryGame';
import { TimelineRushGame } from '@/components/games/TimelineRushGame';
import { WhereWereWeGame } from '@/components/games/WhereWereWeGame';
import { GiftRecallGame } from '@/components/games/GiftRecallGame';
import { KnowMeGame } from '@/components/games/KnowMeGame';
import { ThirtySixQuestionsGame } from '@/components/games/ThirtySixQuestionsGame';
import { TwoTruthsGame } from '@/components/games/TwoTruthsGame';
import { RoseBudThornGame } from '@/components/games/RoseBudThornGame';
import { StoryTennisGame } from '@/components/games/StoryTennisGame';
import { RelationshipBingoGame } from '@/components/games/RelationshipBingoGame';
import { ScribbleGame } from '@/components/games/ScribbleGame';

/** Registry id -> component. Kept here so the registry stays pure data. */
const COMPONENTS: Record<string, React.ComponentType> = {
  guessmemory: GuessTheMemoryGame,
  timeline: TimelineRushGame,
  wherewerewe: WhereWereWeGame,
  giftrecall: GiftRecallGame,
  knowme: KnowMeGame,
  connect4: Connect4Game,
  dots: DotsAndBoxesGame,
  hangman: HangmanGame,
  wordchain: WordChainGame,
  tictactoe: TicTacToeGame,
  memorymatch: MemoryMatchGame,
  wordle: LoveWordleGame,
  thirtysix: ThirtySixQuestionsGame,
  twotruths: TwoTruthsGame,
  rosebudthorn: RoseBudThornGame,
  truthordare: TruthOrDareGame,
  wouldyourather: WouldYouRatherGame,
  storytennis: StoryTennisGame,
  bingo: RelationshipBingoGame,
  scribble: ScribbleGame,
  doodle: LoveDoodleGame,
};

export default function GamesPage() {
  const { data } = useDiary();
  const { partnerId } = useCoupleMembers();
  const space = useSpaceMode();
  const coupleId = data.couple.id || 'demo';

  // Selection is local state rather than a query param: ?game= would need a
  // Suspense boundary under Next's prerender, for a Back button that works
  // just as well without one.
  const [openId, setOpenId] = useState<string | null>(null);

  // The globe's geocode cache tells us which memories can actually be placed.
  const [geocache] = useLocalState<GeocodeCache>(`globe-geocache:${coupleId}`, {});
  const [localGifts] = useLocalState<unknown[]>(`gifts:${coupleId}`, []);

  const stats = useMemo<LibraryStats>(() => {
    const memories = data.memories;
    return {
      hasPartner: Boolean(partnerId),
      memories: memories.length,
      photos: memories.reduce((n, m) => n + (m.photos?.length ?? 0), 0),
      datedMemories: memories.filter((m) => /^\d{4}-\d{2}-\d{2}$/.test(m.date)).length,
      placedMemories: memories.filter((m) => {
        const key = locationKey(m.location);
        return key ? geocache[key]?.status === 'found' : false;
      }).length,
      // Gifts live in Supabase in a live space; counting them here would
      // mean a query on every arcade visit. The tile stays open and the
      // game itself explains if the wardrobe is empty.
      gifts: Math.max(localGifts.length, 2),
    };
  }, [data.memories, partnerId, geocache, localGifts.length]);

  // A personal diary has no two-player games, so the count in the heading
  // has to match what is actually on the page.
  const playable = GAMES.filter((g) => space.allowsGame(g.requires));

  const open = gameById(openId);
  const OpenComponent = openId ? COMPONENTS[openId] : null;

  if (open && OpenComponent) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> All games
            </button>
            <h1 className="font-display text-3xl font-semibold text-ink">{open.title}</h1>
            <p className="text-sm text-ink-muted mt-1">{open.tagline}</p>
          </div>

          <details className="rounded-2xl border border-line bg-canvas p-4">
            <summary className="text-sm font-semibold text-ink cursor-pointer">How it works</summary>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {open.rules.map((rule) => (
                <li key={rule} className="text-xs text-ink-muted">
                  {rule}
                </li>
              ))}
            </ul>
          </details>

          <OpenComponent />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-10">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Couple games</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1 flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-primary" aria-hidden="true" />
            {playable.length} ways to waste an evening
          </h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            Pick one. The rules are on each card, so you can tell what you’re getting into before you commit.
          </p>
        </header>

        {CATEGORIES.map((category) => {
          const games = gamesInCategory(category.id).filter((g) => space.allowsGame(g.requires));
          if (games.length === 0) return null;
          return (
            <section key={category.id} aria-labelledby={`cat-${category.id}`} className="space-y-4">
              <div>
                <h2 id={`cat-${category.id}`} className="text-2xl font-semibold text-ink">
                  {category.title}
                </h2>
                <p className="text-sm text-ink-muted mt-0.5 max-w-2xl">{category.blurb}</p>
              </div>

              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {games.map((gameMeta) => {
                  const blocked = unmetRequirement(gameMeta, stats);
                  return (
                    <li key={gameMeta.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(gameMeta.id)}
                        disabled={Boolean(blocked)}
                        className={`h-full w-full text-left rounded-[1.25rem] border p-5 shadow-sm transition-colors flex flex-col gap-3 ${
                          blocked
                            ? 'border-line bg-canvas opacity-70 cursor-not-allowed'
                            : 'border-line bg-surface hover:border-primary hover:shadow-card'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-lg font-semibold text-ink leading-tight">
                              {gameMeta.title}
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                              {gameMeta.players}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">{gameMeta.tagline}</p>
                        </div>

                        <ul className="space-y-1 flex-1">
                          {gameMeta.rules.map((rule) => (
                            <li key={rule} className="text-xs text-ink-muted flex gap-1.5">
                              <span className="text-primary flex-shrink-0" aria-hidden="true">
                                ·
                              </span>
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>

                        {blocked ? (
                          <p className="text-[11px] font-semibold text-ink-muted flex items-center gap-1.5 pt-1 border-t border-line">
                            <Lock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                            {blocked}
                          </p>
                        ) : (
                          <span className="text-[11px] font-bold uppercase tracking-wider text-primary pt-1 border-t border-line">
                            Play →
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
