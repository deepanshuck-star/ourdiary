'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import {
  calculateDaysTogether,
  calculateNextAnniversary,
  formatDate,
  getMilestones,
  getNow,
} from '@/lib/date-utils';
import {
  Heart,
  PlusCircle,
  Compass,
  CalendarDays,
  Image as GalleryIcon,
  ArrowRight,
  Shuffle,
  Flame,
  Award,
  Clock,
  MapPin,
  Calendar,
  Smile,
  ChevronRight,
  Lock,
  Key,
  Copy,
  RefreshCw,
  Check,
  Dices,
  Ticket,
} from 'lucide-react';
import { MoodBeaconBanner, MOOD_CONFIG } from '@/components/widgets/MoodBeaconBanner';
import { IncomingHeartbeatAlert } from '@/components/widgets/IncomingHeartbeatAlert';
import { HeartbeatLovePingModal } from '@/components/widgets/HeartbeatLovePingModal';
import { OnThisDayCard } from '@/components/widgets/OnThisDayCard';
import { DailyQuestionCard } from '@/components/widgets/DailyQuestionCard';
import { CassettePlayerWidget } from '@/components/widgets/CassettePlayerWidget';
import { CoupleStreakChip } from '@/components/widgets/CoupleStreakChip';
import { MoodHistoryRecorder } from '@/components/widgets/MoodHistoryRecorder';

type Ritual = {
  key: string;
  title: string;
  status: string;
  done: boolean;
  href: string;
  action: string;
};

function TodayRitualRow({ ritual }: { ritual: Ritual }) {
  return (
    <li className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
          ritual.done
            ? 'bg-primary border-primary text-on-primary'
            : 'bg-surface border-purple-200 text-primary'
        }`}
        aria-hidden="true"
      >
        {ritual.done ? <Check className="w-4 h-4" strokeWidth={3} /> : <Heart className="w-4 h-4" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{ritual.title}</p>
        <p className="text-xs text-ink-muted truncate">{ritual.status}</p>
      </div>
      <Link
        href={ritual.href}
        className="text-xs font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 flex-shrink-0"
      >
        <span>{ritual.action}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </li>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

export default function DashboardPage() {
  const {
    data,
    activeProfile,
    partnerProfile,
    isLiveUser,
    isHydrated,
    regenerateCoupleCode,
    showToast,
  } = useDiary();
  const [randomMemoryIndex, setRandomMemoryIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showHeartbeatModal, setShowHeartbeatModal] = useState(false);

  const handleCopyCode = () => {
    if (data.couple.inviteCode) {
      navigator.clipboard.writeText(data.couple.inviteCode);
      showToast('Couple invite code copied to clipboard! 📋', 'success');
    }
  };

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateCoupleCode();
      setShowRegenModal(false);
    } catch {
      showToast('Failed to regenerate code', 'warn');
    } finally {
      setIsRegenerating(false);
    }
  };

  const daysTogether = calculateDaysTogether(data.couple.startDate);
  const anniversaryInfo = calculateNextAnniversary(data.couple.anniversaryDate || data.couple.startDate);
  const totalMemories = data.memories.length;
  const totalPhotos = data.memories.reduce((acc, m) => acc + (m.photos?.length || 0), 0);
  const milestones = getMilestones(data.couple.startDate);
  const nextMilestone = milestones.find((m) => !m.reached);

  // Pick random memory
  const randomMemory = data.memories.length > 0
    ? data.memories[randomMemoryIndex % data.memories.length]
    : null;

  const handleShuffleMemory = () => {
    if (data.memories.length > 1) {
      let nextIndex = Math.floor(Math.random() * data.memories.length);
      if (nextIndex === randomMemoryIndex) {
        nextIndex = (nextIndex + 1) % data.memories.length;
      }
      setRandomMemoryIndex(nextIndex);
    }
  };

  // Recent 3 memories
  const recentMemories = data.memories.slice(0, 3);

  // Locked notes the partner opted to surface here. Content is masked
  // server-side, so this list only ever contains the existence + memory,
  // never the text — nothing to leak even if this array is wrong.
  const lockedNoteTeasers = data.memories.flatMap((m) =>
    (m.notes || [])
      .filter((n) => n.visibility === 'private' && n.authorId !== activeProfile.id && n.visibleWhenLocked)
      .map((n) => ({ note: n, memory: m }))
  );

  // Upcoming 3 events
  const upcomingEvents = data.events
    .filter((e) => new Date(e.date).getTime() >= getNow().setHours(0, 0, 0, 0))
    .slice(0, 3);

  // Today's rituals — read-only summaries of state the widgets below already manage.
  const partnerId = data.activeProfileId === 'user_1' ? 'user_2' : 'user_1';
  const now = getNow();
  const todayStr = now.toISOString().split('T')[0];
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  const todaySpark = data.dailySparkAnswers?.find(
    (a) => a.questionId === `q_day_${dayOfYear}` || a.date === todayStr
  );
  const iAnswered = !!todaySpark?.answers?.[data.activeProfileId];
  const partnerAnswered = !!todaySpark?.answers?.[partnerId];
  const myMood = data.moodBeacons?.[data.activeProfileId];
  const sharedMoodToday = !!myMood && myMood.updatedAt?.startsWith(todayStr);

  const rituals: Ritual[] = [
    {
      key: 'spark',
      title: 'Answer today’s question',
      status: iAnswered && partnerAnswered
        ? 'You both answered — read them together'
        : iAnswered
        ? `Sealed. It opens when ${partnerProfile.name} answers`
        : partnerAnswered
        ? `${partnerProfile.name} has answered — your turn`
        : 'A two-minute question for the two of you',
      done: iAnswered,
      href: '#todays-question',
      action: iAnswered ? 'View' : 'Answer',
    },
    {
      key: 'mood',
      title: 'Share how you feel',
      status: myMood ? `${MOOD_CONFIG[myMood.mood].label}${sharedMoodToday ? '' : ' · from earlier'}` : `Let ${partnerProfile.name} know where you are today`,
      done: sharedMoodToday,
      href: '#mood',
      action: sharedMoodToday ? 'Update' : 'Check in',
    },
    {
      key: 'milestone',
      title: nextMilestone ? nextMilestone.label : 'Every milestone reached',
      status: nextMilestone
        ? `${nextMilestone.daysLeft} days to go · ${formatDate(nextMilestone.targetDate)}`
        : 'You have celebrated every milestone on the list',
      done: !nextMilestone,
      href: '/our-stats',
      action: 'See all',
    },
  ];
  const ritualsDone = rituals.filter((r) => r.done).length;

  return (
    <AppShell>
      <IncomingHeartbeatAlert />
      <MoodHistoryRecorder />
      <div className="space-y-10 animate-in fade-in duration-300">
        {/* Couple header — pillow-shaped section break */}
        <header className="relative rounded-pillow overflow-hidden bg-hero px-6 py-8 sm:px-10 sm:py-10">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="relative flex items-center flex-shrink-0">
                <img
                  src={data.couple.user1.avatar}
                  alt={data.couple.user1.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-surface shadow-cta z-10"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30 bg-surface rounded-full p-1.5 shadow-sm">
                  <Heart className="w-4 h-4 text-primary fill-primary" />
                </div>
                <img
                  src={data.couple.user2.avatar}
                  alt={data.couple.user2.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-surface shadow-cta -ml-4 z-20"
                />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-800">
                  {data.couple.name}
                </p>
                <h1 className="text-3xl sm:text-5xl font-semibold text-ink leading-tight">
                  Day {daysTogether} together
                </h1>
                <p className="text-sm text-slate-700 mt-1.5">
                  Viewing as <strong className="font-semibold text-ink">{activeProfile.name}</strong>
                  <span aria-hidden="true"> · </span>
                  Year {anniversaryInfo.yearsCount} of your story
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <Link
                href="/memories/new"
                className="flex-1 md:flex-none whitespace-nowrap px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm shadow-cta transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add a memory</span>
              </Link>
              <Link
                href="/journey"
                className="flex-1 md:flex-none whitespace-nowrap px-5 py-2.5 rounded-full bg-surface/90 hover:bg-surface text-ink font-semibold text-sm border border-line transition-colors flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-primary" />
                <span>Our journey</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Today — the dominant card */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-labelledby="today-heading">
          <div className="lg:col-span-2 rounded-[1.5rem] bg-surface border border-line p-6 sm:p-8 shadow-card">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {isHydrated ? formatDate(todayStr) : 'Today'}
                </p>
                <h2 id="today-heading" className="text-3xl font-semibold text-ink">Today</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold">
                {isHydrated ? `${ritualsDone} of ${rituals.length} done` : '—'}
              </span>
            </div>
            <CoupleStreakChip />
            {isHydrated ? (
              <ul className="divide-y divide-line">
                {rituals.map((r) => (
                  <TodayRitualRow key={r.key} ritual={r} />
                ))}
              </ul>
            ) : (
              <div className="h-40 rounded-2xl bg-slate-50 animate-pulse" />
            )}
          </div>

          <div className="rounded-[1.5rem] bg-purple-50 border border-purple-100 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="flex items-center gap-2 text-purple-800">
              <Clock className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Next anniversary</span>
            </div>
            <div>
              <p className="font-display text-6xl font-semibold text-ink leading-none">{anniversaryInfo.daysLeft}</p>
              <p className="text-sm text-slate-700 mt-2">
                days until year {anniversaryInfo.yearsCount + 1}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHeartbeatModal(true)}
              className="w-full px-4 py-2.5 rounded-full bg-surface border border-purple-200 text-purple-800 hover:bg-purple-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              <span>Send a love ping</span>
            </button>
          </div>
        </section>

        {/* Locked notes your partner chose to let you know about */}
        {lockedNoteTeasers.length > 0 && (
          <div className="p-5 rounded-[1.5rem] bg-surface border border-line">
            <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-[0.14em] mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Locked notes waiting for you ({lockedNoteTeasers.length})
            </h3>
            <div className="space-y-2">
              {lockedNoteTeasers.map(({ note, memory }) => (
                <Link
                  key={note.id}
                  href={`/memories/${memory.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-purple-50 border border-purple-100 hover:border-purple-300 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-700">
                    {partnerProfile.name} left a locked note on &ldquo;{memory.title}&rdquo;. Only they can unlock it.
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stay close — colour-blocked section */}
        <section className="rounded-[2rem] bg-purple-100/60 p-5 sm:p-8">
          <SectionHeading eyebrow="Stay close" title="Check in with each other" />
          <div className="space-y-5">
            <div id="mood" className="scroll-mt-24">
              <MoodBeaconBanner />
            </div>
            <div id="todays-question" className="scroll-mt-24">
              <DailyQuestionCard />
            </div>
          </div>
        </section>

        {/* At a glance */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Days together', value: daysTogether, icon: Flame },
            { label: 'Anniversary in', value: anniversaryInfo.daysLeft, suffix: 'days', icon: Clock },
            { label: 'Memories', value: totalMemories, icon: Heart },
            { label: 'Photos kept', value: totalPhotos, icon: GalleryIcon },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-5 rounded-[1.25rem] bg-surface border border-line flex flex-col gap-3">
                <span className="w-9 h-9 rounded-full bg-purple-50 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-display text-3xl font-semibold text-ink leading-none">
                    {s.value}
                    {s.suffix && <span className="font-sans text-xs font-medium text-ink-muted ml-1">{s.suffix}</span>}
                  </p>
                  <p className="text-xs font-medium text-ink-muted mt-1.5">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Remember — colour-blocked section */}
        <section className="rounded-[2rem] bg-rose-50 p-5 sm:p-8">
          <SectionHeading eyebrow="Remember" title="Moments worth keeping" />
          <div className="space-y-5">
            <OnThisDayCard />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              <div className="lg:col-span-3 rounded-[1.25rem] bg-surface border border-line p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                    <h3 className="font-display text-lg font-semibold text-ink">From your memory lane</h3>
                    <button
                      type="button"
                      onClick={handleShuffleMemory}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle</span>
                    </button>
                  </div>

                  {randomMemory ? (
                    <div className="flex flex-col sm:flex-row gap-5">
                      {randomMemory.photos?.[0] && (
                        <div className="sm:w-2/5 h-48 rounded-2xl overflow-hidden relative group">
                          <img
                            src={randomMemory.photos[0].url}
                            alt={randomMemory.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 text-snow text-[10px] font-semibold backdrop-blur-xs">
                            {randomMemory.category}
                          </div>
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(randomMemory.date)}</span>
                          <span aria-hidden="true">·</span>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{randomMemory.location}</span>
                        </div>

                        <h4 className="font-display text-xl font-semibold text-ink">{randomMemory.title}</h4>
                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                          {randomMemory.description}
                        </p>

                        {randomMemory.perspectives?.[activeProfile.id] && (
                          <blockquote className="p-3 rounded-xl bg-purple-50 border-l-2 border-primary text-xs text-purple-900 italic">
                            &ldquo;{randomMemory.perspectives[activeProfile.id]}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 px-4 text-center space-y-3 rounded-2xl border border-dashed border-purple-200">
                      <div>
                        <h4 className="font-display text-lg font-semibold text-ink">Your diary is ready</h4>
                        <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
                          A fresh, private space for the two of you. Start with a first date, a trip or a quiet evening in.
                        </p>
                      </div>
                      <Link
                        href="/memories/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-cta transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add your first memory</span>
                      </Link>
                    </div>
                  )}
                </div>

                {randomMemory && (
                  <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Smile className="w-4 h-4 text-primary" />
                      <span>Mood: <strong className="capitalize font-semibold text-ink">{randomMemory.mood}</strong></span>
                    </div>
                    <Link
                      href={`/memories/${randomMemory.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      <span>Open memory & notes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Memories */}
              <div className="lg:col-span-2 rounded-[1.25rem] bg-surface border border-line p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-3">
                  <h3 className="font-display text-lg font-semibold text-ink">Recently added</h3>
                  <Link href="/memories" className="text-xs font-semibold text-primary hover:text-primary-hover">
                    View all ({totalMemories})
                  </Link>
                </div>

                <div className="space-y-1">
                  {recentMemories.length > 0 ? (
                    recentMemories.map((mem) => (
                      <Link
                        key={mem.id}
                        href={`/memories/${mem.id}`}
                        className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-purple-50 transition-colors group"
                      >
                        {mem.photos?.[0] ? (
                          <img
                            src={mem.photos[0].url}
                            alt={mem.title}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-purple-100 text-primary flex items-center justify-center flex-shrink-0">
                            <Heart className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-ink truncate group-hover:text-primary transition-colors">
                            {mem.title}
                          </h4>
                          <p className="text-xs text-ink-muted truncate">
                            {mem.category} · {formatDate(mem.date)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-ink-muted text-xs space-y-2">
                      <p>No memories yet.</p>
                      <Link href="/memories/new" className="text-primary hover:text-primary-hover font-semibold underline inline-block">
                        Add your first memory
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Play & plan — colour-blocked section */}
        <section className="rounded-[2rem] bg-slate-100 p-5 sm:p-8">
          <SectionHeading eyebrow="Play & plan" title="Something to look forward to" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/spin-wheel"
                  className="p-5 rounded-[1.25rem] bg-surface border border-line hover:border-purple-300 transition-colors group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0">
                    <Dices className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">Spin the date wheel</h4>
                    <p className="text-xs text-ink-muted mt-0.5">Let the wheel choose tonight’s plan</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/coupons"
                  className="p-5 rounded-[1.25rem] bg-surface border border-line hover:border-purple-300 transition-colors group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">Love coupons</h4>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {data.loveCoupons?.filter((c) => !c.redeemed).length || 0} ready to redeem
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                </Link>
              </div>

              {/* Upcoming Calendar Events */}
              <div className="rounded-[1.25rem] bg-surface border border-line p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h3 className="font-display text-lg font-semibold text-ink">Coming up</h3>
                  </div>
                  <Link href="/calendar" className="text-xs font-semibold text-primary hover:text-primary-hover">
                    Open calendar
                  </Link>
                </div>

                <div className="space-y-3">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-line flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wider">
                              {evt.category}
                            </span>
                            <span className="text-xs font-medium text-ink-muted">{formatDate(evt.date)}</span>
                          </div>
                          <h4 className="font-semibold text-sm text-ink mt-1">{evt.title}</h4>
                          {evt.description && (
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{evt.description}</p>
                          )}
                        </div>
                        {evt.time && (
                          <span className="text-xs font-semibold text-ink-muted px-2.5 py-1 rounded-full bg-surface border border-line flex-shrink-0">
                            {evt.time}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-ink-muted text-sm">
                      Nothing planned yet. Pick a date together.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <CassettePlayerWidget />

              {/* Relationship Milestones */}
              <div className="rounded-[1.25rem] bg-surface border border-line p-6 flex flex-col">
                <div className="flex items-center gap-2 pb-4 border-b border-line mb-4">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-ink">Milestones</h3>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-80 pr-1">
                  {milestones.slice(0, 5).map((m) => (
                    <div
                      key={m.days}
                      className={`p-3 rounded-2xl border ${
                        m.reached ? 'bg-purple-50 border-purple-100' : 'bg-surface border-line'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-ink">{m.label}</span>
                        {m.reached ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                            Celebrated
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-ink-muted">In {m.daysLeft} days</span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1">{formatDate(m.targetDate)}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/our-stats"
                  className="mt-4 pt-3 border-t border-line text-xs font-semibold text-primary hover:text-primary-hover flex items-center justify-between"
                >
                  <span>All milestones & stats</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Your space — invite code (live couples only) */}
        {isLiveUser && (
          <section className="p-5 sm:p-6 rounded-[1.5rem] bg-surface border border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Your couple invite code</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-semibold">
                    Active
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5 max-w-xl">
                  Share it with your partner to join. If it was exposed, regenerate it to retire the old code for good.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-slate-50 pl-4 pr-1.5 py-1.5 rounded-full border border-line flex-1 md:flex-none justify-between md:justify-start">
                <span className="font-mono font-semibold text-primary text-sm tracking-widest mr-3">
                  {data.couple.inviteCode || 'N/A'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy invite code"
                  aria-label="Copy invite code"
                  className="p-1.5 hover:bg-purple-100 rounded-full text-ink-muted hover:text-ink transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowRegenModal(true)}
                className="px-4 py-2 rounded-full bg-surface border border-line text-ink hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span>Regenerate</span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Regenerate Couple Invite Code Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-[1.5rem] p-6 max-w-md w-full shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">Regenerate your invite code?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                If your current code (<strong className="font-mono text-rose-600">{data.couple.inviteCode}</strong>) was exposed or shared by mistake, this permanently removes it and issues a new one.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="flex-1 py-2.5 rounded-full border border-line text-ink text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                className="flex-1 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-cta transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRegenerating ? 'Regenerating…' : 'Delete & regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating love ping */}
      <div className="fixed bottom-20 sm:bottom-8 right-5 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => setShowHeartbeatModal(true)}
          className="px-4 py-3 sm:px-5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs sm:text-sm shadow-cta hover:-translate-y-0.5 active:translate-y-0 transition-[background-color,transform] duration-200 flex items-center gap-2.5 ring-4 ring-canvas"
          title="Send a thinking-of-you love ping"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span className="hidden xs:inline">Send love</span>
          <span className="px-2 py-0.5 rounded-full bg-on-primary/15 text-[11px] font-semibold tracking-wide flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {data.heartbeatStreak || 1}d
          </span>
        </button>
      </div>

      <HeartbeatLovePingModal
        isOpen={showHeartbeatModal}
        onClose={() => setShowHeartbeatModal(false)}
      />
    </AppShell>
  );
}
