'use client';

import React, { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import { useNow } from '@/hooks/useNow';
import {
  RBT_LABELS,
  emptyRoseBudThorn,
  isRbtComplete,
  rbtStreak,
  type RoseBudThorn,
} from '@/lib/features/games/conversation';

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus resize-none';

function localToday(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function RoseBudThornGame() {
  const { data, activeProfile } = useDiary();
  const coupleId = data.couple.id || 'demo';
  const slot = data.activeProfileId;

  // One entry list per person: this is your own check-in, not a shared one.
  const [entries, setEntries] = useLocalState<RoseBudThorn[]>(
    `games:rbt:${coupleId}:${slot}`,
    []
  );

  // Today's date must come from the client — reading the clock during Next's
  // prerender both fails the build and would freeze "today" at build time.
  const nowMs = useNow(60_000);
  const today = nowMs === null ? null : localToday(nowMs);

  const [open, setOpen] = useState(false);

  const entry = useMemo(
    () => (today ? entries.find((e) => e.date === today) ?? emptyRoseBudThorn(today) : null),
    [entries, today]
  );

  const streak = useMemo(() => (today ? rbtStreak(entries, today) : 0), [entries, today]);

  const update = (field: 'rose' | 'bud' | 'thorn', value: string) => {
    if (!entry || !today) return;
    const next = { ...entry, [field]: value };
    setEntries([next, ...entries.filter((e) => e.date !== today)]);
  };

  if (!today || !entry) return <p className="text-sm text-ink-muted">Loading today…</p>;

  const past = entries
    .filter((e) => e.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {activeProfile.name}’s check-in for{' '}
          <span className="font-semibold text-ink">
            {new Date(`${today}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-ink text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> {streak} day{streak === 1 ? '' : 's'} running
          </span>
        )}
      </div>

      <div className="space-y-3">
        {(['rose', 'bud', 'thorn'] as const).map((field) => (
          <div key={field} className="rounded-2xl border border-line bg-surface p-4 space-y-2">
            <label htmlFor={`rbt-${field}`} className="block">
              <span className="text-sm font-semibold text-ink">{RBT_LABELS[field].title}</span>
              <span className="block text-xs text-ink-muted">{RBT_LABELS[field].blurb}</span>
            </label>
            <textarea
              id={`rbt-${field}`}
              value={entry[field]}
              onChange={(e) => update(field, e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-muted" aria-live="polite">
        {isRbtComplete(entry)
          ? 'All three down. The thorn is the one most people skip — good.'
          : 'Saves as you type. A partial entry still counts towards the streak.'}
      </p>

      {past.length > 0 && (
        <div className="rounded-2xl border border-line bg-canvas p-4">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-sm font-semibold text-ink"
          >
            {open ? 'Hide' : 'Read back'} earlier days ({past.length})
          </button>
          {open && (
            <ul className="mt-3 space-y-3">
              {past.map((e) => (
                <li key={e.date} className="text-xs text-ink-muted space-y-0.5">
                  <p className="font-semibold text-ink">
                    {new Date(`${e.date}T12:00:00`).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                  {e.rose && <p>🌹 {e.rose}</p>}
                  {e.bud && <p>🌱 {e.bud}</p>}
                  {e.thorn && <p>🥀 {e.thorn}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default RoseBudThornGame;
