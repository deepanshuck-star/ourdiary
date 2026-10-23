'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gift, RotateCcw } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useCoupleMembers } from '@/hooks/useCoupleMembers';
import { useLocalState } from '@/lib/local-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchGiftsRemote } from '@/lib/supabase/gifts';
import {
  buildGiftRound,
  type GiftLikeForGame,
  type GiftQuestion,
  type GiftRound,
} from '@/lib/features/games/memoryGames';

/** Demo-mode gifts live in localStorage under the gifts page's own key. */
interface LocalGift extends GiftLikeForGame {
  createdBy: string;
}

export function GiftRecallGame() {
  const { data, activeProfile, partnerProfile, isLiveUser, currentUserId } = useDiary();
  const { myId, partnerId } = useCoupleMembers();
  const coupleId = data.couple.id;
  const supabase = isLiveUser && currentUserId ? getSupabaseBrowserClient() : null;
  const live = Boolean(supabase && coupleId);

  const [remote, setRemote] = useState<GiftLikeForGame[]>([]);
  const [localGifts] = useLocalState<LocalGift[]>(`gifts:${coupleId || 'demo'}`, []);
  const [loading, setLoading] = useState(live);
  const [best, setBest] = useLocalState<number>(`games:giftrecall_best:${coupleId || 'demo'}`, 0);

  const [round, setRound] = useState<GiftRound | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!live || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchGiftsRemote(supabase, coupleId)
      .then((rows) => {
        if (!cancelled) {
          setRemote(
            rows.map((g) => ({
              id: g.id,
              title: g.title,
              occasion: g.occasion,
              fromUserId: g.fromUserId,
              toUserId: g.toUserId,
              givenOn: g.givenOn,
            }))
          );
        }
      })
      .catch((err) => console.error('[OurDiary] Failed to load gifts for the game:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, supabase, coupleId]);

  const gifts = live ? remote : localGifts;

  const names = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (myId) map[myId] = activeProfile.name;
    if (partnerId) map[partnerId] = partnerProfile.name;
    return map;
  }, [myId, partnerId, activeProfile.name, partnerProfile.name]);

  // Client-only: buildGiftRound uses Math.random.
  const deal = useCallback(() => {
    if (gifts.length === 0) {
      setRound(null);
      return;
    }
    // Ask "who" or "what for" at random, falling back to whichever the data
    // can actually support.
    const order: GiftQuestion[] = Math.random() < 0.5 ? ['who', 'occasion'] : ['occasion', 'who'];
    const next = order.map((q) => buildGiftRound(gifts, names, q)).find(Boolean) ?? null;
    setRound(next);
    setPicked(null);
  }, [gifts, names]);

  useEffect(() => {
    deal();
  }, [deal]);

  const answer = (option: string) => {
    if (!round || picked) return;
    setPicked(option);
    if (option === round.answer) {
      const next = streak + 1;
      setStreak(next);
      if (next > best) setBest(next);
    } else {
      setStreak(0);
    }
  };

  if (loading) return <p className="text-sm text-ink-muted">Loading your wardrobe…</p>;

  if (!round) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-line p-6 space-y-3">
        <p className="text-sm text-ink-muted">
          {gifts.length === 0
            ? 'Nothing in the gifts wardrobe yet — log a few and the questions build themselves.'
            : 'Not quite enough yet. A couple more gifts, ideally with occasions on them, and there’ll be something to ask.'}
        </p>
        <Link
          href="/gifts"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
        >
          <Gift className="w-3.5 h-3.5" /> Open the wardrobe
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Streak <span className="font-semibold text-ink">{streak}</span> · best{' '}
          <span className="font-semibold text-ink">{best}</span>
        </p>
        <button
          type="button"
          onClick={deal}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-canvas"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Skip
        </button>
      </div>

      <div className="rounded-[1.25rem] border border-line bg-surface p-5 shadow-card space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {round.question === 'who' ? 'Who gave this?' : 'What was the occasion?'}
          </p>
          <p className="font-display text-xl font-semibold text-ink mt-1">{round.giftTitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {round.options.map((option) => {
            const isAnswer = option === round.answer;
            const chosen = option === picked;
            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={Boolean(picked)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-medium text-left border transition-colors ${
                  !picked
                    ? 'border-line bg-canvas text-ink hover:border-primary'
                    : isAnswer
                      ? 'border-primary bg-primary text-on-primary'
                      : chosen
                        ? 'border-danger bg-danger/10 text-danger'
                        : 'border-line bg-canvas text-ink-muted'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="pt-3 border-t border-line space-y-2" aria-live="polite">
            <p className="text-sm font-semibold text-ink">
              {picked === round.answer ? 'Right 💛' : `It was ${round.answer}`}
            </p>
            <button
              type="button"
              onClick={deal}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
            >
              Next one
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default GiftRecallGame;
