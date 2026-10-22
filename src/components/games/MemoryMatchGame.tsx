'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Trophy, Star, Clock, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { createMemoryDeck, type MemoryMatchCard } from '@/lib/features/games';

export function MemoryMatchGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id;

  // Extract memory photos if available
  const photoUrls = data.memories
    .flatMap((m) => m.photos || [])
    .map((p) => p.url)
    .filter(Boolean);

  const [cards, setCards] = useState<MemoryMatchCard[]>(() => createMemoryDeck(photoUrls));
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [bestMoves, setBestMoves] = useLocalState<number | null>(`games:match_best:${coupleId || 'demo'}`, null);

  const isWon = matchedPairIds.length === 8;

  // Stopwatch timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isGameActive && !isWon) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGameActive, isWon]);

  // Handle card click
  const handleCardClick = (card: MemoryMatchCard) => {
    if (flippedIds.length === 2 || flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId)) {
      return;
    }

    if (!isGameActive) setIsGameActive(true);

    const nextFlipped = [...flippedIds, card.id];
    setFlippedIds(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstId, secondId] = nextFlipped;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = cards.find((c) => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Matched!
        setMatchedPairIds((prev) => {
          const next = [...prev, firstCard.pairId];
          if (next.length === 8) {
            // Completed! Check best moves
            const finalMoves = moves + 1;
            if (bestMoves === null || finalMoves < bestMoves) {
              setBestMoves(finalMoves);
            }
          }
          return next;
        });
        setFlippedIds([]);
      } else {
        // No match -> flip back after 800ms
        setTimeout(() => {
          setFlippedIds([]);
        }, 850);
      }
    }
  };

  const handleRestart = () => {
    setCards(createMemoryDeck(photoUrls));
    setFlippedIds([]);
    setMatchedPairIds([]);
    setMoves(0);
    setSeconds(0);
    setIsGameActive(false);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const starCount = moves <= 14 ? 3 : moves <= 22 ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Game Info & Stats */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-line flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-ink">
            <Clock className="w-4 h-4 text-primary" />
            <span>Time: {formatTimer(seconds)}</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-ink">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Moves: {moves}</span>
          </div>

          {bestMoves !== null && (
            <div className="flex items-center gap-1 text-ink-muted">
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Record: {bestMoves} moves</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleRestart}
          className="px-3.5 py-1.5 rounded-full border border-line bg-canvas hover:bg-surface text-ink text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Shuffle & Restart</span>
        </button>
      </div>

      {photoUrls.length >= 4 && (
        <div className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 text-xs flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Using real photos from your couple memory journey! 💕</span>
        </div>
      )}

      {/* 4x4 Cards Grid */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3 max-w-[440px] mx-auto select-none">
        {cards.map((card) => {
          const isFlipped = flippedIds.includes(card.id) || matchedPairIds.includes(card.pairId);
          const isMatched = matchedPairIds.includes(card.pairId);

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              className={`aspect-square rounded-2xl border-2 transition-all transform duration-300 relative overflow-hidden flex items-center justify-center ${
                isFlipped
                  ? isMatched
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-xs'
                    : 'border-primary bg-primary/10 shadow-sm'
                  : 'border-line bg-surface hover:bg-canvas hover:border-primary/40 active:scale-95 shadow-2xs'
              }`}
            >
              {isFlipped ? (
                card.isImage ? (
                  <img
                    src={card.content}
                    alt="Memory card"
                    className="w-full h-full object-cover animate-in fade-in zoom-in-75 duration-200"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl animate-in zoom-in-75 duration-200">
                    {card.content}
                  </span>
                )
              ) : (
                <span className="text-xl sm:text-2xl opacity-40">💖</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Win Modal / Banner */}
      {isWon && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-300 shadow-card text-center space-y-3 animate-in zoom-in-95">
          <div className="flex justify-center gap-1">
            {[...Array(starCount)].map((_, i) => (
              <Star key={i} className="w-7 h-7 text-amber-400 fill-amber-400 animate-bounce" />
            ))}
          </div>

          <h3 className="font-display text-2xl font-extrabold text-emerald-900">
            Memory Master! 🎉
          </h3>
          <p className="text-sm text-emerald-800">
            You completed the couple match in <strong>{moves} moves</strong> ({formatTimer(seconds)})!
          </p>

          <button
            type="button"
            onClick={handleRestart}
            className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-cta transition-transform active:scale-95"
          >
            Play Again!
          </button>
        </div>
      )}
    </div>
  );
}
