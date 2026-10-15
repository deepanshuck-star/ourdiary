'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Sparkles, ArrowRight, MapPin } from 'lucide-react';
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

  const memoryYear = new Date(throwbackMemory.date).getFullYear();

  return (
    <div className="rounded-3xl bg-gradient-to-r from-amber-50/70 via-pink-50/70 to-purple-50/70 border border-amber-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {throwbackMemory.photos?.[0] ? (
          <img
            src={throwbackMemory.photos[0].url}
            alt={throwbackMemory.title}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-amber-200 flex-shrink-0 shadow-xs"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
            ⏳
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
              Time Machine Flashback
            </span>
            <span className="text-xs text-slate-400 font-medium">{formatDate(throwbackMemory.date)}</span>
          </div>

          <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1">
            {throwbackMemory.title}
          </h4>

          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
            {throwbackMemory.description}
          </p>
        </div>
      </div>

      <Link
        href={`/memories/${throwbackMemory.id}`}
        className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs shadow-xs hover:bg-amber-100/50 transition-colors flex items-center gap-1.5 flex-shrink-0"
      >
        <span>Relive Memory</span>
        <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
      </Link>
    </div>
  );
}
