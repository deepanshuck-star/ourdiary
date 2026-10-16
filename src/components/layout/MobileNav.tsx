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
    { name: 'Settings', href: '/settings', icon: SlidersHorizontal },
  ];

  return (
    <>
      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl p-6 shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-800">More OurDiary Features</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
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
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-purple-200 bg-purple-50/80 text-purple-900 font-semibold'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  logout(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out of Space</span>
              </button>

              {!isLiveUser && (
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-sm shadow-md transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Login or Create Couple Space →</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#EFE4D6] lg:hidden px-2 py-2 flex items-center justify-around">
        {mainMobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-rose-600 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-700"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
}
