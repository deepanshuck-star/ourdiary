'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarClock, Globe2, Loader2, MapPin, Moon, Sun, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useLongDistance } from '@/hooks/useLongDistance';
import { splitDuration } from '@/lib/features/countdowns';
import { buildNominatimUrl, locationKey, parseNominatimResponse } from '@/lib/features/geocode-queue';
import { DistanceCounter } from '@/components/widgets/DistanceCounter';
import { MorningMail } from '@/components/widgets/MorningMail';
import { WatchTogetherSync } from '@/components/widgets/WatchTogetherSync';
import {
  filterTimeZones,
  formatMinutesInOffset,
  formatOffset,
  hoursApart,
  isDaytime,
  isProbablyAsleep,
  offsetMinutes,
  wakingOverlap,
  zonedParts,
  zonedTimeToUtc,
} from '@/lib/features/timezones';
import type { DistanceUnit, HomePlace } from '@/lib/features/distance';
import type { DemoProfile } from '@/types';

const FALLBACK_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function allTimeZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
    if (list && list.length) return list.includes('UTC') ? list : ['UTC', ...list];
  } catch {
    // Older browsers.
  }
  return FALLBACK_ZONES;
}

function formatClock(ms: number, timeZone: string, withSeconds = true) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
  }).format(new Date(ms));
}

function formatDay(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(
    new Date(ms)
  );
}

function prettyZone(zone: string) {
  return zone.replace(/_/g, ' ');
}

function ZonePicker({
  id,
  zones,
  value,
  onChange,
}: {
  id: string;
  zones: string[];
  value: string;
  onChange: (zone: string) => void;
}) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const filtered = filterTimeZones(zones, query, 80);
    return filtered.includes(value) ? filtered : [value, ...filtered];
  }, [zones, query, value]);

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-search`} className="block text-xs font-semibold text-ink-muted">
        Search time zones
      </label>
      <input
        id={`${id}-search`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Kolkata, London, New York"
        className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
      />
      <label htmlFor={`${id}-select`} className="sr-only">
        Time zone
      </label>
      <select
        id={`${id}-select`}
        size={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
      >
        {options.map((z) => (
          <option key={z} value={z}>
            {prettyZone(z)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Turns "Kolkata" into a coordinate so the distance counter has something to
 * measure. One lookup per button press, through the same OpenStreetMap
 * service the Memory Globe uses — a city, not a live position, because
 * nothing here needs to know where anyone actually is.
 */
function HomeCityPicker({
  home,
  onSave,
  onClear,
}: {
  home: HomePlace | null;
  onSave: (place: HomePlace) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'looking' | 'notfound' | 'error'>('idle');

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = locationKey(query);
    if (!key) return;
    setStatus('looking');
    try {
      const res = await fetch(buildNominatimUrl(key), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const entry = parseNominatimResponse(await res.json());
      if (entry.status !== 'found') {
        setStatus('notfound');
        return;
      }
      onSave({ query: query.trim(), lat: entry.lat, lng: entry.lng, label: entry.label });
      setQuery('');
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-3">
      {home && (
        <div className="rounded-2xl bg-hero border border-line p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              {home.query}
            </p>
            {home.label && <p className="text-[11px] text-ink-muted mt-0.5 truncate">{home.label}</p>}
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove your city"
            className="p-2 rounded-full text-ink-muted hover:text-danger flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={lookup} className="flex gap-2 items-end">
        <div className="flex-1">
          <label htmlFor="home-city" className="block text-xs font-semibold text-ink-muted mb-1">
            {home ? 'Moved? Set a new city' : 'Which city are you in?'}
          </label>
          <input
            id="home-city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={80}
            placeholder="Kolkata"
            className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'looking' || !query.trim()}
          className="px-4 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta disabled:opacity-40 flex items-center gap-1.5"
        >
          {status === 'looking' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          Save
        </button>
      </form>

      {status === 'notfound' && (
        <p role="alert" className="text-xs text-danger font-medium">
          No city by that name came back. Try the nearest bigger one.
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="text-xs text-danger font-medium">
          The lookup didn’t answer. Try again in a moment.
        </p>
      )}
      <p className="text-[11px] text-ink-muted">
        Only the city name is sent, to OpenStreetMap, and only when you press Save.
      </p>
    </div>
  );
}

function PersonClock({
  profile,
  zone,
  zoneIsSet,
  now,
  isMe,
}: {
  profile: DemoProfile;
  zone: string;
  zoneIsSet: boolean;
  now: number | null;
  isMe: boolean;
}) {
  const hour = now === null ? 12 : zonedParts(now, zone).hour;
  const asleep = isProbablyAsleep(hour);
  const day = isDaytime(hour);
  const Icon = day ? Sun : Moon;
  return (
    <div className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src={profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-purple-50 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">
              {profile.name}
              {isMe && <span className="text-ink-muted font-normal"> (you)</span>}
            </p>
            <p className="text-xs text-ink-muted truncate">
              {prettyZone(zone)}
              {now !== null && ` · ${formatOffset(offsetMinutes(now, zone))}`}
              {!zoneIsSet && ' · not set yet'}
            </p>
          </div>
        </div>
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            day ? 'bg-purple-50 text-primary' : 'bg-ink text-snow'
          }`}
          aria-label={day ? 'Daytime' : 'Night-time'}
          role="img"
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="font-display text-4xl sm:text-5xl font-semibold text-ink mt-5 tabular-nums">
        {now === null ? '--:--' : formatClock(now, zone)}
      </p>
      <p className="text-sm text-ink-muted mt-1">{now === null ? '' : formatDay(now, zone)}</p>
      <p
        className={`inline-flex mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
          asleep ? 'bg-ink/10 text-ink' : 'bg-purple-50 text-primary'
        }`}
      >
        {asleep ? 'Probably asleep' : 'Probably awake'}
      </p>
    </div>
  );
}

export default function LongDistancePage() {
  const { activeProfile, partnerProfile, showToast } = useDiary();
  const reduceMotion = useReducedMotion() ?? false;
  const ld = useLongDistance(1000);
  const {
    now,
    me,
    myZone,
    partnerZone,
    myZoneIsSet,
    partnerZoneIsSet,
    myHome,
    deviceZone,
    unit,
    setZone,
    setHome,
    setUnit,
    setWatch,
  } = ld;

  const zones = useMemo(() => allTimeZones(), []);

  const [watchTitle, setWatchTitle] = useState('');
  const [watchAt, setWatchAt] = useState('');

  const myOffset = now === null ? 0 : offsetMinutes(now, myZone);
  const partnerOffset = now === null ? 0 : offsetMinutes(now, partnerZone);
  const overlap = wakingOverlap(myOffset, partnerOffset);
  const diff = hoursApart(myOffset, partnerOffset);

  const handleWatch = (e: React.FormEvent) => {
    e.preventDefault();
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(watchAt);
    if (!m) return;
    const startUtc = zonedTimeToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], myZone);
    setWatch({ title: watchTitle.trim() || 'Movie night', startUtc, setBy: me });
    setWatchTitle('');
    setWatchAt('');
    showToast('Watch party scheduled for both of you', 'success');
  };

  const watch = ld.state.watch;
  const watchParts = watch && now !== null ? splitDuration(watch.startUtc - now) : null;
  const watchLive = watchParts?.past && watchParts.totalMs > -3 * 3600 * 1000;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Long-distance mode</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">Same love, different clocks</h1>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            See each other's time at a glance, find the hours you're both awake, write into their night, and
            start a show at exactly the same moment.
          </p>
        </header>

        <DistanceCounter />

        <section aria-label="Both local times" className="grid md:grid-cols-2 gap-4">
          <PersonClock profile={activeProfile} zone={myZone} zoneIsSet={myZoneIsSet} now={now} isMe />
          <PersonClock
            profile={partnerProfile}
            zone={partnerZone}
            zoneIsSet={partnerZoneIsSet}
            now={now}
            isMe={false}
          />
        </section>

        <section aria-labelledby="overlap-heading" className="rounded-[1.25rem] bg-hero border border-line p-5 sm:p-6 shadow-card">
          <h2 id="overlap-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" aria-hidden="true" /> When you're both awake
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Assuming you're both up between 7am and 11pm.{' '}
            {diff === 0
              ? 'You share a clock right now.'
              : `${partnerProfile.name} is ${Math.abs(diff)} hour${Math.abs(diff) === 1 ? '' : 's'} ${diff > 0 ? 'ahead of' : 'behind'} you.`}
          </p>
          {now !== null && (
            <>
              <p className="font-display text-3xl font-semibold text-ink mt-4">
                {Math.floor(overlap.totalMinutes / 60)}h{overlap.totalMinutes % 60 ? ` ${overlap.totalMinutes % 60}m` : ''}{' '}
                <span className="text-base font-sans font-normal text-ink-muted">of shared waking time a day</span>
              </p>
              <ul className="mt-4 space-y-2">
                {overlap.windowsUtc.map(([s, e]) => (
                  <li key={`${s}-${e}`} className="text-sm text-ink rounded-2xl bg-surface border border-line px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <span className="font-semibold">You:</span> {formatMinutesInOffset(s, myOffset)}–{formatMinutesInOffset(e, myOffset)}
                    </span>
                    <span>
                      <span className="font-semibold">{partnerProfile.name}:</span> {formatMinutesInOffset(s, partnerOffset)}–
                      {formatMinutesInOffset(e, partnerOffset)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="zones-heading" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
          <h2 id="zones-heading" className="text-xl font-semibold text-ink">Where you are, {activeProfile.name}</h2>
          <p className="text-xs text-ink-muted mt-1">
            Each of you sets your own, and it now reaches the other's device — everything that knows when
            your morning starts is built on this.
            {!myZoneIsSet && ` We're using this device's zone (${prettyZone(deviceZone)}) until you choose.`}
          </p>
          <div className="mt-4 grid md:grid-cols-2 gap-5">
            <ZonePicker id="my-zone" zones={zones} value={myZone} onChange={(z) => setZone(me, z)} />
            <div className="space-y-3">
              <HomeCityPicker
                home={myHome}
                onSave={(place) => {
                  setHome(me, place);
                  showToast('City saved — the distance counter is live', 'success');
                }}
                onClear={() => setHome(me, null)}
              />
              <fieldset className="flex items-center gap-2">
                <legend className="sr-only">Distance unit</legend>
                {(['km', 'mi'] as DistanceUnit[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setUnit(option)}
                    aria-pressed={unit === option}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      unit === option
                        ? 'bg-primary text-on-primary border-transparent'
                        : 'bg-surface text-ink-muted border-line hover:text-ink'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </fieldset>
            </div>
          </div>
          {!partnerZoneIsSet && (
            <p className="text-[11px] text-ink-muted mt-4">
              {partnerProfile.name} hasn’t set theirs yet, so the sleep-aware parts of this page stay quiet
              rather than guessing.
            </p>
          )}
        </section>

        <MorningMail
          partnerName={partnerProfile.name}
          partnerZone={partnerZone}
          partnerAsleep={Boolean(ld.partnerSleep?.asleep)}
          partnerNextWakeUtc={ld.partnerSleep?.nextWakeUtc ?? now ?? 0}
        />

        <WatchTogetherSync />

        <section aria-labelledby="watch-heading" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card space-y-5">
          <div>
            <h2 id="watch-heading" className="text-xl font-semibold text-ink flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary" aria-hidden="true" /> Plan it for later
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Pick a start time in your zone and you each see it on your own clock. When the night comes
              round, use the countdown above to actually press play together.
            </p>
          </div>

          {watch && watchParts && now !== null && (
            <div className="rounded-[1.25rem] bg-hero border border-line p-5 text-center relative">
              <button
                type="button"
                onClick={() => setWatch(undefined)}
                aria-label="Cancel watch party"
                className="absolute top-3 right-3 p-2 rounded-full text-ink-muted hover:text-ink"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{watch.title}</p>
              {watchParts.past ? (
                <motion.p
                  initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-display text-4xl font-semibold text-ink mt-3"
                >
                  {watchLive ? 'Press play — now!' : 'That watch party has passed'}
                </motion.p>
              ) : (
                <p className="font-display text-5xl sm:text-6xl font-semibold text-ink mt-3 tabular-nums">
                  {watchParts.days > 0 && `${watchParts.days}d `}
                  {String(watchParts.hours).padStart(2, '0')}:{String(watchParts.minutes).padStart(2, '0')}:
                  {String(watchParts.seconds).padStart(2, '0')}
                </p>
              )}
              <div className="mt-4 text-sm text-ink-muted space-y-1">
                <p>
                  <span className="font-semibold text-ink">{activeProfile.name}:</span> {formatDay(watch.startUtc, myZone)},{' '}
                  {formatClock(watch.startUtc, myZone, false)}
                </p>
                <p>
                  <span className="font-semibold text-ink">{partnerProfile.name}:</span>{' '}
                  {formatDay(watch.startUtc, partnerZone)}, {formatClock(watch.startUtc, partnerZone, false)}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleWatch} className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label htmlFor="watch-title" className="block text-xs font-semibold text-ink-muted mb-1">What are you watching?</label>
              <input
                id="watch-title"
                value={watchTitle}
                onChange={(e) => setWatchTitle(e.target.value)}
                maxLength={60}
                placeholder="Movie night"
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div>
              <label htmlFor="watch-at" className="block text-xs font-semibold text-ink-muted mb-1">
                Starts at (your time)
              </label>
              <input
                id="watch-at"
                type="datetime-local"
                required
                value={watchAt}
                onChange={(e) => setWatchAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
            >
              {watch ? 'Reschedule' : 'Schedule'}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
