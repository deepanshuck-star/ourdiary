'use client';

import React, { useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { MoodHistorySection } from '@/components/widgets/MoodHistorySection';
import {
  calculateDaysTogether,
  getMilestones,
  formatDate,
} from '@/lib/date-utils';
import {
  BarChart3,
  Heart,
  Flame,
  Camera,
  Smile,
  CheckCircle2,
  Award,
  TrendingUp,
} from 'lucide-react';
import { TiltCard } from '@/components/fx/TiltCard';

export default function OurStatsPage() {
  const { data } = useDiary();
  const { isPersonal, note: spaceNote, title } = useSpaceMode();
  const note = spaceNote('/our-stats');

  const daysTogether = calculateDaysTogether(data.couple.startDate);
  const totalMemories = data.memories.length;
  const totalPhotos = data.memories.reduce((acc, m) => acc + (m.photos?.length || 0), 0);
  const totalOutings = data.memories.filter((m) => m.category === 'Outing').length;
  const totalTrips = data.memories.filter((m) => m.category === 'Trip').length;

  const milestones = getMilestones(data.couple.startDate);

  // Mood Distribution
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {
      happy: 0,
      romantic: 0,
      adventurous: 0,
      funny: 0,
      cozy: 0,
      touching: 0,
      peaceful: 0,
    };
    data.memories.forEach((m) => {
      if (counts[m.mood] !== undefined) {
        counts[m.mood] += 1;
      }
    });
    return counts;
  }, [data.memories]);

  // Memories by Year
  const yearCounts = useMemo(() => {
    const map = new Map<string, number>();
    data.memories.forEach((m) => {
      const yr = m.date.split('-')[0];
      map.set(yr, (map.get(yr) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.memories]);

  // Bucket list stats
  const totalBucket = data.bucketList.length;
  const completedBucket = data.bucketList.filter((b) => b.completed).length;
  const bucketPercent = totalBucket > 0 ? Math.round((completedBucket / totalBucket) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl shadow-md flex items-center justify-between bg-hero">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-white/80 text-purple-700 shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {title('/our-stats', 'Our Relationship Analytics')}
              </h1>
            </div>
            {!isPersonal && (
              <p className="text-sm text-slate-700 font-medium">
                Data, milestones & love metrics for {data.couple.name}
              </p>
            )}
            {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
          </div>
        </div>

        {/* Big Key Metric Cards */}
        <div className={`grid grid-cols-2 ${isPersonal ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
          {/* Days together counts a relationship — there isn't one to count here. */}
          {!isPersonal && (
            <div className="p-5 rounded-3xl bg-white border border-line shadow-xs text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-500 mx-auto flex items-center justify-center">
                <Flame className="w-5 h-5 fill-rose-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{daysTogether}</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Days Together</p>
            </div>
          )}

          <div className="p-5 rounded-3xl bg-white border border-line shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
              <Heart className="w-5 h-5 fill-purple-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalMemories}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Memories</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-line shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalPhotos}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Photos Kept</p>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-line shadow-xs text-center space-y-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">{bucketPercent}%</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bucket List Done</p>
          </div>
        </div>

        {/* 2-Column: Mood Distribution & Memories by Year */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Distribution */}
          <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900">Mood Atmosphere</h3>
              </div>
              <span className="text-xs text-slate-400">{totalMemories} logged moods</span>
            </div>

            <div className="space-y-3">
              {[
                { mood: 'happy', emoji: '😄', color: 'bg-emerald-400', label: 'Happy' },
                { mood: 'romantic', emoji: '💖', color: 'bg-rose-400', label: 'Romantic' },
                { mood: 'adventurous', emoji: '🏕️', color: 'bg-teal-400', label: 'Adventurous' },
                { mood: 'funny', emoji: '😂', color: 'bg-amber-400', label: 'Funny' },
                { mood: 'cozy', emoji: '☕', color: 'bg-indigo-300', label: 'Cozy' },
                { mood: 'touching', emoji: '🥺', color: 'bg-purple-400', label: 'Touching' },
              ].map((item) => {
                const count = moodCounts[item.mood] || 0;
                const percent = totalMemories > 0 ? Math.round((count / totalMemories) * 100) : 0;

                return (
                  <div key={item.mood} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                      </span>
                      <span>
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Memories by Year Chart */}
          <div className="rounded-3xl bg-white border border-line p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900">Journey Through the Years</h3>
              </div>
              <span className="text-xs text-slate-400">Chapters</span>
            </div>

            {/* Custom Bar Visualization */}
            <div className="flex items-end justify-around h-48 pt-6 pb-2 border-b border-slate-100">
              {yearCounts.map(([yr, count]) => {
                const maxCount = Math.max(...yearCounts.map((y) => y[1]), 1);
                const heightPercent = Math.round((count / maxCount) * 100);

                return (
                  <div key={yr} className="flex flex-col items-center gap-2 group w-16">
                    <span className="text-xs font-bold text-purple-700 opacity-80 group-hover:scale-110 transition-transform">
                      {count}
                    </span>
                    <div className="w-12 rounded-t-2xl bg-gradient-to-t from-secondary to-primary group-hover:brightness-105 transition-all shadow-sm" style={{ height: `${Math.max(20, heightPercent * 1.2)}px` }} />
                    <span className="text-xs font-bold text-slate-600">{yr}</span>
                  </div>
                );
              })}
            </div>

            {/* Outings and Trips pills */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-purple-600 uppercase">Day Outings</p>
                  <p className="text-xl font-black text-slate-800">{totalOutings}</p>
                </div>
                <span className="text-2xl">🎡</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase">Vacation Trips</p>
                  <p className="text-xl font-black text-slate-800">{totalTrips}</p>
                </div>
                <span className="text-2xl">✈️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Both of these read a relationship: milestones counted from the start
            date, and a mood chart with a series per partner. */}
        {!isPersonal && (
          <>
          {/* Full Milestone Timeline */}
          <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-lg text-slate-900">Relationship Milestone Roadmap</h3>
              </div>
              <span className="text-xs text-slate-400">
                Anniversary: {formatDate(data.couple.anniversaryDate)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {milestones.map((m) => (
                <TiltCard key={m.days} className="rounded-2xl" maxTilt={6} gyro>
                <div
                  className={`h-full p-4 rounded-2xl border transition-all ${
                    m.reached
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-800">{m.label}</span>
                    {m.reached ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                        Reached 🎉
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500">
                        In {m.daysLeft} days
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Target: {formatDate(m.targetDate)}</p>
                </div>
                </TiltCard>
              ))}
            </div>
          </div>

          {/* Mood history for both partners */}
          <MoodHistorySection />
          </>
        )}
      </div>
    </AppShell>
  );
}
