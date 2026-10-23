'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Cake,
  CalendarHeart,
  Download,
  Gift,
  Heart,
  Home,
  Music,
  Plane,
  Plus,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { useLocalState } from '@/lib/local-store';
import { newId, useNow } from '@/hooks/useNow';
import {
  buildAutoCountdowns,
  parseLocalDate,
  splitDuration,
  type CountdownItem,
} from '@/lib/features/countdowns';

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  heart: { icon: Heart, label: 'Heart' },
  plane: { icon: Plane, label: 'Trip' },
  gift: { icon: Gift, label: 'Gift' },
  cake: { icon: Cake, label: 'Birthday' },
  star: { icon: Star, label: 'Star' },
  music: { icon: Music, label: 'Concert' },
  home: { icon: Home, label: 'Home' },
  sparkles: { icon: Sparkles, label: 'Celebration' },
};

const KIND_ICON: Record<CountdownItem['kind'], LucideIcon> = {
  anniversary: Heart,
  milestone: Trophy,
  event: CalendarHeart,
  custom: Star,
};

interface CustomCountdown {
  id: string;
  title: string;
  date: string;
  time?: string;
  icon: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function iconFor(item: CountdownItem): LucideIcon {
  if (item.kind === 'custom' && item.icon && ICONS[item.icon]) return ICONS[item.icon].icon;
  return KIND_ICON[item.kind];
}

function formatTarget(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function BigNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-5xl sm:text-7xl font-semibold text-ink tabular-nums leading-none">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted mt-2">{label}</p>
    </div>
  );
}

function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(Boolean(standalone));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') setInstalled(true);
    setPromptEvent(null);
  };

  return { canInstall: Boolean(promptEvent), installed, install };
}

export default function CountdownsPage() {
  const { data, showToast } = useDiary();
  const { isPersonal, note: spaceNote, title: spaceTitle } = useSpaceMode();
  const note = spaceNote('/countdowns');
  const reduceMotion = useReducedMotion() ?? false;
  const now = useNow(1000);
  const { canInstall, installed, install } = useInstallPrompt();

  const [custom, setCustom] = useLocalState<CustomCountdown[]>(`countdowns:custom:${data.couple.id}`, []);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [icon, setIcon] = useState('heart');

  const items = useMemo(() => {
    if (now === null) return [];
    const built = buildAutoCountdowns(data.couple, data.events, new Date(now));
    // Anniversary and "days together" are counted from a relationship; alone
    // they count nothing. Calendar events stay.
    const auto = isPersonal ? built.filter((i) => i.kind !== 'anniversary' && i.kind !== 'milestone') : built;
    const mine: CountdownItem[] = custom.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: 'Your countdown',
      target: parseLocalDate(c.date, c.time).getTime(),
      kind: 'custom',
      icon: c.icon,
    }));
    return [...auto, ...mine].sort((a, b) => {
      const aPast = a.target < now;
      const bPast = b.target < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return aPast ? b.target - a.target : a.target - b.target;
    });
  }, [now, data.couple, data.events, custom, isPersonal]);

  const hero = items.find((i) => now !== null && i.target >= now);
  const rest = items.filter((i) => i !== hero);
  const heroParts = hero && now !== null ? splitDuration(hero.target - now) : null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setCustom((prev) => [...prev, { id: newId('cd'), title: title.trim(), date, time: time || undefined, icon }]);
    setTitle('');
    setDate('');
    setTime('');
    showToast('Countdown started', 'success');
  };

  const removeCustom = (id: string) => setCustom((prev) => prev.filter((c) => c.id !== id));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Countdowns</p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink mt-1">
              {spaceTitle('/countdowns', 'Something to look forward to')}
            </h1>
            {!isPersonal && (
              <p className="text-sm text-ink-muted mt-2 max-w-2xl">
                Your anniversary, the next milestone and everything on the calendar — counting down together.
              </p>
            )}
            {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
          </div>
        </header>

        <section
          aria-label="Next up"
          className="rounded-[1.25rem] bg-hero border border-line shadow-card p-6 sm:p-10"
        >
          {now === null ? (
            <p className="text-sm text-ink-muted text-center py-10">Warming up the clock…</p>
          ) : hero && heroParts ? (
            <motion.div
              key={hero.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{hero.subtitle}</p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-2">{hero.title}</h2>
              <p className="text-xs text-ink-muted mt-1">{formatTarget(hero.target)}</p>
              <div className="flex items-start justify-center gap-6 sm:gap-12 mt-8" aria-live="off">
                <BigNumber value={String(heroParts.days)} label={heroParts.days === 1 ? 'day' : 'days'} />
                <BigNumber value={String(heroParts.hours).padStart(2, '0')} label="hours" />
                <BigNumber value={String(heroParts.minutes).padStart(2, '0')} label="minutes" />
              </div>
              <p className="sr-only">
                {heroParts.days} days and {heroParts.hours} hours until {hero.title}.
              </p>
            </motion.div>
          ) : (
            <p className="text-sm text-ink-muted text-center py-10">
              Nothing on the horizon yet. Add a countdown below or plan something on the calendar.
            </p>
          )}
        </section>

        {rest.length > 0 && now !== null && (
          <section aria-labelledby="all-countdowns" className="space-y-4">
            <h2 id="all-countdowns" className="text-2xl font-semibold text-ink">All countdowns</h2>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map((item) => {
                const parts = splitDuration(item.target - now);
                const Icon = iconFor(item);
                return (
                  <li key={item.id} className="rounded-[1.25rem] bg-surface border border-line p-5 shadow-card flex flex-col">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{item.subtitle}</p>
                        <p className="font-semibold text-ink truncate">{item.title}</p>
                      </div>
                      {item.kind === 'custom' && (
                        <button
                          type="button"
                          onClick={() => removeCustom(item.id)}
                          aria-label={`Delete countdown ${item.title}`}
                          className="p-1.5 rounded-full text-ink-muted hover:text-ink"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-display text-4xl font-semibold text-ink tabular-nums">{parts.days}</span>
                      <span className="text-sm text-ink-muted">
                        {parts.past ? `day${parts.days === 1 ? '' : 's'} ago` : `day${parts.days === 1 ? '' : 's'}, ${parts.hours}h to go`}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{formatTarget(item.target)}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="new-countdown" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card">
          <h2 id="new-countdown" className="text-xl font-semibold text-ink">Start a countdown</h2>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-3 gap-4 mt-4">
            <div className="sm:col-span-3">
              <label htmlFor="cd-title" className="block text-xs font-semibold text-ink-muted mb-1">What are you waiting for?</label>
              <input
                id="cd-title"
                required
                maxLength={60}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goa trip"
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div>
              <label htmlFor="cd-date" className="block text-xs font-semibold text-ink-muted mb-1">Date</label>
              <input
                id="cd-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <div>
              <label htmlFor="cd-time" className="block text-xs font-semibold text-ink-muted mb-1">Time (optional)</label>
              <input
                id="cd-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-line bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>
            <fieldset className="sm:col-span-3">
              <legend className="block text-xs font-semibold text-ink-muted mb-2">Icon</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICONS).map(([key, { icon: Icon, label }]) => (
                  <label
                    key={key}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-focus ${
                      icon === key ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-ink border-line hover:border-primary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cd-icon"
                      value={key}
                      checked={icon === key}
                      onChange={() => setIcon(key)}
                      className="sr-only"
                    />
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta"
              >
                <Plus className="w-4 h-4" /> Add countdown
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="install-heading" className="rounded-[1.25rem] bg-surface border border-line p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="w-11 h-11 rounded-full bg-purple-50 text-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Smartphone className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <h2 id="install-heading" className="font-semibold text-ink">Keep us on your home screen</h2>
            <p className="text-xs text-ink-muted mt-1 max-w-xl">
              Phones don't let web apps add home-screen widgets, so this is the next best thing: install OurDiary, then
              long-press its icon for quick shortcuts to Countdowns, Add memory and your Dashboard.
              {installed && ' You already have it installed.'}
              {!installed && !canInstall && ' If no install button appears, use your browser menu and choose "Add to Home Screen".'}
            </p>
          </div>
          {canInstall && !installed && (
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary shadow-cta self-start sm:self-auto"
            >
              <Download className="w-4 h-4" /> Install app
            </button>
          )}
        </section>
      </div>
    </AppShell>
  );
}
