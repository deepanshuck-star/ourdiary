'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import {
  Lock,
  Unlock,
  Calendar,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { DailyQuestionCard } from '@/components/widgets/DailyQuestionCard';

export default function DailySparkPage() {
  const { data } = useDiary();
  const { isPersonal, note: spaceNote, title } = useSpaceMode();
  const note = spaceNote('/daily-spark');
  const me = data.activeProfileId;

  const history = data.dailySparkAnswers || [];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Navigation & Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-semibold text-slate-500">Back to Dashboard</span>
        </div>

        <div className="rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-hero">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-xs">
              ✨
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {title('/daily-spark', 'Daily Sparks & Questions')}
              </h1>
              {!isPersonal && (
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  Deepen your intimacy one honest question a day. Blind answers unlock when both submit!
                </p>
              )}
              {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
            </div>
          </div>
        </div>

        {/* Today's Active Spark Card */}
        <DailyQuestionCard />

        {/* Archives / Past Answered Questions */}
        <div className="rounded-3xl bg-white border border-line p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="font-extrabold text-base text-slate-900">Past Question Archives</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {history.length} Questions Answered
            </span>
          </div>

          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => {
                const user1Ans = entry.answers?.user_1;
                const user2Ans = entry.answers?.user_2;
                const myAns = entry.answers?.[me];
                // Alone there is nobody to unlock against: your own answer is the entry.
                const isBoth = isPersonal ? !!myAns : !!(user1Ans && user2Ans);

                return (
                  <div
                    key={entry.questionId}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        {formatDate(entry.date)}
                      </span>

                      {isBoth ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          {isPersonal ? 'Answered' : 'Unlocked'}
                        </span>
                      ) : (
                        !isPersonal && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Waiting on Partner
                          </span>
                        )
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      "{entry.question}"
                    </h4>

                    {isPersonal ? (
                      myAns ? (
                        <div className="p-3 rounded-xl bg-white border border-purple-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">
                            Your answer
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            "{myAns.content}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">You haven't answered this one.</p>
                      )
                    ) : isBoth ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-white border border-purple-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">
                            {data.couple.user1.name}
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            "{user1Ans?.content}"
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-rose-100 space-y-1">
                          <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                            {data.couple.user2.name}
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            "{user2Ans?.content}"
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Answers will unlock once both partners have submitted their response.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs">
              No past archives yet. Start by answering today’s question above!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
