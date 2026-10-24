'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDiary } from '@/store/DiaryContext';
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
  LogOut,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';
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
  const { data, isLiveUser, logout } = useDiary();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-line bg-canvas p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Couple Mini Banner */}
      <Card tone="glow" className="p-3.5 mb-5 flex items-center gap-3 shrink-0">
        <div className="flex -space-x-3 items-center">
          <img
            src={data.couple.user1.avatar}
            alt={data.couple.user1.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-canvas"
          />
          <img
            src={data.couple.user2.avatar}
            alt={data.couple.user2.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-canvas"
          />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-normal text-ink truncate">{data.couple.name}</p>
          <p className="text-[11px] text-ink-muted flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-primary" />
            Together since {data.couple.startDate.split('-')[0]}
          </p>
        </div>
      </Card>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 shrink-0" aria-label="Main">
        {[...navItems, ...exploreItems.map((item) => ({ ...item, badge: null as string | null }))].map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <React.Fragment key={item.href}>
            {index === navItems.length && (
              <p className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Explore
              </p>
            )}
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex items-center justify-between px-3 py-2 rounded-full text-sm transition-colors duration-200 group',
                isActive
                  // Lit rather than filled: a wash of primary, a glow around it,
                  // and a hairline of light down the left edge marking the spot.
                  ? 'bg-primary/10 text-ink font-semibold shadow-[0_0_30px_-14px_var(--color-primary)] ' +
                      'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 ' +
                      'before:h-6 before:w-[3px] before:rounded-full before:bg-primary ' +
                      'before:shadow-[0_0_10px_var(--color-primary)]'
                  : 'font-medium text-ink-muted hover:text-ink hover:bg-ink/5'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-1.5 rounded-full transition-colors',
                    isActive ? 'bg-beam shadow-cta' : 'bg-ink/5 text-ink-muted group-hover:text-primary'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <Chip tone="accent" className="px-2 py-0.5 text-[10px]">
                  {item.badge}
                </Chip>
              )}
            </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Fun footer tip & Logout button */}
      <div className="mt-auto pt-4 border-t border-line space-y-2.5 shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          block
          onClick={() => logout(true)}
          className="gap-2 py-2.5 text-ink-muted hover:text-ink"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </Button>

        {!isLiveUser && (
          <ButtonLink href="/login" size="sm" block className="gap-2 py-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sign in to your space</span>
          </ButtonLink>
        )}

        <Card className="p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            A small tip
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed">
            You can switch viewpoints in the top bar to leave private notes & surprises!
          </p>
        </Card>
      </div>
    </aside>
  );
}
