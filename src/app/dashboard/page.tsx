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
  ArrowRight,
  Shuffle,
  Flame,
  Award,
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

type Ritual = {
  key: string;
  title: string;
  status: string;
  done: boolean;
  href: string;
  action: string;
};

function RitualCard({ ritual, index }: { ritual: Ritual; index: number }) {
  return (
    <div className="relative rounded-xl bg-surface border border-line p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-3xl font-semibold text-primary tabular-nums leading-none">
          {String(index + 1).padStart(2, '0')}
        </span>
        {ritual.done && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold">
            <Check className="w-3 h-3" strokeWidth={3} />
            done
          </span>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-ink">{ritual.title}</h3>
        <p className="text-xs text-ink-muted mt-1">{ritual.status}</p>
      </div>
      <Link
        href={ritual.href}
        className={`self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
          ritual.done
            ? 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            : 'bg-primary hover:bg-primary-hover text-on-primary shadow-cta'
        }`}
      >
        <span>{ritual.action}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-semibold text-ink mb-4">{children}</h2>;
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
      title: 'answer today’s question',
      status: iAnswered && partnerAnswered
        ? 'you both answered — read them together'
        : iAnswered
        ? `sealed until ${partnerProfile.name} answers`
        : partnerAnswered
        ? `${partnerProfile.name} answered — your turn`
        : 'two minutes, just for the two of you',
      done: iAnswered,
      href: '#todays-question',
      action: iAnswered ? 'view' : 'answer',
    },
    {
      key: 'mood',
      title: 'check in with each other',
      status: myMood
        ? `${MOOD_CONFIG[myMood.mood].label.toLowerCase()}${sharedMoodToday ? '' : ' · from earlier'}`
        : `let ${partnerProfile.name} know how you are`,
      done: sharedMoodToday,
      href: '#mood',
      action: sharedMoodToday ? 'update' : 'check in',
    },
    {
      key: 'milestone',
      title: nextMilestone ? nextMilestone.label.toLowerCase() : 'every milestone reached',
      status: nextMilestone
        ? `${nextMilestone.daysLeft} days to go · ${formatDate(nextMilestone.targetDate)}`
        : 'you’ve celebrated every milestone on the list',
      done: !nextMilestone,
      href: '/our-stats',
      action: 'see all',
    },
  ];
  const ritualsDone = rituals.filter((r) => r.done).length;

  // Context chips — only real numbers from this couple's diary.
  const chips = [
    `${daysTogether} days together`,
    `${totalMemories} ${totalMemories === 1 ? 'memory' : 'memories'}`,
    `${totalPhotos} ${totalPhotos === 1 ? 'photo' : 'photos'}`,
    `year ${anniversaryInfo.yearsCount}`,
  ];

  return (
    <AppShell>
      <IncomingHeartbeatAlert />
      <div className="space-y-10 animate-in fade-in duration-300">
        {/* Header with a soft sunrise glow behind it */}
        <header className="relative isolate px-1 pt-6 pb-2 sm:pt-10">
          <div aria-hidden="true" className="absolute -inset-x-6 -inset-y-10 -z-10 bg-glow pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <img
                    src={data.couple.user1.avatar}
                    alt={data.couple.user1.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-canvas"
                  />
                  <img
                    src={data.couple.user2.avatar}
                    alt={data.couple.user2.name}
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-canvas"
                  />
                </div>
                <p className="text-sm text-ink-muted">
                  hi <strong className="font-semibold text-ink">{activeProfile.name.toLowerCase()}</strong> · {data.couple.name}
                </p>
              </div>
              <h1 className="text-4xl sm:text-6xl font-semibold text-ink leading-[1.05]">
                day {daysTogether} of us
              </h1>
              <ul className="flex flex-wrap gap-2" aria-label="Your diary at a glance">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className="px-3 py-1 rounded-full bg-surface/80 border border-line text-xs font-semibold text-slate-700"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <Link
                href="/memories/new"
                className="flex-1 md:flex-none whitespace-nowrap px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-sm shadow-cta transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>add a memory</span>
              </Link>
              <Link
                href="/journey"
                className="flex-1 md:flex-none whitespace-nowrap px-5 py-2.5 rounded-full bg-surface hover:bg-purple-50 text-ink font-semibold text-sm border border-line transition-colors flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-primary" />
                <span>our journey</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Today's rituals — three columns on desktop, stacked on mobile */}
        <section aria-labelledby="rituals-heading">
          <div className="flex items-end justify-between gap-4 mb-4">
            <h2 id="rituals-heading" className="text-2xl font-semibold text-ink">
              today’s rituals
            </h2>
            <span className="text-xs font-semibold text-ink-muted">
              {isHydrated ? `${ritualsDone} of ${rituals.length} done` : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isHydrated
              ? rituals.map((r, i) => <RitualCard key={r.key} ritual={r} index={i} />)
              : [0, 1, 2].map((i) => <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        </section>

        {/* Locked notes your partner chose to let you know about */}
        {lockedNoteTeasers.length > 0 && (
          <div className="p-5 rounded-xl bg-surface border border-line">
            <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              locked notes waiting for you ({lockedNoteTeasers.length})
            </h3>
            <div className="space-y-2">
              {lockedNoteTeasers.map(({ note, memory }) => (
                <Link
                  key={note.id}
                  href={`/memories/${memory.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
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

        {/* Check in + today’s question */}
        <section className="space-y-4">
          <div id="mood" className="scroll-mt-24">
            <MoodBeaconBanner />
          </div>
          <div id="todays-question" className="scroll-mt-24">
            <DailyQuestionCard />
          </div>
        </section>

        {/* Remember */}
        <section>
          <SectionLabel>moments worth keeping</SectionLabel>
          <div className="space-y-4">
            <OnThisDayCard />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
              <div className="lg:col-span-3 rounded-xl bg-surface border border-line p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                    <h3 className="font-display text-lg font-semibold text-ink">from your memory lane</h3>
                    <button
                      type="button"
                      onClick={handleShuffleMemory}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>shuffle</span>
                    </button>
                  </div>

                  {randomMemory ? (
                    <div className="flex flex-col sm:flex-row gap-5">
                      {randomMemory.photos?.[0] && (
                        <div className="sm:w-2/5 h-48 rounded-lg overflow-hidden relative group">
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
                          <blockquote className="p-3 rounded-lg bg-purple-50 border-l-2 border-primary text-xs text-purple-900 italic">
                            &ldquo;{randomMemory.perspectives[activeProfile.id]}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 px-4 text-center space-y-3 rounded-lg border border-dashed border-purple-200">
                      <div>
                        <h4 className="font-display text-lg font-semibold text-ink">your diary is ready</h4>
                        <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
                          a fresh, private space for the two of you. start with a first date, a trip or a quiet night in.
                        </p>
                      </div>
                      <Link
                        href="/memories/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-cta transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>add your first memory</span>
                      </Link>
                    </div>
                  )}
                </div>

                {randomMemory && (
                  <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Smile className="w-4 h-4 text-primary" />
                      <span>mood: <strong className="font-semibold text-ink">{randomMemory.mood}</strong></span>
                    </div>
                    <Link
                      href={`/memories/${randomMemory.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      <span>open memory & notes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Memories */}
              <div className="lg:col-span-2 rounded-xl bg-surface border border-line p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-3">
                  <h3 className="font-display text-lg font-semibold text-ink">recently added</h3>
                  <Link href="/memories" className="text-xs font-semibold text-primary hover:text-primary-hover">
                    view all ({totalMemories})
                  </Link>
                </div>

                <div className="space-y-1">
                  {recentMemories.length > 0 ? (
                    recentMemories.map((mem) => (
                      <Link
                        key={mem.id}
                        href={`/memories/${mem.id}`}
                        className="flex items-center gap-3.5 p-2.5 rounded-lg hover:bg-purple-50 transition-colors group"
                      >
                        {mem.photos?.[0] ? (
                          <img
                            src={mem.photos[0].url}
                            alt={mem.title}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-purple-100 text-primary flex items-center justify-center flex-shrink-0">
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
                      <p>no memories yet.</p>
                      <Link href="/memories/new" className="text-primary hover:text-primary-hover font-semibold underline inline-block">
                        add your first memory
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Plan & play */}
        <section>
          <SectionLabel>plan &amp; play</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/spin-wheel"
                  className="p-5 rounded-xl bg-surface border border-line hover:border-purple-300 transition-colors group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-lg bg-purple-50 text-primary flex items-center justify-center flex-shrink-0">
                    <Dices className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">spin the date wheel</h4>
                    <p className="text-xs text-ink-muted mt-0.5">let the wheel pick tonight’s plan</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/coupons"
                  className="p-5 rounded-xl bg-surface border border-line hover:border-purple-300 transition-colors group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">love coupons</h4>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {data.loveCoupons?.filter((c) => !c.redeemed).length || 0} ready to redeem
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                </Link>
              </div>

              {/* Upcoming Calendar Events */}
              <div className="rounded-xl bg-surface border border-line p-6">
                <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h3 className="font-display text-lg font-semibold text-ink">coming up</h3>
                  </div>
                  <Link href="/calendar" className="text-xs font-semibold text-primary hover:text-primary-hover">
                    open calendar
                  </Link>
                </div>

                <div className="space-y-3">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-lg bg-slate-50 border border-line flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 lowercase">
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
                      nothing planned yet — pick a date together.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <CassettePlayerWidget />

              {/* Relationship Milestones */}
              <div className="rounded-xl bg-surface border border-line p-6 flex flex-col">
                <div className="flex items-center gap-2 pb-4 border-b border-line mb-4">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-ink">milestones</h3>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-80 pr-1">
                  {milestones.slice(0, 5).map((m) => (
                    <div
                      key={m.days}
                      className={`p-3 rounded-lg border ${
                        m.reached ? 'bg-purple-50 border-purple-100' : 'bg-surface border-line'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-ink">{m.label}</span>
                        {m.reached ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                            celebrated
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-ink-muted">in {m.daysLeft} days</span>
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
                  <span>all milestones & stats</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Invite code (live couples only) */}
        {isLiveUser && (
          <section className="p-5 sm:p-6 rounded-xl bg-surface border border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-purple-50 text-primary flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">your couple invite code</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold">
                    active
                  </span>
                </div>
                <p className="text-xs text-ink-muted mt-0.5 max-w-xl">
                  share it with your partner to join. if it was exposed, regenerate it to retire the old code for good.
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
                <span>regenerate</span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Regenerate Couple Invite Code Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">regenerate your invite code?</h3>
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
                cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                className="flex-1 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-cta transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRegenerating ? 'regenerating…' : 'delete & regenerate'}
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
          <span className="hidden xs:inline">send love</span>
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
