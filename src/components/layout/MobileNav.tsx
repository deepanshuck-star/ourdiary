'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  BookHeart,
  CalendarDays,
  Menu,
  Image as GalleryIcon,
  MailCheck,
  CheckSquare,
  BarChart3,
  SlidersHorizontal,
  X,
  Sparkles,
  Dices,
  Ticket,
  LogOut,
} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { exploreItems } from './exploreNav';

const mainMobileItems = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Journey', href: '/journey', icon: Compass },
  { name: 'Memories', href: '/memories', icon: BookHeart },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
];

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { isLiveUser, logout } = useDiary();

  const moreItems = [
    { name: 'Daily Spark', href: '/daily-spark', icon: Sparkles },
    { name: 'Date Wheel', href: '/spin-wheel', icon: Dices },
    { name: 'Love Coupons', href: '/coupons', icon: Ticket },
    { name: 'Photo Gallery', href: '/gallery', icon: GalleryIcon },
    { name: 'Time Letters', href: '/letters', icon: MailCheck },
    { name: 'Bucket List', href: '/bucket-list', icon: CheckSquare },
    { name: 'Love Stats', href: '/our-stats', icon: BarChart3 },
    ...exploreItems,
    { name: 'Settings', href: '/settings', icon: SlidersHorizontal },
  ];

  return (
    <>
      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          {/* The sheet is a lit plane rising out of the dark, not a white box. */}
          <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-line rounded-t-[2rem] p-6 shadow-card edge-lit z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <h3 className="font-display text-lg font-normal text-ink">More for the two of you</h3>
              <IconButton
                label="Close menu"
                variant="ghost"
                size="sm"
                onClick={() => setDrawerOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary/10 text-ink font-semibold shadow-[0_0_30px_-14px_var(--color-primary)]'
                        : 'border-line text-ink-muted hover:text-ink hover:bg-ink/5'
                    )}
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-line space-y-2">
              <Button
                type="button"
                variant="outline"
                block
                onClick={() => {
                  setDrawerOpen(false);
                  logout(true);
                }}
                className="gap-2 p-3 text-ink-muted hover:text-ink"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </Button>

              {!isLiveUser && (
                <ButtonLink
                  href="/login"
                  block
                  onClick={() => setDrawerOpen(false)}
                  className="gap-2 p-3"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign in or create your space</span>
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-40 bg-canvas/80 backdrop-blur-xl border-t border-line lg:hidden px-2 py-2 flex items-center justify-around">
        {mainMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3.5 rounded-full transition-colors',
                isActive
                  ? 'text-primary bg-primary/12 font-semibold shadow-[0_0_26px_-12px_var(--color-primary)]'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDrawerOpen(true)}
          className="flex-col gap-0 py-1 px-3.5 font-normal"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </Button>
      </nav>
    </>
  );
}
