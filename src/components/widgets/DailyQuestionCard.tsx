'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Lock, Unlock, Send, ArrowRight, Heart, CheckCircle2 } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';

const QUESTIONS_POOL = [
  'What is one small thing I did this week that made your heart melt?',
  'If we had an entire free Sunday with zero obligations, how would we spend it?',
  'What was your very first impression of me the first day we met?',
  'What is your favorite memory of us traveling together?',
  'What is a song that instantly makes you think of our love?',
  'What is one little quirk of mine that secretly makes you smile?',
  'If you could teleport us anywhere for dinner tonight, where are we going?',
  'What was the moment you realized you had fallen deeply in love with me?',
];

export function DailyQuestionCard() {
  const { data, activeProfile, partnerProfile, answerDailySpark, isHydrated } = useDiary();
  const [draftAnswer, setDraftAnswer] = useState('');
  const [dayInfo, setDayInfo] = useState<{ dayOfYear: number; todayStr: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const doy = Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
    );
    setDayInfo({
      dayOfYear: doy,
      todayStr: now.toISOString().split('T')[0],
    });
  }, []);

  if (!isHydrated || !dayInfo) {
    return (
      <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-xs animate-pulse h-48" />
    );
  }

  const { dayOfYear, todayStr } = dayInfo;
  const questionIndex = dayOfYear % QUESTIONS_POOL.length;
  const currentQuestion = QUESTIONS_POOL[questionIndex];
  const questionId = `q_day_${dayOfYear}`;

  const todayEntry = data.dailySparkAnswers?.find(
    (a) => a.questionId === questionId || a.date === todayStr
  );

  const myAnswer = todayEntry?.answers?.[data.activeProfileId];
  const partnerId = data.activeProfileId === 'user_1' ? 'user_2' : 'user_1';
  const partnerAnswer = todayEntry?.answers?.[partnerId];

  const bothAnswered = !!(myAnswer && partnerAnswer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftAnswer.trim()) return;
    answerDailySpark(questionId, currentQuestion, draftAnswer.trim());
    setDraftAnswer('');
  };

  return (
    <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 fill-purple-300" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Question for Us Today</h3>
            <p className="text-[11px] text-slate-400">Blind Answer: Unlocks only when both answer</p>
          </div>
        </div>

        <Link
          href="/daily-spark"
          className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <span>All Answers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Question Title */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-100">
        <p className="font-bold text-sm text-slate-900 leading-snug">
          "{currentQuestion}"
        </p>
      </div>

      {/* Answers Section */}
      {bothAnswered ? (
        <div className="space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Unlock className="w-4 h-4 text-emerald-600" />
            <span>Both answered! Answers Unlocked 💕</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* My Answer */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">
                {activeProfile.name}’s Answer
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                "{myAnswer.content}"
              </p>
            </div>

            {/* Partner Answer */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">
                {partnerProfile.name}’s Answer
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                "{partnerAnswer.content}"
              </p>
            </div>
          </div>
        </div>
      ) : myAnswer ? (
        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-center space-y-2 animate-in fade-in">
          <div className="w-9 h-9 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center mx-auto text-sm">
            🔒
          </div>
          <h4 className="text-xs font-extrabold text-purple-900">Your Answer is Sealed!</h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            You answered: <span className="italic font-medium">"{myAnswer.content}"</span>
          </p>
          <div className="pt-2 text-[11px] text-purple-600 font-semibold flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Waiting for {partnerProfile.name} to answer to reveal both together!</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            required
            rows={2}
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            placeholder={`Type your honest answer as ${activeProfile.name}...`}
            className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-300 focus:outline-hidden bg-slate-50"
          />

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock In My Answer 🔒</span>
          </button>
        </form>
      )}
    </div>
  );
}
