'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BellOff, CheckCheck, Loader2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { NotificationIcon } from '@/components/widgets/NotificationBell';
import { useDiary } from '@/store/DiaryContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useNow } from '@/hooks/useNow';
import { describe, groupByDay, relativeTime } from '@/lib/features/notifications';

export default function NotificationsPage() {
  const { partnerProfile, isLiveUser } = useDiary();
  const { items, unread, loading, error, markRead, markAllRead } = useNotifications();

  // "Today"/"Yesterday" headings and relative stamps depend on the current
  // time, which must not be read while Next prerenders — useNow() returns
  // null until mounted.
  const nowMs = useNow(60_000);
  const groups = useMemo(() => (nowMs === null ? [] : groupByDay(items, new Date(nowMs))), [items, nowMs]);
  const booting = loading || nowMs === null;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">While you were away</p>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold text-ink mt-0.5">Notifications</h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-xl">
              {isLiveUser
                ? `Everything ${partnerProfile.name} has done in your space, newest first.`
                : 'Demo mode: this feed stays on this device.'}
            </p>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            aria-label="Mark all notifications read"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta text-xs font-semibold transition-colors active:scale-95 disabled:opacity-40 disabled:active:scale-100 cursor-pointer disabled:cursor-default"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Mark all read
          </button>
        </header>

        {error && (
          <p role="status" className="rounded-[1.25rem] border border-line bg-surface shadow-card px-4 py-3 text-xs text-ink-muted">
            {error}
          </p>
        )}

        {booting ? (
          <div
            className="rounded-[1.25rem] border border-line bg-surface shadow-card p-10 flex items-center justify-center"
            aria-busy="true"
          >
            <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading your notifications</span>
          </div>
        ) : groups.length === 0 ? (
          <section className="rounded-[1.25rem] border border-line bg-surface shadow-card p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-hero flex items-center justify-center">
              <BellOff className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink mt-4">Nothing to catch up on</h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-sm mx-auto">
              When {partnerProfile.name} adds a memory, sends a hug or writes you a letter, it will show up here.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center mt-5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary shadow-cta text-xs font-semibold transition-colors"
            >
              Back to the dashboard
            </Link>
          </section>
        ) : (
          groups.map((group) => (
            <section key={group.date} aria-labelledby={`day-${group.date}`} className="space-y-2">
              <h2
                id={`day-${group.date}`}
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted px-1"
              >
                {group.label}
              </h2>

              <ul className="rounded-[1.25rem] border border-line bg-surface shadow-card overflow-hidden divide-y divide-line">
                {group.items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href || '/dashboard'}
                      onClick={() => markRead([n.id])}
                      className={`flex items-start gap-3 p-3 sm:p-4 transition-colors hover:bg-hero ${
                        n.readAt ? '' : 'bg-hero/60'
                      }`}
                    >
                      <span className="flex-shrink-0 w-9 h-9 rounded-full bg-hero flex items-center justify-center">
                        <NotificationIcon kind={n.kind} className="w-4 h-4 text-primary" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-ink truncate">{n.title}</span>
                          <span className="text-[11px] text-ink-muted flex-shrink-0">
                            {nowMs === null ? '' : relativeTime(n.createdAt, nowMs)}
                          </span>
                        </span>
                        <span className="block text-xs text-ink-muted mt-0.5">
                          {/* In a two-person space the actor is always the other
                              one — you are never notified about your own doing. */}
                          {describe(n, partnerProfile.name)}
                        </span>
                      </span>

                      {!n.readAt && (
                        <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" role="img" aria-label="Unread" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
