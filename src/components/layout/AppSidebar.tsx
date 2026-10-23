'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import {
  LayoutDashboard,
  Compass,
  BookHeart,
  CalendarDays,
  Image as GalleryIcon,
  MailCheck,
  CheckSquare,
  BarChart3,
  SlidersHorizontal,
  HeartHandshake,
  Sparkles,
  Dices,
  Ticket,
  Lock,
  LogOut,
} from 'lucide-react';
import { exploreItems } from './exploreNav';

export const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    name: 'Train Journey',
    href: '/journey',
    icon: Compass,
    badge: 'Popular',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    name: 'Our Memories',
    href: '/memories',
    icon: BookHeart,
    badge: null,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    name: 'Daily Spark',
    href: '/daily-spark',
    icon: Sparkles,
    badge: 'New',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    name: 'Spin Date Wheel',
    href: '/spin-wheel',
    icon: Dices,
    badge: 'Fun',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    name: 'Love Coupons',
    href: '/coupons',
    icon: Ticket,
    badge: 'Sweet',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
  {
    name: 'Calendar & Dates',
    href: '/calendar',
    icon: CalendarDays,
    badge: null,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    name: 'Photo Gallery',
    href: '/gallery',
    icon: GalleryIcon,
    badge: null,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    name: 'Time Letters',
    href: '/letters',
    icon: MailCheck,
    badge: null,
    color: 'text-pink-500',
    bg: 'bg-pink-50',
  },
  {
    name: 'Bucket List',
    href: '/bucket-list',
    icon: CheckSquare,
    badge: null,
    color: 'text-teal-500',
    bg: 'bg-teal-50',
  },
  {
    name: 'Love Stats',
    href: '/our-stats',
    icon: BarChart3,
    badge: null,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: SlidersHorizontal,
    badge: null,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data, isLiveUser, logout } = useDiary();
  const { access, reason, title, isPersonal } = useSpaceMode();

  // A personal diary drops the couple-only rows entirely; a couple diary with
  // an empty second seat keeps them, inert, so you can see what is coming.
  const rows = [
    ...navItems.map((item) => ({ ...item, explore: false })),
    ...exploreItems.map((item) => ({ ...item, badge: null as string | null, explore: true })),
  ].filter((item) => access(item.href) !== 'hidden');
  const firstExplore = rows.findIndex((item) => item.explore);

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-line bg-canvas p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Couple Mini Banner — one face, not two, when nobody else is coming */}
      <div className="p-3.5 mb-5 rounded-[1.25rem] border border-line flex items-center gap-3 shrink-0 bg-hero-soft">
        <div className="flex -space-x-3 items-center">
          <img
            src={data.couple.user1.avatar}
            alt={data.couple.user1.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-surface"
          />
          {!isPersonal && (
            <img
              src={data.couple.user2.avatar}
              alt={data.couple.user2.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-surface"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink truncate">{data.couple.name}</p>
          <p className="text-[11px] text-ink-muted flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-primary" />
            {isPersonal ? 'Keeping it since' : 'Together since'} {data.couple.startDate.split('-')[0]}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 shrink-0" aria-label="Main">
        {rows.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          const waiting = access(item.href) === 'waiting';
          const label = title(item.href, item.name);

          const inner = (
            <>
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-full transition-colors ${
                    isActive ? 'bg-primary text-on-primary' : 'bg-slate-100 text-slate-500 group-hover:text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{label}</span>
              </div>
              {waiting ? (
                <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              ) : (
                item.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                    {item.badge}
                  </span>
                )
              )}
            </>
          );

          return (
            <React.Fragment key={item.href}>
            {index === firstExplore && (
              <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Explore
              </p>
            )}
            {waiting ? (
              // Still waiting on a second person: shown, explained, and it
              // lands on the dashboard where the invite code lives — a click
              // that does nothing at all reads as a broken link.
              <button
                type="button"
                aria-disabled="true"
                title={reason(item.href) ?? undefined}
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-full font-medium text-sm text-slate-600 opacity-50 cursor-default group"
              >
                {inner}
              </button>
            ) : (
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between px-3 py-2 rounded-full font-medium text-sm transition-colors duration-200 group ${
                  isActive
                    ? 'bg-surface text-ink font-semibold shadow-card ring-1 ring-line'
                    : 'text-slate-600 hover:text-ink hover:bg-surface/70'
                }`}
              >
                {inner}
              </Link>
            )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Fun footer tip & Logout button */}
      <div className="mt-auto pt-4 border-t border-line space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={() => logout(true)}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-full border border-line bg-surface hover:bg-slate-50 text-ink-muted hover:text-ink font-semibold text-xs transition-colors cursor-pointer active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>

        {!isLiveUser && (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-cta transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sign in to your space</span>
          </Link>
        )}

        <div className="p-3.5 rounded-[1.25rem] bg-purple-50 text-xs text-purple-900">
          <div className="flex items-center gap-1.5 font-semibold text-purple-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            A small tip
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            You can switch viewpoints in the top bar to leave private notes & surprises!
          </p>
        </div>
      </div>
    </aside>
  );
}
