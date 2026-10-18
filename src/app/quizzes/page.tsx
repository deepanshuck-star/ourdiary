'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, HeartHandshake, HelpCircle, Lock, MessageCircleHeart, RotateCcw, Sparkles, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  LOVE_LANGUAGE_LABELS,
  LOVE_LANGUAGE_QUESTIONS,
  YOU_OR_ME_QUESTIONS,
  answerQuestion,
  answeredCount,
  compareYouOrMe,
  emptyProgress,
  scoreLoveLanguages,
  summariseYouOrMe,
  type LoveLanguageChoice,
  type PartnerKey,
  type QuizProgress,
  type YouOrMeAnswer,
  type YouOrMePick,
} from '@/lib/features/quiz';

type QuizId = 'you-or-me' | 'love-language';

const EMPTY_YOM = emptyProgress<YouOrMeAnswer>(YOU_OR_ME_QUESTIONS.length);
const EMPTY_LOVE = emptyProgress<LoveLanguageChoice>(LOVE_LANGUAGE_QUESTIONS.length);

function useQuizProgress<T>(quiz: QuizId, coupleId: string, who: PartnerKey, empty: QuizProgress<T>) {
  return useLocalState<QuizProgress<T>>(`quiz:${quiz}:${coupleId}:${who}`, empty);
}

// ---------- Shared pieces ----------

function QuestionScreen({
  index,
  total,
  prompt,
  options,
  selected,
  onAnswer,
  onBack,
}: {
  index: number;
  total: number;
  prompt: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onAnswer: (value: string) => void;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={index === 0}
          className="min-h-11 inline-flex items-center gap-1.5 px-3 rounded-full text-sm font-semibold text-purple-800 hover:bg-purple-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
        <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
          Q{index + 1} of {total}
        </p>
      </div>
      <div
        className="h-2 rounded-full bg-purple-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-label="Quiz progress"
      >
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(index / total) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: reduce ? 0.15 : 0.25 }}
          className="space-y-5"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink leading-snug">{prompt}</h2>
          <div className="grid gap-3">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onAnswer(o.value)}
                aria-pressed={selected === o.value}
                className={`min-h-14 w-full px-5 py-3 rounded-full border-2 text-left text-base font-semibold transition-colors ${
                  selected === o.value
                    ? 'bg-primary border-primary text-on-primary shadow-cta'
                    : 'bg-surface border-purple-200 text-ink hover:border-primary hover:bg-purple-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function WaitingCard({
  partnerName,
  partnerId,
  partnerProgress,
  total,
  onRetake,
}: {
  partnerName: string;
  partnerId: PartnerKey;
  partnerProgress: number;
  total: number;
  onRetake: () => void;
}) {
  const { isLiveUser, switchProfile } = useDiary();
  return (
    <div className="text-center space-y-4 py-6">
      <span className="mx-auto w-14 h-14 rounded-full bg-purple-100 text-primary flex items-center justify-center">
        <Lock className="w-6 h-6" aria-hidden="true" />
      </span>
      <h2 className="font-display text-2xl font-semibold text-ink">Your answers are sealed</h2>
      <p className="text-sm text-ink-muted max-w-md mx-auto">
        Nothing is revealed until {partnerName} finishes too
        {partnerProgress > 0 ? ` — they’re on ${partnerProgress} of ${total}` : ''}. Then you’ll see them side by side.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {!isLiveUser && (
          <button
            type="button"
            onClick={() => switchProfile(partnerId)}
            className="min-h-11 px-5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold shadow-cta inline-flex items-center gap-2"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            Hand over to {partnerName}
          </button>
        )}
        <button
          type="button"
          onClick={onRetake}
          className="min-h-11 px-5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:bg-purple-50 inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Change my answers
        </button>
      </div>
    </div>
  );
}

function IntroCard({
  title,
  body,
  started,
  progress,
  total,
  onStart,
}: {
  title: string;
  body: string;
  started: boolean;
  progress: number;
  total: number;
  onStart: () => void;
}) {
  return (
    <div className="text-center space-y-4 py-6">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-muted max-w-md mx-auto leading-relaxed">{body}</p>
      <button
        type="button"
        onClick={onStart}
        className="min-h-12 px-6 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold shadow-cta"
      >
        {started ? `Pick up where you left off (${progress} of ${total})` : 'Start'}
      </button>
    </div>
  );
}

// ---------- You or me? ----------

function YouOrMeQuiz() {
  const { data, activeProfile, partnerProfile } = useDiary();
  const me = data.activeProfileId;
  const partner: PartnerKey = me === 'user_1' ? 'user_2' : 'user_1';
  const coupleId = data.couple.id;
  const [mine, setMine] = useQuizProgress<YouOrMeAnswer>('you-or-me', coupleId, me, EMPTY_YOM);
  const [theirs] = useQuizProgress<YouOrMeAnswer>('you-or-me', coupleId, partner, EMPTY_YOM);
  const [p1] = useQuizProgress<YouOrMeAnswer>('you-or-me', coupleId, 'user_1', EMPTY_YOM);
  const [p2] = useQuizProgress<YouOrMeAnswer>('you-or-me', coupleId, 'user_2', EMPTY_YOM);
  const [playing, setPlaying] = useState(false);
  const total = YOU_OR_ME_QUESTIONS.length;
  const names: Record<PartnerKey, string> = { user_1: data.couple.user1.name, user_2: data.couple.user2.name };

  if (mine.done && theirs.done) {
    const { inSync, toTalkAbout } = summariseYouOrMe(compareYouOrMe(p1.answers, p2.answers));
    const pickLabel = (p: YouOrMePick | null) => (p === null ? 'skipped' : p === 'both' ? 'both of you' : names[p]);
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Here’s how you see each other</h2>
          <p className="text-sm text-ink-muted max-w-lg mx-auto">
            No right answers here — just little windows into how you each see the two of you.
          </p>
        </div>

        {toTalkAbout.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <MessageCircleHeart className="w-5 h-5 text-primary" aria-hidden="true" />
              Things to talk about ({toTalkAbout.length})
            </h3>
            <ul className="space-y-2.5">
              {toTalkAbout.map((item) => (
                <li key={item.question} className="p-4 rounded-[1.25rem] bg-purple-50 border border-purple-100">
                  <p className="text-sm font-semibold text-ink">{item.question}</p>
                  <p className="text-xs text-ink-muted mt-1.5">
                    {names.user_1} thinks <strong className="text-ink">{pickLabel(item.user_1)}</strong> ·{' '}
                    {names.user_2} thinks <strong className="text-ink">{pickLabel(item.user_2)}</strong>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {inSync.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              You both said the same ({inSync.length})
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {inSync.map((item) => (
                <li key={item.question} className="p-4 rounded-[1.25rem] bg-surface border border-line">
                  <p className="text-sm text-ink">{item.question}</p>
                  <p className="text-xs font-semibold text-primary mt-1">{pickLabel(item.user_1)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMine(EMPTY_YOM);
              setPlaying(true);
            }}
            className="min-h-11 px-5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:bg-purple-50 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Retake my answers
          </button>
        </div>
      </div>
    );
  }

  if (mine.done) {
    return (
      <WaitingCard
        partnerName={partnerProfile.name}
        partnerId={partner}
        partnerProgress={answeredCount(theirs)}
        total={total}
        onRetake={() => {
          setMine({ ...mine, done: false, index: 0 });
          setPlaying(true);
        }}
      />
    );
  }

  if (!playing) {
    const progress = answeredCount(mine);
    return (
      <IntroCard
        title={`You or me, ${activeProfile.name}?`}
        body={`Twelve “who’s more likely to…” questions. Answer honestly for yourself — ${partnerProfile.name} does the same, and you only see each other’s answers once you’ve both finished.`}
        started={progress > 0}
        progress={progress}
        total={total}
        onStart={() => setPlaying(true)}
      />
    );
  }

  return (
    <QuestionScreen
      index={mine.index}
      total={total}
      prompt={YOU_OR_ME_QUESTIONS[mine.index]}
      options={[
        { value: 'me', label: 'Me' },
        { value: 'partner', label: partnerProfile.name },
        { value: 'both', label: 'Both of us' },
      ]}
      selected={mine.answers[mine.index]}
      onAnswer={(v) => setMine(answerQuestion(mine, mine.index, v as YouOrMeAnswer))}
      onBack={() => setMine({ ...mine, index: Math.max(0, mine.index - 1) })}
    />
  );
}

// ---------- Love languages ----------

function LoveLanguageRanking({ name, choices }: { name: string; choices: (LoveLanguageChoice | null)[] }) {
  const ranked = scoreLoveLanguages(choices);
  const max = Math.max(1, ...ranked.map((r) => r.score));
  return (
    <div className="p-5 rounded-[1.25rem] bg-surface border border-line space-y-4">
      <h3 className="font-display text-xl font-semibold text-ink">{name}</h3>
      <ol className="space-y-3">
        {ranked.map((r, i) => (
          <li key={r.language} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className={i === 0 ? 'font-semibold text-ink' : 'text-ink'}>
                {i + 1}. {LOVE_LANGUAGE_LABELS[r.language].name}
              </span>
              <span className="text-xs text-ink-muted">
                {r.score} of 4
              </span>
            </div>
            <div className="h-2 rounded-full bg-purple-100 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.score / max) * 100}%` }} />
            </div>
            {i === 0 && <p className="text-xs text-ink-muted">{LOVE_LANGUAGE_LABELS[r.language].blurb}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function LoveLanguageQuiz() {
  const { data, activeProfile, partnerProfile } = useDiary();
  const me = data.activeProfileId;
  const partner: PartnerKey = me === 'user_1' ? 'user_2' : 'user_1';
  const coupleId = data.couple.id;
  const [mine, setMine] = useQuizProgress<LoveLanguageChoice>('love-language', coupleId, me, EMPTY_LOVE);
  const [theirs] = useQuizProgress<LoveLanguageChoice>('love-language', coupleId, partner, EMPTY_LOVE);
  const [p1] = useQuizProgress<LoveLanguageChoice>('love-language', coupleId, 'user_1', EMPTY_LOVE);
  const [p2] = useQuizProgress<LoveLanguageChoice>('love-language', coupleId, 'user_2', EMPTY_LOVE);
  const [playing, setPlaying] = useState(false);
  const total = LOVE_LANGUAGE_QUESTIONS.length;

  const retake = () => {
    setMine(EMPTY_LOVE);
    setPlaying(true);
  };

  if (mine.done && theirs.done) {
    const top1 = scoreLoveLanguages(p1.answers)[0].language;
    const top2 = scoreLoveLanguages(p2.answers)[0].language;
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink">How you each feel loved</h2>
          <p className="text-sm text-ink-muted max-w-lg mx-auto">
            {top1 === top2
              ? `You share a top love language: ${LOVE_LANGUAGE_LABELS[top1].name.toLowerCase()}.`
              : `${data.couple.user1.name} lights up with ${LOVE_LANGUAGE_LABELS[top1].name.toLowerCase()}; ${data.couple.user2.name} with ${LOVE_LANGUAGE_LABELS[top2].name.toLowerCase()}. Try speaking each other’s this week.`}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <LoveLanguageRanking name={data.couple.user1.name} choices={p1.answers} />
          <LoveLanguageRanking name={data.couple.user2.name} choices={p2.answers} />
        </div>
        <div className="text-center">
          <button
            type="button"
            onClick={retake}
            className="min-h-11 px-5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:bg-purple-50 inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Retake my quiz
          </button>
        </div>
      </div>
    );
  }

  if (mine.done) {
    return (
      <div className="space-y-6">
        <WaitingCard
          partnerName={partnerProfile.name}
          partnerId={partner}
          partnerProgress={answeredCount(theirs)}
          total={total}
          onRetake={() => {
            setMine({ ...mine, done: false, index: 0 });
            setPlaying(true);
          }}
        />
        <div className="max-w-md mx-auto">
          <LoveLanguageRanking name={`Your results, ${activeProfile.name}`} choices={mine.answers} />
        </div>
      </div>
    );
  }

  if (!playing) {
    const progress = answeredCount(mine);
    return (
      <IntroCard
        title="What makes you feel most loved?"
        body={`Ten quick this-or-that questions. Go with your gut. Once ${partnerProfile.name} has taken it too, you’ll see both of your love languages side by side.`}
        started={progress > 0}
        progress={progress}
        total={total}
        onStart={() => setPlaying(true)}
      />
    );
  }

  const q = LOVE_LANGUAGE_QUESTIONS[mine.index];
  return (
    <QuestionScreen
      index={mine.index}
      total={total}
      prompt={q.prompt}
      options={[
        { value: 'a', label: q.a.text },
        { value: 'b', label: q.b.text },
      ]}
      selected={mine.answers[mine.index]}
      onAnswer={(v) => setMine(answerQuestion(mine, mine.index, v as LoveLanguageChoice))}
      onBack={() => setMine({ ...mine, index: Math.max(0, mine.index - 1) })}
    />
  );
}

// ---------- Page ----------

const TABS: { id: QuizId; label: string; icon: typeof HelpCircle }[] = [
  { id: 'you-or-me', label: 'You or me?', icon: HelpCircle },
  { id: 'love-language', label: 'Love languages', icon: HeartHandshake },
];

export default function QuizzesPage() {
  const { data, isHydrated, activeProfile } = useDiary();
  const [tab, setTab] = useLocalState<QuizId>(`quiz-tab:${data.couple.id}`, 'you-or-me');

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl mx-auto">
        <header className="rounded-[1.5rem] bg-hero px-6 py-8 sm:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-purple-800">Couple quizzes</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">Get to know each other, again</h1>
          <p className="text-sm text-slate-700 mt-2">
            Answering as <strong className="font-semibold text-ink">{activeProfile.name}</strong>. Progress saves as you
            go on this device.
          </p>
        </header>

        <div className="flex gap-2" role="tablist" aria-label="Quizzes">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`min-h-11 px-5 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                  active ? 'bg-primary text-on-primary shadow-cta' : 'bg-surface border border-line text-ink hover:bg-purple-50'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        <section role="tabpanel" className="rounded-[1.25rem] bg-surface border border-line p-6 sm:p-8 shadow-card">
          {!isHydrated ? (
            <div className="h-64 rounded-2xl bg-purple-50 animate-pulse" />
          ) : tab === 'you-or-me' ? (
            <YouOrMeQuiz key={`yom-${data.activeProfileId}`} />
          ) : (
            <LoveLanguageQuiz key={`love-${data.activeProfileId}`} />
          )}
        </section>
      </div>
    </AppShell>
  );
}
