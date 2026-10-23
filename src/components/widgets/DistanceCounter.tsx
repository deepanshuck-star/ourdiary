'use client';

import React from 'react';
import Link from 'next/link';
import { MoveHorizontal, Plane } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLongDistance } from '@/hooks/useLongDistance';
import { useTrips } from '@/hooks/useTrips';
import { calculateDaysTogether } from '@/lib/date-utils';
import { approxFlightHours, buildDistanceSummary } from '@/lib/features/distance';

/**
 * The one line people screenshot.
 *
 * Every number in it already existed somewhere in the app and none of them
 * were ever put in the same sentence: the kilometres from the two home cities,
 * the days from the couple's start date, the reunion from the next trip.
 */
export function DistanceCounter({ compact = false }: { compact?: boolean }) {
  const { data, isHydrated } = useDiary();
  const { myHome, partnerHome, unit, now } = useLongDistance(60_000);
  const { daysUntilReunion } = useTrips();

  if (!isHydrated || now === null) return null;

  const summary = buildDistanceSummary({
    mine: myHome,
    theirs: partnerHome,
    daysTogether: calculateDaysTogether(data.couple.startDate),
    daysUntilReunion,
    unit,
  });

  if (compact) {
    return (
      <p className="text-sm text-ink-muted">
        <MoveHorizontal className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-primary" aria-hidden="true" />
        {summary.line}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="distance-heading"
      className="rounded-[1.25rem] bg-hero border border-line p-5 sm:p-6 shadow-card"
    >
      <h2
        id="distance-heading"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5"
      >
        <MoveHorizontal className="w-3.5 h-3.5" aria-hidden="true" /> Where you both are
      </h2>

      <p className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-2 leading-snug">
        {summary.line}
      </p>

      {summary.km !== null ? (
        <p className="text-xs text-ink-muted mt-2 flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5" aria-hidden="true" />
          About {approxFlightHours(summary.km)} hours in the air
          {myHome?.label && partnerHome?.label ? ` · ${shortLabel(myHome.label)} → ${shortLabel(partnerHome.label)}` : ''}
        </p>
      ) : (
        <p className="text-xs text-ink-muted mt-2">
          Add both of your cities on the{' '}
          <Link href="/long-distance" className="font-semibold text-primary hover:underline">
            long-distance page
          </Link>{' '}
          and this turns into a real number.
        </p>
      )}

      {daysUntilReunion === null && (
        <p className="text-xs text-ink-muted mt-1">
          No visit booked yet —{' '}
          <Link href="/trips" className="font-semibold text-primary hover:underline">
            plan the next one
          </Link>{' '}
          and the countdown joins this line.
        </p>
      )}
    </section>
  );
}

/** Nominatim labels are long; the first couple of parts are the useful bit. */
function shortLabel(label: string): string {
  return label.split(',').slice(0, 2).join(',').trim();
}
