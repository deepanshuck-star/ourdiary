'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {Sparkles, Lock, Unlock, ArrowRight} from 'lucide-react';
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
      <div className="rounded-[1.25rem] bg-surface border border-line p-6 animate-pulse h-48" />
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
    <div className="rounded-[1.25rem] bg-surface border border-line p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-purple-50 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-ink leading-tight">Today’s question</h3>
            <p className="text-[11px] text-ink-muted">Answers open once you’ve both replied</p>
          </div>
        </div>

        <Link
          href="/daily-spark"
          className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
        >
          <span>All answers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Question Title */}
      <div className="px-5 py-6 rounded-2xl bg-purple-50">
        <p className="font-display italic text-xl sm:text-2xl text-ink leading-snug">
          "{currentQuestion}"
        </p>
      </div>

      {/* Answers Section */}
      {bothAnswered ? (
        <div className="space-y-3 animate-in fade-in">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-purple-800 bg-purple-50 px-3 py-1.5 rounded-full">
            <Unlock className="w-3.5 h-3.5 text-primary" />
            <span>You both answered</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* My Answer */}
            <div className="p-4 rounded-2xl bg-surface border border-line space-y-1">
              <span className="text-[10px] font-semibold uppercase text-purple-700 tracking-[0.12em]">
                {activeProfile.name}’s Answer
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                "{myAnswer.content}"
              </p>
            </div>

            {/* Partner Answer */}
            <div className="p-4 rounded-2xl bg-surface border border-line space-y-1">
              <span className="text-[10px] font-semibold uppercase text-rose-700 tracking-[0.12em]">
                {partnerProfile.name}’s Answer
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                "{partnerAnswer.content}"
              </p>
            </div>
          </div>
        </div>
      ) : myAnswer ? (
        <div className="p-5 rounded-2xl border border-dashed border-purple-200 text-center space-y-2 animate-in fade-in">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-primary flex items-center justify-center mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="font-display text-base font-semibold text-ink">Your answer is sealed</h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            You answered: <span className="italic font-medium">"{myAnswer.content}"</span>
          </p>
          <div className="pt-1 text-xs text-purple-700 font-medium">
            <span>It opens as soon as {partnerProfile.name} answers.</span>
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
            className="w-full p-3.5 rounded-2xl border border-line text-sm focus:ring-2 focus:ring-focus focus:outline-hidden bg-canvas placeholder:text-ink-muted"
          />

          <button
            type="submit"
            className="w-full py-3 px-4 font-semibold text-sm transition-colors flex items-center justify-center gap-2 active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock in my answer</span>
          </button>
        </form>
      )}
    </div>
  );
}
