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
  Settings,
  Flame,
  LogOut,
} from 'lucide-react';

export function AppNavbar() {
  const { data, activeProfile, partnerProfile, switchProfile, logout, isLiveUser } = useDiary();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const daysTogether = calculateDaysTogether(data.couple.startDate);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/90 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            {data.couple.photoUrl ? (
              <img
                src={data.couple.photoUrl}
                alt={`${data.couple.name} together`}
                title="Your couple photo"
                className="w-10 h-10 rounded-full object-cover shadow-cta ring-2 ring-surface group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-cta group-hover:scale-105 transition-transform bg-hero">
                <Heart className="w-5 h-5 text-primary fill-primary" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-display font-semibold text-xl tracking-tight text-ink">
                ourdiary
              </span>
              <p className="text-[11px] font-medium text-ink-muted -mt-0.5 lowercase">
                {data.couple.name.endsWith('Space')
                  ? data.couple.name
                  : `${data.couple.name}’s Space`}
              </p>
            </div>
          </Link>

          {/* Days Together Pill */}
          <Link
            href="/our-stats"
            className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span>day {daysTogether} of us</span>
          </Link>

          {/* Mode Pill */}
          <Link
            href="/login"
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              isLiveUser
                ? 'bg-surface border border-line text-ink-muted hover:text-ink'
                : 'bg-amber-50 border border-amber-200/80 text-amber-800 hover:bg-amber-100/80'
            }`}
            title="Click to view Authentication & Database status"
          >
            <Sparkles className={`w-3 h-3 ${isLiveUser ? 'text-primary' : 'text-amber-500'}`} />
            <span>{isLiveUser ? 'private cloud space' : 'local demo mode'}</span>
          </Link>
        </div>

        {/* Right Actions & Profile Switcher */}
        <div className="flex items-center gap-3">
          {/* Add Memory Button */}
          <Link
            href="/memories/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-xs sm:text-sm transition-colors active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">add a memory</span>
          </Link>

          {/* Simulated Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 sm:pl-1 sm:pr-3 rounded-full bg-surface border border-line hover:border-secondary transition-colors group"
              aria-label="Profile switcher"
            >
              <div className="relative">
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-secondary"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-surface rounded-full"></span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {activeProfile.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted">switch view</p>
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
                <div className="absolute right-0 mt-2 w-72 bg-surface rounded-xl shadow-card border border-line p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 group-hover:ring-secondary"
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
                    <div className="flex items-center gap-2">
                      {!isLiveUser && (
                        <Link
                          href="/login"
                          onClick={() => setShowProfileMenu(false)}
                          className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                        >
                          Sign In →
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Direct Visible Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            title="Log out of this space"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface hover:bg-slate-50 border border-line text-ink-muted hover:text-ink text-xs font-semibold transition-colors cursor-pointer active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
