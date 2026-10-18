'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flame, Snowflake, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { getNow } from '@/lib/date-utils';
import { useMoodHistory } from '@/components/widgets/MoodHistoryRecorder';
import {
  collectActivity,
  computeStreak,
  dateToDayKey,
  milestoneToCelebrate,
  nextMilestone,
  recentDays,
  MAX_FREEZES,
  STREAK_MILESTONES,
  type ActivityMap,
  type StreakDay,
} from '@/lib/features/streak';

const NO_MILESTONES: number[] = [];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Shared streak state — the dashboard chip and Year in Review both read it. */
export function useCoupleActivity(): ActivityMap {
  const { data } = useDiary();
  const moodHistory = useMoodHistory();
  return useMemo(
    () =>
      collectActivity({
        sparkAnswers: data.dailySparkAnswers,
        moodSnapshots: moodHistory,
        currentMoods: data.moodBeacons,
      }),
    [data.dailySparkAnswers, data.moodBeacons, moodHistory]
  );
}

function DayDot({ day, names }: { day: StreakDay; names: [string, string] }) {
  const d = new Date(`${day.date}T12:00:00`);
  const who = [day.user_1 && names[0], day.user_2 && names[1]].filter(Boolean).join(' & ');
  const label = day.frozen
    ? `${day.date}: covered by a freeze`
    : who
    ? `${day.date}: ${who} checked in`
    : day.isToday
    ? `${day.date}: still open today`
    : `${day.date}: a quiet day`;
  return (
    <li className="flex flex-col items-center gap-1" title={label}>
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`relative w-7 h-7 rounded-full overflow-hidden flex border-2 ${
          day.isToday ? 'border-primary' : 'border-purple-200'
        } ${day.frozen ? 'bg-purple-100' : 'bg-surface'}`}
      >
        {day.frozen ? (
          <Snowflake className="w-3.5 h-3.5 m-auto text-primary" />
        ) : (
          <>
            <span className={`w-1/2 h-full ${day.user_1 ? 'bg-primary' : ''}`} />
            <span
              className={`w-1/2 h-full border-l border-purple-200 ${day.user_2 ? 'bg-purple-300' : ''}`}
            />
          </>
        )}
      </span>
      <span aria-hidden="true" className={`text-[10px] ${day.isToday ? 'font-bold text-ink' : 'text-ink-muted'}`}>
        {day.isToday ? 'Today' : WEEKDAY[d.getDay()]}
      </span>
    </li>
  );
}

export function CoupleStreakChip() {
  const { data, isHydrated } = useDiary();
  const activity = useCoupleActivity();
  const today = dateToDayKey(getNow());
  const streak = useMemo(() => computeStreak(activity, today), [activity, today]);
  const days = useMemo(
    () => recentDays(activity, today, streak.frozenDays, 7),
    [activity, today, streak.frozenDays]
  );
  const [celebrated, setCelebrated] = useLocalState<number[]>(
    `streak-milestones:${data.couple.id}`,
    NO_MILESTONES
  );
  const milestone = isHydrated ? milestoneToCelebrate(streak.current, celebrated) : null;
  const upcoming = nextMilestone(streak.current);
  const names: [string, string] = [data.couple.user1.name, data.couple.user2.name];

  const [banner, setBanner] = useState<number | null>(null);

  // Celebrate each milestone exactly once on this device: remember it the moment it fires.
  useEffect(() => {
    if (milestone === null) return;
    setBanner(milestone);
    setCelebrated((prev) => Array.from(new Set([...prev, ...STREAK_MILESTONES.filter((m) => m <= milestone)])));
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.4 },
      colors: ['#BE185D', '#F9A8D4', '#E11D48', '#FBCFE8'],
      disableForReducedMotion: true,
    });
  }, [milestone, setCelebrated]);

  if (!isHydrated) return null;

  const status = streak.current === 0
    ? 'Check in today to start a streak together'
    : streak.todayDone
    ? 'Today is counted — lovely'
    : 'Either of you can keep it going today';

  return (
    <div className="mb-6 rounded-[1.25rem] border border-line bg-purple-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-cta">
            <Flame className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold text-ink leading-none">
              {streak.current} {streak.current === 1 ? 'day' : 'days'}
              <span className="sr-only"> couple streak</span>
            </p>
            <p className="text-xs text-ink-muted mt-1">{status}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-line text-xs font-semibold text-ink"
          title="Earn a freeze every 7 days in a row. A freeze quietly covers one missed day."
        >
          <Snowflake className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>
            {streak.freezes} of {MAX_FREEZES} freezes
          </span>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Last 7 days">
        {days.map((d) => (
          <DayDot key={d.date} day={d} names={names} />
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-ink-muted flex flex-wrap gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-l-full bg-primary" aria-hidden="true" /> Left half: {names[0]}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-r-full bg-purple-300" aria-hidden="true" /> Right half: {names[1]}
        </span>
        {upcoming && <span>Next milestone: {upcoming} days</span>}
      </p>

      {banner !== null && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface border border-purple-200 p-4"
        >
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" aria-hidden="true" />
            <p className="text-sm text-ink">
              <strong className="font-semibold">{banner} days in a row.</strong> Showing up for each other, again and
              again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="min-h-11 px-4 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-cta"
          >
            Treasure it
          </button>
        </div>
      )}
    </div>
  );
}
