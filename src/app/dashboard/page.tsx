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
  UserMinus,
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
import { GoodMorningHandoff } from '@/components/widgets/GoodMorningHandoff';
import { DistanceCounter } from '@/components/widgets/DistanceCounter';
import { MoodHistoryRecorder } from '@/components/widgets/MoodHistoryRecorder';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, Chip, SectionHeader } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';

type Ritual = {
  key: string;
  title: string;
  status: string;
  done: boolean;
  href: string;
  action: string;
};

/** A band of near-nothing: it groups without drawing a box around itself. */
const SECTION_BAND = 'rounded-[2rem] bg-ink/[0.03] p-5 sm:p-8';

function TodayRitualRow({ ritual }: { ritual: Ritual }) {
  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
          ritual.done
            ? 'bg-beam shadow-cta'
            : 'bg-ink/5 border border-line text-primary'
        )}
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

export default function DashboardPage() {
  const {
    data,
    activeProfile,
    partnerProfile,
    isLiveUser,
    isHydrated,
    regenerateCoupleCode,
    removePartner,
    isCoupleCreator,
    showToast,
  } = useDiary();
  const [randomMemoryIndex, setRandomMemoryIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
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
    } catch (err: any) {
      // Say what the server actually refused. The old code swallowed this
      // and claimed success, which is how a code could appear on screen
      // that the database had never stored.
      showToast(err?.message || 'Failed to regenerate code', 'warn');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConfirmRemovePartner = async () => {
    setIsRemoving(true);
    try {
      await removePartner(true);
      setShowRemoveModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Could not remove your partner', 'warn');
    } finally {
      setIsRemoving(false);
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
        {/* Couple header — the title floats on the dark, lit only by a bloom */}
        <header className="relative rounded-pillow overflow-hidden bg-glow px-2 py-6 sm:px-6 sm:py-10">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="relative flex items-center flex-shrink-0">
                <img
                  src={data.couple.user1.avatar}
                  alt={data.couple.user1.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-1 ring-ink/15 shadow-card z-10"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30 bg-surface rounded-full p-1.5 shadow-cta">
                  <Heart className="w-4 h-4 text-primary fill-primary" />
                </div>
                <img
                  src={data.couple.user2.avatar}
                  alt={data.couple.user2.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-1 ring-ink/15 shadow-card -ml-4 z-20"
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  {data.couple.name}
                </p>
                <h1 className="font-display text-4xl sm:text-6xl font-normal tracking-tight text-ink leading-[1.05] mt-2">
                  Day {daysTogether} together
                </h1>
                <p className="text-sm text-ink-muted mt-3">
                  Viewing as <strong className="font-semibold text-ink">{activeProfile.name}</strong>
                  <span aria-hidden="true"> · </span>
                  Year {anniversaryInfo.yearsCount} of your story
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <ButtonLink
                href="/memories/new"
                variant="primary"
                className="flex-1 md:flex-none whitespace-nowrap"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add a memory</span>
              </ButtonLink>
              <ButtonLink
                href="/journey"
                variant="outline"
                className="flex-1 md:flex-none whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-primary" />
                <span>Our journey</span>
              </ButtonLink>
            </div>
          </div>
        </header>

        {/* Only appears when one of you is awake into the other's night. */}
        <GoodMorningHandoff />

        <DistanceCounter />

        {/* Today — the dominant card */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-labelledby="today-heading">
          <Card as="div" className="lg:col-span-2 p-6 sm:p-8">
            <SectionHeader
              id="today-heading"
              eyebrow={isHydrated ? formatDate(todayStr) : 'Today'}
              title="Today"
              actions={<Chip tone="muted">{isHydrated ? `${ritualsDone} of ${rituals.length} done` : '—'}</Chip>}
              className="mb-6"
            />
            <CoupleStreakChip />
            {isHydrated ? (
              <ul className="divide-y divide-line">
                {rituals.map((r) => (
                  <TodayRitualRow key={r.key} ritual={r} />
                ))}
              </ul>
            ) : (
              <div className="h-40 rounded-2xl bg-ink/5 animate-pulse" />
            )}
          </Card>

          {/* The one lit object on the page: a huge thin numeral in a glowing well. */}
          <Card tone="glow" className="p-6 sm:p-8 flex flex-col justify-between gap-8">
            <div className="flex items-center gap-2 text-ink-muted">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Next anniversary</span>
            </div>
            <div>
              <p className="font-display text-7xl sm:text-8xl font-light text-ink leading-none tracking-tight">
                {anniversaryInfo.daysLeft}
              </p>
              <p className="text-sm text-ink-muted mt-3">
                days until year {anniversaryInfo.yearsCount + 1}
              </p>
            </div>
            <Button variant="outline" block onClick={() => setShowHeartbeatModal(true)}>
              <Heart className="w-4 h-4 text-primary" />
              <span>Send a love ping</span>
            </Button>
          </Card>
        </section>

        {/* Locked notes your partner chose to let you know about */}
        {lockedNoteTeasers.length > 0 && (
          <Card className="p-5">
            <h3 className="text-[11px] font-semibold text-primary uppercase tracking-[0.22em] mb-4 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Locked notes waiting for you ({lockedNoteTeasers.length})
            </h3>
            <div className="space-y-2">
              {lockedNoteTeasers.map(({ note, memory }) => (
                <Link
                  key={note.id}
                  href={`/memories/${memory.id}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-canvas border border-line lift"
                >
                  <div className="w-9 h-9 rounded-full bg-beam flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-ink-muted">
                    {partnerProfile.name} left a locked note on &ldquo;{memory.title}&rdquo;. Only they can unlock it.
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        )}

        {/* Stay close */}
        <section className={SECTION_BAND}>
          <SectionHeader eyebrow="Stay close" title="Check in with each other" className="mb-6" />
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
              <Card key={s.label} className="p-5 flex flex-col gap-5">
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-display text-4xl font-light text-ink leading-none tracking-tight">
                    {s.value}
                    {s.suffix && <span className="font-sans text-xs font-medium text-ink-muted ml-1.5">{s.suffix}</span>}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted mt-3">{s.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Remember */}
        <section className={SECTION_BAND}>
          <SectionHeader eyebrow="Remember" title="Moments worth keeping" className="mb-6" />
          <div className="space-y-5">
            <OnThisDayCard />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              <Card className="lg:col-span-3 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <h3 className="font-display text-lg font-normal text-ink">From your memory lane</h3>
                    <Button variant="ghost" size="sm" onClick={handleShuffleMemory}>
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Shuffle</span>
                    </Button>
                  </div>

                  {randomMemory ? (
                    <div className="flex flex-col sm:flex-row gap-5">
                      {randomMemory.photos?.[0] && (
                        <div className="sm:w-2/5 h-52 rounded-2xl overflow-hidden relative group">
                          <img
                            src={randomMemory.photos[0].url}
                            alt={randomMemory.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <Chip
                            tone="muted"
                            className="absolute top-2.5 left-2.5 bg-canvas/70 border-transparent text-ink backdrop-blur-sm"
                          >
                            {randomMemory.category}
                          </Chip>
                        </div>
                      )}
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs text-ink-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(randomMemory.date)}</span>
                          <span aria-hidden="true">·</span>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{randomMemory.location}</span>
                        </div>

                        <h4 className="font-display text-2xl font-normal text-ink tracking-tight">{randomMemory.title}</h4>
                        <p className="text-sm text-ink-muted line-clamp-3 leading-relaxed">
                          {randomMemory.description}
                        </p>

                        {randomMemory.perspectives?.[activeProfile.id] && (
                          <blockquote className="p-3.5 rounded-xl bg-ink/5 border-l-2 border-primary text-xs text-ink-muted italic">
                            &ldquo;{randomMemory.perspectives[activeProfile.id]}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 px-4 text-center space-y-4 rounded-2xl border border-dashed border-line">
                      <div>
                        <h4 className="font-display text-lg font-normal text-ink">Your diary is ready</h4>
                        <p className="text-xs text-ink-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
                          A fresh, private space for the two of you. Start with a first date, a trip or a quiet evening in.
                        </p>
                      </div>
                      <ButtonLink href="/memories/new" variant="secondary" size="sm">
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add your first memory</span>
                      </ButtonLink>
                    </div>
                  )}
                </div>

                {randomMemory && (
                  <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
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
              </Card>

              {/* Recent Memories */}
              <Card className="lg:col-span-2 p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-display text-lg font-normal text-ink">Recently added</h3>
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
                        className="flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-ink/5 transition-colors group"
                      >
                        {mem.photos?.[0] ? (
                          <img
                            src={mem.photos[0].url}
                            alt={mem.title}
                            loading="lazy"
                            decoding="async"
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
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
                        <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-primary transition-colors" />
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
              </Card>
            </div>
          </div>
        </section>

        {/* Play & plan */}
        <section className={SECTION_BAND}>
          <SectionHeader eyebrow="Play & plan" title="Something to look forward to" className="mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/spin-wheel"
                  className="p-5 rounded-2xl panel edge-lit lift group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Dices className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">Spin the date wheel</h4>
                    <p className="text-xs text-ink-muted mt-0.5">Let the wheel choose tonight’s plan</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/coupons"
                  className="p-5 rounded-2xl panel edge-lit lift group flex items-center gap-4"
                >
                  <span className="w-11 h-11 rounded-full bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-ink">Love coupons</h4>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {data.loveCoupons?.filter((c) => !c.redeemed).length || 0} ready to redeem
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-primary transition-colors" />
                </Link>
              </div>

              {/* Upcoming Calendar Events */}
              <Card className="p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <h3 className="font-display text-lg font-normal text-ink">Coming up</h3>
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
                        className="p-4 rounded-2xl bg-canvas border border-line flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Chip tone="primary" className="uppercase tracking-[0.14em] text-[10px]">
                              {evt.category}
                            </Chip>
                            <span className="text-xs font-medium text-ink-muted">{formatDate(evt.date)}</span>
                          </div>
                          <h4 className="font-semibold text-sm text-ink mt-2">{evt.title}</h4>
                          {evt.description && (
                            <p className="text-xs text-ink-muted mt-1 line-clamp-1">{evt.description}</p>
                          )}
                        </div>
                        {evt.time && (
                          <Chip tone="muted" className="flex-shrink-0">
                            {evt.time}
                          </Chip>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-6 text-ink-muted text-sm">
                      Nothing planned yet. Pick a date together.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-5">
              <CassettePlayerWidget />

              {/* Relationship Milestones */}
              <Card className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-5">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-lg font-normal text-ink">Milestones</h3>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-80 pr-1">
                  {milestones.slice(0, 5).map((m) => (
                    <div
                      key={m.days}
                      className={cn(
                        'p-3.5 rounded-2xl border',
                        m.reached ? 'bg-primary/10 border-primary/25' : 'bg-canvas border-line'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-ink">{m.label}</span>
                        {m.reached ? (
                          <Chip tone="solid" className="text-[10px] px-2.5">
                            Celebrated
                          </Chip>
                        ) : (
                          <span className="text-[10px] font-semibold text-ink-muted">In {m.daysLeft} days</span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1.5">{formatDate(m.targetDate)}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/our-stats"
                  className="mt-5 pt-4 border-t border-line text-xs font-semibold text-primary hover:text-primary-hover flex items-center justify-between"
                >
                  <span>All milestones & stats</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Card>
            </div>
          </div>
        </section>

        {/* Your space — invite code (live couples only) */}
        {isLiveUser && (
          <Card as="section" className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Your couple invite code</span>
                  <Chip tone="primary">Active</Chip>
                </div>
                <p className="text-xs text-ink-muted mt-1 max-w-xl">
                  Share it with your partner to join. If it was exposed, regenerate it to retire the old code for good.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-canvas pl-4 pr-1.5 py-1.5 rounded-full border border-line flex-1 md:flex-none justify-between md:justify-start">
                <span className="font-mono font-semibold text-primary text-sm tracking-widest mr-3">
                  {data.couple.inviteCode || 'N/A'}
                </span>
                <IconButton
                  label="Copy invite code"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyCode}
                >
                  <Copy className="w-4 h-4" />
                </IconButton>
              </div>

              {/* Owner-only. The database enforces this too — a partner
                  calling the RPC directly is refused — so hiding it here is
                  about not offering an action that would fail. */}
              {isCoupleCreator && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegenModal(true)}
                    className="flex-shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    <span>Regenerate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRemoveModal(true)}
                    className="flex-shrink-0"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-primary" />
                    <span>Remove partner</span>
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Regenerate Couple Invite Code Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-danger/15 text-danger flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-normal text-ink">Regenerate your invite code?</h3>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                If your current code (<strong className="font-mono text-primary">{data.couple.inviteCode}</strong>) was exposed or shared by mistake, this permanently removes it and issues a new one.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowRegenModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={handleConfirmRegenerate}
                loading={isRegenerating}
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating…' : 'Delete & regenerate'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Remove partner confirmation */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-danger/15 text-danger flex items-center justify-center">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-normal text-ink">Remove {partnerProfile.name} from this space?</h3>
              <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                They lose access immediately, and a fresh invite code is issued so the old one can't be used to come
                straight back. Everything they added — memories, notes, gifts — stays here.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowRemoveModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={handleConfirmRemovePartner}
                loading={isRemoving}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing…' : 'Remove and reissue code'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Floating love ping */}
      <div className="fixed bottom-20 sm:bottom-8 right-5 sm:right-8 z-40">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowHeartbeatModal(true)}
          className="py-3 sm:px-5 sm:text-sm gap-2.5 ring-4 ring-canvas"
          title="Send a thinking-of-you love ping"
        >
          <Heart className="w-4 h-4 fill-current" />
          <span className="hidden xs:inline">Send love</span>
          <span className="px-2 py-0.5 rounded-full bg-on-primary/15 text-[11px] font-semibold tracking-wide flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {data.heartbeatStreak || 1}d
          </span>
        </Button>
      </div>

      <HeartbeatLovePingModal
        isOpen={showHeartbeatModal}
        onClose={() => setShowHeartbeatModal(false)}
      />
    </AppShell>
  );
}
