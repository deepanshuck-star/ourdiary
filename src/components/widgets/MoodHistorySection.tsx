'use client';

import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { getNow } from '@/lib/date-utils';
import { MOOD_CONFIG } from '@/components/widgets/MoodBeaconBanner';
import { MoodHistoryRecorder, useMoodHistory } from '@/components/widgets/MoodHistoryRecorder';
import { MOOD_ORDER, moodSeries, moodTally, type PartnerKey } from '@/lib/features/moodHistory';
import { dateToDayKey } from '@/lib/features/streak';
import type { MoodType } from '@/types';

const ROW_H = 34;
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Validated two-series palette (light / dark), plus a shape per partner so identity is never colour-only.
const CHART_CSS = `
.mood-chart{--mood-s1:#BE185D;--mood-s2:#0891B2}
:root[data-appearance="dark"] .mood-chart{--mood-s1:#EC4899}
@media (prefers-color-scheme: dark){:root[data-appearance="system"] .mood-chart{--mood-s1:#EC4899}}
`;

function moodLabel(mood: string) {
  return MOOD_CONFIG[mood as MoodType]?.label ?? mood;
}

function shortDate(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MoodHistorySection() {
  const { data, isHydrated } = useDiary();
  // A personal diary has one person in it, so the chart is one series. The
  // alternative was hiding the whole section, which would have taken away
  // the one place a solo user can see their own mood over time.
  const { isPersonal } = useSpaceMode();
  const history = useMoodHistory();
  const [range, setRange] = useState<7 | 30>(7);
  const [showTable, setShowTable] = useState(false);
  const today = dateToDayKey(getNow());
  const series = useMemo(() => moodSeries(history, today, range), [history, today, range]);
  const names: Record<PartnerKey, string> = { user_1: data.couple.user1.name, user_2: data.couple.user2.name };
  const tracked = useMemo<PartnerKey[]>(
    () => (isPersonal ? ['user_1'] : ['user_1', 'user_2']),
    [isPersonal]
  );
  const hasData = series.some((d) => tracked.some((who) => d[who]));

  const xPct = (i: number) => (series.length === 1 ? 50 : 3 + (i / (series.length - 1)) * 94);
  const yPx = (mood: string, who: PartnerKey) =>
    MOOD_ORDER.indexOf(mood) * ROW_H + ROW_H / 2 + (who === 'user_1' ? -4 : 4);

  const segments = (who: PartnerKey) => {
    const out: { x1: number; x2: number; y1: number; y2: number }[] = [];
    series.forEach((d, i) => {
      const prev = series[i - 1];
      if (i === 0 || !prev?.[who] || !d[who]) return;
      out.push({ x1: xPct(i - 1), x2: xPct(i), y1: yPx(prev[who]!, who), y2: yPx(d[who]!, who) });
    });
    return out;
  };

  const tickEvery = range === 7 ? 1 : 5;

  return (
    <section
      aria-labelledby="mood-history-heading"
      className="mood-chart rounded-[1.25rem] bg-surface border border-line p-6 sm:p-8 shadow-card space-y-5"
    >
      <style>{CHART_CSS}</style>
      <MoodHistoryRecorder />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
          <h3 id="mood-history-heading" className="font-display text-lg font-semibold text-ink">
            How we’ve been feeling
          </h3>
        </div>
        <div className="flex gap-1 rounded-full bg-purple-50 p-1" role="group" aria-label="Time range">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`min-h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
                range === r ? 'bg-primary text-on-primary shadow-cta' : 'text-purple-800 hover:bg-purple-100'
              }`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* Legend: colour + shape + name */}
      <div className="flex flex-wrap gap-4 text-xs text-ink">
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="var(--mood-s1)" />
          </svg>
          {names.user_1} (filled dot)
        </span>
        {!isPersonal && (
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="var(--color-surface)" stroke="var(--mood-s2)" strokeWidth="3" />
            </svg>
            {names.user_2} (ring)
          </span>
        )}
      </div>

      {!isHydrated ? (
        <div className="h-52 rounded-2xl bg-purple-50 animate-pulse" />
      ) : !hasData ? (
        <p className="py-10 text-center text-sm text-ink-muted rounded-2xl border border-dashed border-purple-200">
          No check-ins in the last {range} days yet. Share a mood on the dashboard and it will start to show here.
        </p>
      ) : (
        <div className="flex gap-3">
          <ul className="flex-shrink-0 w-24 sm:w-40" aria-hidden="true">
            {MOOD_ORDER.map((m) => (
              <li
                key={m}
                style={{ height: ROW_H }}
                className="flex items-center gap-1.5 text-[11px] sm:text-xs text-ink-muted leading-tight"
              >
                <span>{MOOD_CONFIG[m as MoodType]?.emoji}</span>
                <span className="truncate">{moodLabel(m)}</span>
              </li>
            ))}
          </ul>
          <div className="flex-1 min-w-0">
            <svg
              width="100%"
              height={MOOD_ORDER.length * ROW_H}
              role="img"
              aria-label={`Mood check-ins for ${names.user_1} and ${names.user_2} over the last ${range} days. Use the table view for details.`}
              className="block overflow-visible"
            >
              {MOOD_ORDER.map((m, i) => (
                <line
                  key={m}
                  x1="0"
                  x2="100%"
                  y1={i * ROW_H + ROW_H / 2}
                  y2={i * ROW_H + ROW_H / 2}
                  stroke="var(--color-line)"
                  strokeWidth="1"
                />
              ))}
              {tracked.map((who) =>
                segments(who).map((s, i) => (
                  <line
                    key={`${who}-l-${i}`}
                    x1={`${s.x1}%`}
                    x2={`${s.x2}%`}
                    y1={s.y1}
                    y2={s.y2}
                    stroke={who === 'user_1' ? 'var(--mood-s1)' : 'var(--mood-s2)'}
                    strokeWidth="2"
                    strokeOpacity="0.55"
                  />
                ))
              )}
              {series.map((d, i) =>
                tracked.map((who) => {
                  const mood = d[who];
                  if (!mood || !MOOD_ORDER.includes(mood)) return null;
                  const filled = who === 'user_1';
                  return (
                    <circle
                      key={`${d.date}-${who}`}
                      cx={`${xPct(i)}%`}
                      cy={yPx(mood, who)}
                      r={range === 7 ? 6 : 4.5}
                      fill={filled ? 'var(--mood-s1)' : 'var(--color-surface)'}
                      stroke={filled ? 'var(--color-surface)' : 'var(--mood-s2)'}
                      strokeWidth={filled ? 2 : 3}
                    >
                      <title>{`${names[who]} · ${shortDate(d.date)} · ${moodLabel(mood)}`}</title>
                    </circle>
                  );
                })
              )}
            </svg>
            <div className="relative h-5 mt-1" aria-hidden="true">
              {series.map((d, i) =>
                i % tickEvery === 0 || i === series.length - 1 ? (
                  <span
                    key={d.date}
                    className="absolute -translate-x-1/2 text-[10px] text-ink-muted whitespace-nowrap"
                    style={{ left: `${xPct(i)}%` }}
                  >
                    {i === series.length - 1
                      ? 'Today'
                      : range === 7
                      ? WEEKDAY[new Date(`${d.date}T12:00:00`).getDay()]
                      : shortDate(d.date)}
                  </span>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}

      {isHydrated && hasData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tracked.map((who) => {
            const top = moodTally(series, who)[0];
            return (
              <p key={who} className="p-3 rounded-2xl bg-purple-50 text-xs text-ink">
                <strong className="font-semibold">{names[who]}</strong>
                {top
                  ? ` felt ${moodLabel(top.mood).toLowerCase()} most often (${top.count} ${top.count === 1 ? 'day' : 'days'}).`
                  : ' hasn’t checked in during this stretch.'}
              </p>
            );
          })}
        </div>
      )}

      {isHydrated && hasData && (
        <div>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            {showTable ? 'Hide table view' : 'Show as a table'}
          </button>
          {showTable && (
            <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-line">
              <table className="w-full text-xs text-left">
                <thead className="bg-purple-50 text-ink">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Day</th>
                    <th className="px-3 py-2 font-semibold">{names.user_1}</th>
                    <th className="px-3 py-2 font-semibold">{names.user_2}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink-muted">
                  {series
                    .slice()
                    .reverse()
                    .map((d) => (
                      <tr key={d.date}>
                        <td className="px-3 py-2">{shortDate(d.date)}</td>
                        <td className="px-3 py-2">{d.user_1 ? moodLabel(d.user_1) : '—'}</td>
                        <td className="px-3 py-2">{d.user_2 ? moodLabel(d.user_2) : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
