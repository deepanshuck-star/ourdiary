'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarHeart,
  Camera,
  CheckCheck,
  Gift,
  HeartHandshake,
  HeartPulse,
  Mail,
  MessagesSquare,
  PartyPopper,
  Sparkles,
  StickyNote,
  ThumbsDown,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useNow } from '@/hooks/useNow';
import { badgeLabel, describe, iconFor, relativeTime, unreadIds } from '@/lib/features/notifications';

/** Icon key (from iconFor) → the glyph. Unknown kinds land on the bell. */
const GLYPHS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  note: StickyNote,
  camera: Camera,
  calendar: CalendarHeart,
  pulse: HeartPulse,
  zap: Zap,
  hug: HeartHandshake,
  message: MessagesSquare,
  party: PartyPopper,
  gift: Gift,
  habit: ThumbsDown,
  letter: Mail,
  bell: Bell,
};

/** The glyph for a notification kind. Shared with the full feed page. */
export function NotificationIcon({ kind, className = '' }: { kind: string; className?: string }) {
  const Glyph = GLYPHS[iconFor(kind)] || Bell;
  return <Glyph className={className} aria-hidden="true" />;
}

/** How many rows the dropdown shows before sending you to the full feed. */
const PREVIEW_COUNT = 8;

export function NotificationBell() {
  const { partnerProfile } = useDiary();
  const { items, unread, available, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // Relative stamps depend on the current time, which must not be read while
  // Next prerenders — useNow() returns null until mounted.
  const nowMs = useNow(60_000);

  const recent = useMemo(() => items.slice(0, PREVIEW_COUNT), [items]);

  // Seeing them is reading them, same as opening the chat thread.
  useEffect(() => {
    if (!open) return;
    markRead(unreadIds(recent));
  }, [open, recent, markRead]);

  // Nothing to announce in demo mode or before a partner has joined — there
  // is nobody to notify you, so the bell doesn't appear at all.
  if (!available) return null;

  const badge = badgeLabel(unread);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications, none unread'}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-line text-ink-muted hover:text-ink hover:border-secondary transition-colors cursor-pointer active:scale-95"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {badge && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-bold shadow-cta"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Recent notifications"
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-[1.25rem] shadow-card border border-line p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-line">
              <p className="font-display text-sm font-semibold text-ink">Notifications</p>
              <button
                type="button"
                onClick={markAllRead}
                disabled={unread === 0}
                aria-label="Mark all notifications read"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-ink disabled:opacity-40 disabled:hover:text-ink-muted cursor-pointer disabled:cursor-default"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </div>

            {recent.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-ink-muted">
                Nothing yet. When {partnerProfile.name} adds something, it lands here.
              </p>
            ) : (
              <ul className="py-1 max-h-80 overflow-y-auto">
                {recent.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href || '/notifications'}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-hero transition-colors"
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-hero flex items-center justify-center">
                        <NotificationIcon kind={n.kind} className="w-3.5 h-3.5 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-ink truncate">{n.title}</span>
                          <span className="text-[10px] text-ink-muted flex-shrink-0">
                            {nowMs === null ? '' : relativeTime(n.createdAt, nowMs)}
                          </span>
                        </span>
                        <span className="block text-[11px] text-ink-muted line-clamp-2">
                          {/* In a two-person space the actor is always the other one —
                              you are never notified about your own doing. */}
                          {describe(n, partnerProfile.name)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 mt-1 border-t border-line px-1">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-primary hover:text-primary-hover"
              >
                See everything
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
