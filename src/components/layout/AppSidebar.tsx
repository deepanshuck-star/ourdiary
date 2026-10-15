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
    <aside className="hidden lg:flex flex-col w-64 border-r border-[#EFE4D6] bg-white/70 backdrop-blur-md p-4 min-h-[calc(100vh-4rem)]">
      {/* Couple Mini Banner */}
      <div className="p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-[#F8C8D8]/40 via-[#CBBEF4]/30 to-[#B6DDF4]/40 border border-[#EFE4D6] flex items-center gap-3">
        <div className="flex -space-x-3 items-center">
          <img
            src={data.couple.user1.avatar}
            alt={data.couple.user1.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
          <img
            src={data.couple.user2.avatar}
            alt={data.couple.user2.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{data.couple.name}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <HeartHandshake className="w-3 h-3 text-rose-400" />
            Together since {data.couple.startDate.split('-')[0]}
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-[#F5A3A3]/20 via-[#CBBEF4]/20 to-transparent text-[#292538] font-semibold border-l-4 border-[#F5A3A3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg transition-transform group-hover:scale-110 ${
                    isActive ? item.bg : 'bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? item.color : 'text-slate-500'}`} />
                </div>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Fun footer tip & Logout button */}
      <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
        {isLiveUser ? (
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out / Log Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Login or Create Space →</span>
          </Link>
        )}

        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 text-xs text-amber-900">
          <div className="flex items-center gap-1 font-semibold text-amber-800 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Did you know?
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            You can switch viewpoints in the top bar to leave private notes & surprises!
          </p>
        </div>
      </div>
    </aside>
  );
}
