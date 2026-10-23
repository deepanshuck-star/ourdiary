'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sunrise, X } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { useLongDistance } from '@/hooks/useLongDistance';
import { usePartnerLastMessage } from '@/hooks/usePartnerLastMessage';
import { buildHandoff, formatGap } from '@/lib/features/handoff';
import { formatChatTime } from '@/lib/features/chat';

/**
 * The card for whoever is awake while the other one isn't.
 *
 * It shows up at the top of the dashboard at the hours it is useful — the
 * early morning, the late night — and stays out of the way the rest of the
 * time. `isProbablyAsleep` has been in the codebase since the long-distance
 * page shipped and nothing ever acted on it; this is the thing that does.
 */
export function GoodMorningHandoff() {
  const { data, partnerProfile } = useDiary();
  const { now, mySleep, partnerSleep, partnerZone, partnerZoneIsSet } = useLongDistance(60_000);
  const lastMessage = usePartnerLastMessage();

  // Dismissal is this device's business, so this key stays off the synced
  // allowlist — hiding the card on my phone should not hide it on theirs.
  const [dismissed, setDismissed] = useLocalState<string[]>(
    `handoff-dismissed:${data.couple.id}`,
    []
  );

  if (now === null || !mySleep || !partnerSleep) return null;

  // Until they have told us where they are, "asleep" would be a guess based
  // on this device's clock, which is exactly the wrong answer.
  if (!partnerZoneIsSet) return null;

  const card = buildHandoff({
    nowMs: now,
    partnerName: partnerProfile.name,
    iAmAwake: !mySleep.asleep,
    partnerAsleep: partnerSleep.asleep,
    partnerNextWakeUtc: partnerSleep.nextWakeUtc,
    lastPartnerMessage: lastMessage,
  });

  if (!card || dismissed.includes(card.dismissKey)) return null;

  const Icon = card.reason === 'waking-soon' ? Sunrise : Moon;
  const theirClock = new Intl.DateTimeFormat(undefined, {
    timeZone: partnerZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(now));

  return (
    <section
      aria-labelledby="handoff-heading"
      className="relative rounded-[1.5rem] border border-line bg-surface shadow-card p-5 sm:p-6"
    >
      <button
        type="button"
        onClick={() => setDismissed((prev) => [...prev.slice(-9), card.dismissKey])}
        aria-label="Hide this until their next morning"
        className="absolute top-3 right-3 p-2 rounded-full text-ink-muted hover:text-ink"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            card.reason === 'waking-soon' ? 'bg-amber-50 text-amber-600' : 'bg-ink text-snow'
          }`}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Different clocks
          </p>
          <h2 id="handoff-heading" className="font-display text-xl sm:text-2xl font-semibold text-ink mt-0.5">
            {card.headline}
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            {card.detail} It’s {theirClock} where they are.
          </p>
        </div>
      </div>

      {card.lastWord && (
        <figure className="mt-4 rounded-2xl bg-hero border border-line p-4">
          <blockquote className="text-sm text-ink whitespace-pre-wrap break-words">
            “{card.lastWord.content}”
          </blockquote>
          <figcaption className="text-[11px] text-ink-muted mt-2">
            {partnerProfile.name}, {formatChatTime(card.lastWord.createdAt)} — the last thing they said
          </figcaption>
        </figure>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/long-distance#morning-mail"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
        >
          <Sunrise className="w-4 h-4" aria-hidden="true" />
          Leave something for their morning
        </Link>
        <span className="text-xs text-ink-muted">
          Lands in {formatGap(card.msUntilTheyWake)}, when they wake.
        </span>
      </div>
    </section>
  );
}
