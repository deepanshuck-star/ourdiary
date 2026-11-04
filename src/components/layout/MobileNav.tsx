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
  HeartHandshake,
  Gamepad2,
  Mountain,
  ChevronDown,
} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { exploreItems } from './exploreNav';
import { groupDrawerItems, groupForPath } from '@/lib/features/nav-groups';

// Today · Us · Memories · Play · More, as the little world's brief asks.
// Journey and Calendar moved into More rather than disappearing.
const mainMobileItems = [
  { name: 'Today', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Us', href: '/us', icon: HeartHandshake },
  { name: 'Memories', href: '/memories', icon: BookHeart },
  { name: 'Play', href: '/games', icon: Gamepad2 },
];

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);

  // Opening the drawer unfolds the section that holds the current page, so
  // "where am I" is answered without a tap.
  const openDrawer = () => {
    setOpenGroup(groupForPath(pathname));
    setDrawerOpen(true);
  };
  const { isLiveUser, logout } = useDiary();

  const moreItems = [
    { name: 'Our World', href: '/world', icon: Mountain },
    { name: 'Train Journey', href: '/journey', icon: Compass },
    { name: 'Calendar', href: '/calendar', icon: CalendarDays },
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
  const groups = groupDrawerItems(moreItems);

  return (
    <>
      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 bg-surface rounded-t-[2rem] p-6 shadow-card z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <h3 className="font-display font-semibold text-lg text-ink">More for the two of you</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-1.5 rounded-full hover:bg-slate-100 text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Seven folding sections instead of one wall of thirty tiles.
                Only the section you tap unfolds; the one holding the page
                you are on opens by itself. */}
            <div className="space-y-2">
              {groups.map((group) => {
                const isOpen = openGroup === group.title;
                const panelId = `drawer-group-${group.title.replace(/[^a-z]+/gi, '-').toLowerCase()}`;
                const holdsCurrent = group.items.some((item) => pathname.startsWith(item.href));
                return (
                  <section key={group.title} className="rounded-2xl border border-line overflow-hidden">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenGroup(isOpen ? null : group.title)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        isOpen ? 'bg-purple-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-semibold truncate ${holdsCurrent ? 'text-primary' : 'text-ink'}`}>{group.title}</span>
                        <span className="shrink-0 text-[11px] font-semibold text-ink-muted bg-slate-100 rounded-full px-2 py-0.5">
                          {group.items.length}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-4 h-4 shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div id={panelId} className="grid grid-cols-2 gap-2 p-3 pt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={isActive ? 'page' : undefined}
                              onClick={() => setDrawerOpen(false)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border min-w-0 transition-colors ${
                                isActive
                                  ? 'border-purple-200 bg-purple-50 text-purple-900 font-semibold'
                                  : 'border-line hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0 text-primary" />
                              <span className="text-[13px] leading-tight truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-line space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  logout(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-full bg-surface hover:bg-slate-50 border border-line text-ink-muted hover:text-ink font-semibold text-sm transition-colors cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>

              {!isLiveUser && (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-center gap-2 p-3 font-bold text-sm transition-all bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign in or create your space</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-line lg:hidden px-2 py-2 flex items-center justify-around">
        {mainMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1 px-3.5 rounded-full transition-colors ${
                isActive
                  ? 'text-primary bg-purple-50 font-semibold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={openDrawer}
          className="flex flex-col items-center justify-center py-1 px-3.5 rounded-full text-ink-muted hover:text-ink"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
}
