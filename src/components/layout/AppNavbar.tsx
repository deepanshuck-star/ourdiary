'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import { PartnerPresenceChip } from '@/components/widgets/PartnerPresence';
import { calculateDaysTogether } from '@/lib/date-utils';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/Surface';
import {
  Heart,
  PlusCircle,
  Sparkles,
  Users,
  ChevronDown,
  UserCheck,
  Settings,
  Lock,
  LogOut,
} from 'lucide-react';

/**
 * The top bar reads as a pane of glass floating above the dark room: the
 * canvas shows through it and a hairline marks where it ends. A hard border
 * would cut the page in two; a blurred translucent edge keeps the room
 * continuous and lets the content scroll *under* the bar rather than behind
 * a wall.
 */
export function AppNavbar() {
  const { data, activeProfile, partnerProfile, switchProfile, logout, isLiveUser, isHydrated } = useDiary();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const daysTogether = calculateDaysTogether(data.couple.startDate);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-canvas/70 backdrop-blur-xl border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            {data.couple.photoUrl ? (
              <img
                src={data.couple.photoUrl}
                alt={`${data.couple.name} together`}
                title="Your couple photo"
                className="w-10 h-10 rounded-full object-cover shadow-cta ring-1 ring-line group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-cta ring-1 ring-line group-hover:scale-105 transition-transform bg-hero">
                <Heart className="w-5 h-5 text-primary fill-primary" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-display text-xl font-normal tracking-tight text-ink">
                OurDiary
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted -mt-0.5">
                {data.couple.name.endsWith('Space')
                  ? data.couple.name
                  : `${data.couple.name}’s Space`}
              </p>
            </div>
          </Link>

          {/* Days Together Pill */}
          <Link href="/our-stats" className="hidden md:inline-flex rounded-full bloom">
            <Chip tone="primary">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{isHydrated ? `Day ${daysTogether} together` : "Together"}</span>
            </Chip>
          </Link>

          {/* Mode Pill */}
          <Link
            href="/login"
            className="hidden lg:inline-flex rounded-full bloom"
            title="Click to view Authentication & Database status"
          >
            <Chip tone={isLiveUser ? 'muted' : 'accent'} className="px-2.5">
              {isLiveUser ? <Lock className="w-3 h-3 text-primary" /> : <Sparkles className="w-3 h-3" />}
              <span>{isLiveUser ? 'Private cloud space' : 'Local demo mode'}</span>
            </Chip>
          </Link>
        </div>

        {/* Right Actions & Profile Switcher */}
        <div className="flex items-center gap-3">
          {/* Is the other person here right now? */}
          <PartnerPresenceChip />

          {/* Add Memory Button */}
          <ButtonLink href="/memories/new" size="sm" className="sm:text-sm">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Add memory</span>
          </ButtonLink>

          {/* Simulated Profile Switcher */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="group gap-2 p-1 sm:pl-1 sm:pr-3 sm:py-1"
              aria-label="Profile switcher"
            >
              <div className="relative">
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-secondary/70"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 ring-2 ring-surface rounded-full"></span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-ink leading-tight">
                    {activeProfile.name}
                  </span>
                  <Chip tone="primary" className="px-1.5 py-0.5 text-[10px]">
                    Active
                  </Chip>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Switch view
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-ink-muted group-hover:text-ink transition-colors" />
            </Button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <Card className="absolute right-0 mt-2 w-72 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 border-b border-line mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Simulated Profile Mode
                    </p>
                    <p className="text-[11px] text-ink-muted mt-1 leading-relaxed">
                      Switch between couple viewpoints to write notes, letters, and view private thoughts.
                    </p>
                  </div>

                  {/* Active Profile */}
                  <div className="flex items-center gap-3 p-2 rounded-2xl bg-primary/10 mb-2">
                    <img
                      src={activeProfile.avatar}
                      alt={activeProfile.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-primary/50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink">{activeProfile.name}</span>
                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-xs text-ink-muted truncate">{activeProfile.bio || 'Currently viewing'}</p>
                    </div>
                  </div>

                  {/* Switch to Partner */}
                  <button
                    onClick={() => {
                      switchProfile(partnerProfile.id);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-ink/5 transition-colors text-left group"
                  >
                    <img
                      src={partnerProfile.avatar}
                      alt={partnerProfile.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-line group-hover:ring-secondary transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink-muted group-hover:text-ink transition-colors">
                          Switch to {partnerProfile.name}
                        </span>
                        <Users className="w-3.5 h-3.5 text-ink-muted group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-ink-muted">View as your partner</p>
                    </div>
                  </button>

                  <div className="mt-2 pt-2 border-t border-line flex items-center justify-between px-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="text-xs text-ink-muted hover:text-ink transition-colors flex items-center gap-1.5 font-semibold"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </Link>
                    <div className="flex items-center gap-2">
                      {!isLiveUser && (
                        <Link
                          href="/login"
                          onClick={() => setShowProfileMenu(false)}
                          className="text-xs text-primary hover:text-primary-hover transition-colors font-semibold"
                        >
                          Sign In →
                        </Link>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-1.5 px-2 text-xs text-danger hover:text-danger"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Direct Visible Log Out Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            title="Log out of this space"
            className="gap-1.5 text-ink-muted hover:text-ink"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
