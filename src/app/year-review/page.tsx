'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Gift,
  Heart,
  Mail,
  MapPin,
  CalendarHeart,
  Smile,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { getNow } from '@/lib/date-utils';
import { useCoupleActivity } from '@/components/widgets/CoupleStreakChip';
import { MONTH_NAMES, availableYears, computeYearReview, type YearReviewStats } from '@/lib/features/yearReview';

type Slide = {
  key: string;
  icon: typeof Heart;
  eyebrow: string;
  render: () => React.ReactNode;
};

const MOOD_WORDS: Record<string, string> = {
  happy: 'Happy',
  romantic: 'Romantic',
  adventurous: 'Adventurous',
  funny: 'Full of laughs',
  cozy: 'Cozy',
  touching: 'Touching',
  peaceful: 'Peaceful',
};

function Big({ children }: { children: React.ReactNode }) {
  return <p className="font-display text-7xl sm:text-8xl font-semibold text-ink leading-none">{children}</p>;
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="text-base sm:text-lg text-slate-700 max-w-md mx-auto leading-relaxed">{children}</p>;
}

function buildSlides(stats: YearReviewStats, coupleName: string): Slide[] {
  const y = stats.year;
  const slides: Slide[] = [
    {
      key: 'intro',
      icon: Gift,
      eyebrow: 'Your year, wrapped',
      render: () => (
        <>
          <Big>{y}</Big>
          <Line>A look back at the moments {coupleName} gathered along the way.</Line>
        </>
      ),
    },
    {
      key: 'memories',
      icon: Heart,
      eyebrow: 'Memories kept',
      render: () => (
        <>
          <Big>{stats.memoriesCount}</Big>
          <Line>
            {stats.memoriesCount === 0
              ? 'A quieter year on the page — and plenty of room for new chapters.'
              : stats.firstMemory
              ? `It all began with “${stats.firstMemory.title}”.`
              : 'Every one of them worth keeping.'}
          </Line>
        </>
      ),
    },
  ];

  if (stats.topPlaces.length > 0) {
    slides.push({
      key: 'places',
      icon: MapPin,
      eyebrow: 'Where you went',
      render: () => (
        <>
          <ol className="space-y-3 w-full max-w-sm mx-auto">
            {stats.topPlaces.map((p, i) => (
              <li
                key={p.place}
                className="flex items-center justify-between gap-3 px-5 py-3 rounded-full bg-surface/90 border border-line"
              >
                <span className="font-display text-lg sm:text-xl text-ink truncate">
                  {i + 1}. {p.place}
                </span>
                <span className="text-xs font-semibold text-ink-muted flex-shrink-0">
                  {p.count} {p.count === 1 ? 'memory' : 'memories'}
                </span>
              </li>
            ))}
          </ol>
          <Line>Your favourite corners of the world this year.</Line>
        </>
      ),
    });
  }

  if (stats.busiestMonth) {
    const b = stats.busiestMonth;
    slides.push({
      key: 'month',
      icon: CalendarHeart,
      eyebrow: 'Your busiest month',
      render: () => (
        <>
          <p className="font-display text-6xl sm:text-7xl font-semibold text-ink leading-none">{MONTH_NAMES[b.month]}</p>
          <Line>
            {b.count} {b.count === 1 ? 'memory' : 'memories'} in a single month. What a stretch.
          </Line>
        </>
      ),
    });
  }

  slides.push({
    key: 'photos',
    icon: Camera,
    eyebrow: 'Photos saved',
    render: () => (
      <>
        <Big>{stats.photosCount}</Big>
        {stats.highlightPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto">
            {stats.highlightPhotos.map((url, i) => (
              <img key={`${url}-${i}`} src={url} alt="" className="aspect-square w-full rounded-2xl object-cover" />
            ))}
          </div>
        )}
        <Line>Little frames of the two of you.</Line>
      </>
    ),
  });

  if (stats.favouriteMood) {
    const m = stats.favouriteMood;
    slides.push({
      key: 'mood',
      icon: Smile,
      eyebrow: 'The feeling of the year',
      render: () => (
        <>
          <p className="font-display text-6xl sm:text-7xl font-semibold text-ink leading-none">
            {MOOD_WORDS[m.mood] ?? m.mood}
          </p>
          <Line>
            {m.count} of your memories felt this way.
          </Line>
        </>
      ),
    });
  }

  slides.push(
    {
      key: 'streak',
      icon: Flame,
      eyebrow: 'Longest streak',
      render: () => (
        <>
          <Big>{stats.longestStreak}</Big>
          <Line>
            {stats.longestStreak > 1
              ? 'days in a row of checking in on each other.'
              : 'Every check-in counts — next year’s streak starts with one.'}
          </Line>
        </>
      ),
    },
    {
      key: 'letters',
      icon: Mail,
      eyebrow: 'Letters written',
      render: () => (
        <>
          <Big>{stats.lettersWritten}</Big>
          <Line>
            {stats.lettersWritten > 0 ? 'words sealed and sent with love.' : 'Maybe this is the year for a first letter.'}
          </Line>
        </>
      ),
    },
    {
      key: 'outro',
      icon: BookOpen,
      eyebrow: 'Here’s to the next chapter',
      render: () => (
        <>
          <p className="font-display text-4xl sm:text-5xl font-semibold text-ink leading-tight">Thank you for {y}.</p>
          <Line>Keep it forever — turn this year into a printed memory book.</Line>
          <Link
            href="/memory-book"
            className="min-h-11 inline-flex items-center gap-2 px-6 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold shadow-cta"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Make our memory book
          </Link>
        </>
      ),
    }
  );
  return slides;
}

export default function YearReviewPage() {
  const { data, isHydrated } = useDiary();
  const reduce = useReducedMotion();
  const activity = useCoupleActivity();
  const years = useMemo(() => availableYears(data.memories, data.letters), [data.memories, data.letters]);
  const currentYear = getNow().getFullYear();
  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const year = chosenYear ?? years[0] ?? currentYear;
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);

  const stats = useMemo(
    () =>
      computeYearReview({
        year,
        memories: data.memories,
        letters: data.letters,
        activityDays: Object.keys(activity),
      }),
    [year, data.memories, data.letters, activity]
  );
  const slides = useMemo(() => buildSlides(stats, data.couple.name), [stats, data.couple.name]);
  const safeIndex = Math.min(index, slides.length - 1);
  const slide = slides[safeIndex];

  const go = useCallback(
    (delta: number) => {
      setPage(([i]) => {
        const next = Math.max(0, Math.min(slides.length - 1, i + delta));
        return [next, delta];
      });
    },
    [slides.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const touchStart = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    touchStart.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (touchStart.current === null) return;
    const dx = e.clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  const Icon = slide.icon;
  const variants = reduce
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 80 : -80 }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -80 : 80 }),
      };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Year in review</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink">Our year, wrapped</h1>
          </div>
          {years.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <span>Year</span>
              <select
                value={year}
                onChange={(e) => {
                  setChosenYear(Number(e.target.value));
                  setPage([0, 0]);
                }}
                className="min-h-11 px-4 rounded-full border border-line bg-surface text-ink font-semibold"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {!isHydrated ? (
          <div className="h-[30rem] rounded-[1.5rem] bg-purple-50 animate-pulse" />
        ) : (
          <>
            <div
              className="relative overflow-hidden rounded-[1.5rem] bg-hero shadow-card min-h-[30rem] touch-pan-y select-none"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (touchStart.current = null)}
              role="region"
              aria-roledescription="carousel"
              aria-label={`${year} in review`}
            >
              {/* Story progress bars */}
              <div className="absolute top-4 inset-x-4 flex gap-1.5 z-10" aria-hidden="true">
                {slides.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-1 flex-1 rounded-full ${i <= safeIndex ? 'bg-primary' : 'bg-surface/70'}`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={`${year}-${slide.key}`}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: reduce ? 0.2 : 0.35, ease: 'easeOut' }}
                  className="absolute inset-0 overflow-y-auto flex flex-col items-center justify-center gap-6 px-6 py-14 text-center"
                  aria-live="polite"
                  aria-roledescription="slide"
                  aria-label={`${safeIndex + 1} of ${slides.length}`}
                >
                  <span className="w-12 h-12 rounded-full bg-surface/90 text-primary flex items-center justify-center shadow-cta">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-800">{slide.eyebrow}</p>
                  {slide.render()}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={safeIndex === 0}
                className="min-h-11 inline-flex items-center gap-1.5 px-5 rounded-full border border-line bg-surface text-ink text-sm font-semibold hover:bg-purple-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </button>
              <p className="text-xs text-ink-muted text-center">
                {safeIndex + 1} / {slides.length}
                <span className="hidden sm:inline"> · use ← → or swipe</span>
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={safeIndex === slides.length - 1}
                className="min-h-11 inline-flex items-center gap-1.5 px-5 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold shadow-cta disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
