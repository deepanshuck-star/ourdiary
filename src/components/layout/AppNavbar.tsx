'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { calculateDaysTogether } from '@/lib/date-utils';
import {
  Heart,
  PlusCircle,
  Sparkles,
  Users,
  ChevronDown,
  UserCheck,
  Calendar,
  Settings,
  Flame,
} from 'lucide-react';

export function AppNavbar() {
  const { data, activeProfile, partnerProfile, switchProfile } = useDiary();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const daysTogether = calculateDaysTogether(data.couple.startDate);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFF8EE]/90 backdrop-blur-md border-b border-[#EFE4D6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] flex items-center justify-center shadow-md shadow-[#CBBEF4]/30 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl tracking-tight text-[#292538] flex items-center gap-1">
                OurDiary
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-300" />
              </span>
              <p className="text-[11px] font-medium text-slate-500 -mt-1">{data.couple.name}’s Space</p>
            </div>
          </Link>

          {/* Days Together Pill */}
          <Link
            href="/our-stats"
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold hover:bg-rose-100 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Day {daysTogether} of Us</span>
          </Link>

          {/* Mode Pill */}
          <Link
            href="/login"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-semibold hover:bg-amber-100/80 transition-colors"
            title="Click to view Authentication & Database status"
          >
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
            <span>Local Demo Mode</span>
          </Link>
        </div>

        {/* Right Actions & Profile Switcher */}
        <div className="flex items-center gap-3">
          {/* Add Memory Button */}
          <Link
            href="/memories/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F5A3A3] to-[#CBBEF4] text-white font-medium text-xs sm:text-sm shadow-sm hover:opacity-95 hover:shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Add Memory</span>
          </Link>

          {/* Simulated Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white border border-[#EFE4D6] shadow-sm hover:border-[#CBBEF4] transition-all group"
              aria-label="Profile switcher"
            >
              <div className="relative">
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-[#CBBEF4]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {activeProfile.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-600 font-semibold border border-purple-100">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Click to switch</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform" />
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-slate-100 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Simulated Profile Mode
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Switch between couple viewpoints to write notes, letters, and view private thoughts.
                    </p>
                  </div>

                  {/* Active Profile */}
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-purple-50/70 border border-purple-100/80 mb-2">
                    <img
                      src={activeProfile.avatar}
                      alt={activeProfile.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">{activeProfile.name}</span>
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{activeProfile.bio || 'Currently viewing'}</p>
                    </div>
                  </div>

                  {/* Switch to Partner */}
                  <button
                    onClick={() => {
                      switchProfile(partnerProfile.id);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                  >
                    <img
                      src={partnerProfile.avatar}
                      alt={partnerProfile.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-[#CBBEF4]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-purple-600">
                          Switch to {partnerProfile.name}
                        </span>
                        <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500" />
                      </div>
                      <p className="text-xs text-slate-400">View as your partner</p>
                    </div>
                  </button>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between px-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="text-xs text-slate-500 hover:text-purple-600 flex items-center gap-1 font-medium"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </Link>
                    <Link
                      href="/login"
                      onClick={() => setShowProfileMenu(false)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-semibold"
                    >
                      Auth & Setup →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
