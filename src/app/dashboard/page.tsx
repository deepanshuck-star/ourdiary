'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import {
  calculateDaysTogether,
  calculateNextAnniversary,
  formatDate,
  getMilestones,
  getNow,
} from '@/lib/date-utils';
import {
  Heart,
  PlusCircle,
  Compass,
  CalendarDays,
  Image as GalleryIcon,
  Sparkles,
  ArrowRight,
  Shuffle,
  Flame,
  Award,
  Clock,
  MapPin,
  Calendar,
  Smile,
  ChevronRight,
  Key,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { MoodBeaconBanner } from '@/components/widgets/MoodBeaconBanner';
import { IncomingHeartbeatAlert } from '@/components/widgets/IncomingHeartbeatAlert';
import { HeartbeatLovePingModal } from '@/components/widgets/HeartbeatLovePingModal';
import { OnThisDayCard } from '@/components/widgets/OnThisDayCard';
import { DailyQuestionCard } from '@/components/widgets/DailyQuestionCard';
import { CassettePlayerWidget } from '@/components/widgets/CassettePlayerWidget';

export default function DashboardPage() {
  const {
    data,
    activeProfile,
    partnerProfile,
    isLiveUser,
    regenerateCoupleCode,
    showToast,
  } = useDiary();
  const [randomMemoryIndex, setRandomMemoryIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [showHeartbeatModal, setShowHeartbeatModal] = useState(false);

  const handleCopyCode = () => {
    if (data.couple.inviteCode) {
      navigator.clipboard.writeText(data.couple.inviteCode);
      showToast('Couple invite code copied to clipboard! 📋', 'success');
    }
  };

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateCoupleCode();
      setShowRegenModal(false);
    } catch (err) {
      showToast('Failed to regenerate code', 'warn');
    } finally {
      setIsRegenerating(false);
    }
  };

  const daysTogether = calculateDaysTogether(data.couple.startDate);
  const anniversaryInfo = calculateNextAnniversary(data.couple.anniversaryDate || data.couple.startDate);
  const totalMemories = data.memories.length;
  const totalPhotos = data.memories.reduce((acc, m) => acc + (m.photos?.length || 0), 0);
  const milestones = getMilestones(data.couple.startDate);

  // Pick random memory
  const randomMemory = data.memories.length > 0
    ? data.memories[randomMemoryIndex % data.memories.length]
    : null;

  const handleShuffleMemory = () => {
    if (data.memories.length > 1) {
      let nextIndex = Math.floor(Math.random() * data.memories.length);
      if (nextIndex === randomMemoryIndex) {
        nextIndex = (nextIndex + 1) % data.memories.length;
      }
      setRandomMemoryIndex(nextIndex);
    }
  };

  // Recent 3 memories
  const recentMemories = data.memories.slice(0, 3);

  // Upcoming 3 events
  const upcomingEvents = data.events
    .filter((e) => new Date(e.date).getTime() >= getNow().setHours(0, 0, 0, 0))
    .slice(0, 3);

  return (
    <AppShell>
      <IncomingHeartbeatAlert />
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Welcome Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] p-6 sm:p-8 shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Couple Avatars with Connected Heart */}
              <div className="relative flex items-center">
                <img
                  src={data.couple.user1.avatar}
                  alt={data.couple.user1.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white shadow-lg z-10"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full p-1.5 shadow-md">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                </div>
                <img
                  src={data.couple.user2.avatar}
                  alt={data.couple.user2.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white shadow-lg -ml-4 z-20"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {data.couple.name}
                  </h1>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-white/80 text-purple-700 text-xs font-bold shadow-xs">
                    Year {anniversaryInfo.yearsCount}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-slate-700 font-medium mt-1">
                  Viewing as <strong className="text-purple-800">{activeProfile.name}</strong> •{' '}
                  <span className="text-rose-700 font-bold">{daysTogether} days</span> of love, laughter & shared stories!
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <Link
                href="/memories/new"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-white text-slate-800 font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-rose-500" />
                <span>Add Memory</span>
              </Link>
              <Link
                href="/journey"
                className="flex-1 md:flex-none px-4 py-2.5 rounded-2xl bg-[#292538] text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-amber-300" />
                <span>View Journey</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mood & Warm Hug Beacon Banner */}
        <MoodBeaconBanner />

        {/* Real Authenticated Couple Space: Invite Code & Regeneration Bar */}
        {isLiveUser && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Couple Space Invite Code
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-black">
                    Active Space
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Share this code with your partner to join. If this code was exposed, regenerate it below to permanently delete the old code.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center bg-white px-3.5 py-2 rounded-xl border border-purple-200 shadow-xs flex-1 md:flex-none justify-between md:justify-start">
                <span className="font-mono font-black text-rose-600 text-sm tracking-widest mr-3">
                  {data.couple.inviteCode || 'N/A'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy invite code"
                  className="p-1 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowRegenModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                <span>Regenerate Code</span>
              </button>
            </div>
          </div>
        )}

        {/* On This Day / Time Machine Flashback Card */}
        <OnThisDayCard />

        {/* Dynamic Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EFE4D6] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Flame className="w-6 h-6 text-rose-500 fill-rose-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Together</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{daysTogether}</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EFE4D6] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Anniversary In</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {anniversaryInfo.daysLeft} <span className="text-xs font-medium text-slate-500">days</span>
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EFE4D6] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Memories Logged</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalMemories}</p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EFE4D6] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <GalleryIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photos Kept</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalPhotos}</p>
            </div>
          </div>
        </div>

        {/* Quick Fun Relationship Activities Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/spin-wheel"
            className="p-5 rounded-3xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-purple-200/80 shadow-xs hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                🎡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                    Spin the Date Wheel
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Interactive
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Can't decide on food or activities? Let the wheel pick!
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/coupons"
            className="p-5 rounded-3xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-amber-500/10 border border-rose-200/80 shadow-xs hover:shadow-md transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                🎟️
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-rose-700 transition-colors">
                    Love Coupons & Vouchers
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {data.loveCoupons?.filter((c) => !c.redeemed).length || 0} Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Redeem foot rubs, dish-duty passes & breakfast in bed.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 2-Column Section: Daily Question, Random Memory & Milestones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2 cols): Daily Spark + Random Memory */}
          <div className="lg:col-span-2 space-y-6">
            <DailyQuestionCard />

            <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 fill-amber-300" />
                    <h3 className="font-bold text-base text-slate-900">On This Memory Lane...</h3>
                  </div>
                <button
                  onClick={handleShuffleMemory}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle Memory</span>
                </button>
              </div>

              {randomMemory ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-5">
                    {randomMemory.photos?.[0] && (
                      <div className="sm:w-1/3 h-48 rounded-2xl overflow-hidden relative group">
                        <img
                          src={randomMemory.photos[0].url}
                          alt={randomMemory.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-xs">
                          {randomMemory.category}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(randomMemory.date)}</span>
                        <span>•</span>
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{randomMemory.location}</span>
                      </div>

                      <h4 className="text-xl font-bold text-slate-900">{randomMemory.title}</h4>
                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {randomMemory.description}
                      </p>

                      {/* Perspective sneak peek */}
                      {randomMemory.perspectives?.[activeProfile.id] && (
                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 italic">
                          "{randomMemory.perspectives[activeProfile.id]}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 px-4 text-center space-y-3 bg-gradient-to-br from-pink-50/40 via-purple-50/40 to-blue-50/40 rounded-2xl border border-dashed border-purple-200">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-2xl">
                    📖
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Your Diary is Ready for Your Memories!</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      You have a fresh, private canvas with 0 dummy data. Record your first date, trip, or cozy moment together!
                    </p>
                  </div>
                  <Link
                    href="/memories/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Your First Memory</span>
                  </Link>
                </div>
              )}
            </div>

            {randomMemory && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Smile className="w-4 h-4 text-rose-500" />
                  <span>Mood: <strong className="capitalize text-slate-700">{randomMemory.mood}</strong></span>
                </div>
                <Link
                  href={`/memories/${randomMemory.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                >
                  <span>Open Full Memory & Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Cassette Player + Milestones */}
        <div className="space-y-6">
          <CassettePlayerWidget />

          {/* Relationship Milestones */}
          <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-slate-900">Milestone Tracker</h3>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
              {milestones.slice(0, 5).map((m) => (
                <div
                  key={m.days}
                  className={`p-3 rounded-2xl border transition-all ${
                    m.reached
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{m.label}</span>
                    {m.reached ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                        Achieved! 🎉
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500">
                        In {m.daysLeft} days
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Target date: {formatDate(m.targetDate)}</p>
                </div>
              ))}
            </div>

            <Link
              href="/our-stats"
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center justify-between"
            >
              <span>View all milestones & stats</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

        {/* 2-Column: Recent Memories & Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Memories */}
          <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-base text-slate-900">Recent Memories</h3>
              </div>
              <Link href="/memories" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
                View All ({totalMemories})
              </Link>
            </div>

            <div className="space-y-3">
              {recentMemories.length > 0 ? (
                recentMemories.map((mem) => (
                  <Link
                    key={mem.id}
                    href={`/memories/${mem.id}`}
                    className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                  >
                    {mem.photos?.[0] ? (
                      <img
                        src={mem.photos[0].url}
                        alt={mem.title}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-lg">
                        ✨
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          {mem.category}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(mem.date)}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 truncate mt-0.5 group-hover:text-purple-600 transition-colors">
                        {mem.title}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{mem.location}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-transform" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs space-y-2">
                  <p>No memories logged yet.</p>
                  <Link
                    href="/memories/new"
                    className="text-purple-600 hover:text-purple-700 font-bold underline inline-block"
                  >
                    Click here to add your first memory
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Calendar Events */}
          <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base text-slate-900">Upcoming Planned Events</h3>
              </div>
              <Link href="/calendar" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                Open Calendar
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase tracking-wider">
                          {evt.category}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{formatDate(evt.date)}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-800 mt-1">{evt.title}</h4>
                      {evt.description && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{evt.description}</p>
                      )}
                    </div>
                    {evt.time && (
                      <span className="text-xs font-semibold text-slate-500 px-2 py-1 rounded-lg bg-white border border-slate-200">
                        {evt.time}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No upcoming events right now. Check the calendar!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate Couple Invite Code Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Regenerate Couple Invite Code?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                If your current invite code (<strong className="font-mono text-rose-600">{data.couple.inviteCode}</strong>) was exposed or shared by mistake, this will permanently remove it from the database and issue a brand-new code.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={isRegenerating}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-purple-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isRegenerating ? 'Regenerating...' : 'Yes, Delete & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Glowing Heartbeat Love Ping Button & Modal */}
      <div className="fixed bottom-20 sm:bottom-8 right-5 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => setShowHeartbeatModal(true)}
          className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border-2 border-white/60"
          title="Send a thinking-of-you Love Ping with custom message!"
        >
          <Heart className="w-5 h-5 fill-white animate-pulse" />
          <span className="hidden xs:inline">Send Love Ping</span>
          <span className="px-2 py-0.5 rounded-full bg-white/25 text-[11px] font-black tracking-wide">
            🔥 {data.heartbeatStreak || 1}d
          </span>
        </button>
      </div>

      <HeartbeatLovePingModal
        isOpen={showHeartbeatModal}
        onClose={() => setShowHeartbeatModal(false)}
      />
    </AppShell>
  );
}
