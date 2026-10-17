'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import { Memory } from '@/types';

export function OnThisDayCard() {
  const { data, isHydrated } = useDiary();
  const [throwbackMemory, setThrowbackMemory] = useState<Memory | null>(null);

  useEffect(() => {
    if (!isHydrated || !data.memories || data.memories.length === 0) return;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Check exact month and day from previous years
    const exactMatch = data.memories.find((m) => {
      const d = new Date(m.date);
      return (
        d.getMonth() + 1 === currentMonth &&
        d.getDate() === currentDay &&
        d.getFullYear() < today.getFullYear()
      );
    });

    if (exactMatch) {
      setThrowbackMemory(exactMatch);
    } else {
      setThrowbackMemory(data.memories[data.memories.length - 1]);
    }
  }, [data.memories, isHydrated]);

  if (!throwbackMemory) return null;


  return (
    <div className="rounded-[1.25rem] bg-surface border border-line p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {throwbackMemory.photos?.[0] ? (
          <img
            src={throwbackMemory.photos[0].url}
            alt={throwbackMemory.title}
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-primary flex items-center justify-center text-2xl flex-shrink-0">
            ⏳
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full">
              On this day
            </span>
            <span className="text-xs text-ink-muted font-medium">{formatDate(throwbackMemory.date)}</span>
          </div>

          <h4 className="font-display font-semibold text-lg text-ink truncate mt-1">
            {throwbackMemory.title}
          </h4>

          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
            {throwbackMemory.description}
          </p>
        </div>
      </div>

      <Link
        href={`/memories/${throwbackMemory.id}`}
        className="px-4 py-2 rounded-full bg-surface border border-line text-ink hover:border-purple-300 font-semibold text-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
      >
        <span>Relive it</span>
        <ArrowRight className="w-3.5 h-3.5 text-primary" />
      </Link>
    </div>
  );
}
