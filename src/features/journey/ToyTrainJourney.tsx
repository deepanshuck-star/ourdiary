'use client';

import React, {useState, useEffect, useMemo} from 'react';
import Link from 'next/link';
import { useDiary } from '@/store/DiaryContext';
import {} from '@/types';
import { formatDate } from '@/lib/date-utils';
import {
  ArrowRight,
  Compass,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Mood and category emojis
const categoryEmojis: Record<string, string> = {
  'First date': '☕',
  Outing: '🎡',
  Trip: '✈️',
  Anniversary: '💖',
  Birthday: '🎂',
  'Funny moment': '😂',
  'Special moment': '✨',
  'Fight or disagreement': '🌧️',
  'Important conversation': '💬',
  Other: '🌟',
};

export function ToyTrainJourney() {
  const { data, activeProfile } = useDiary();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [activeStationIndex, setActiveStationIndex] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [trainPos, setTrainPos] = useState<{ x: number; y: number; angle: number }>({
    x: 400,
    y: 120,
    angle: 0,
  });
  const [isMoving, setIsMoving] = useState(false);

  // Filter memories chronologically (oldest to newest for journey)
  const sortedMemories = useMemo(() => {
    return [...data.memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data.memories]);

  // Extract distinct years
  const availableYears = useMemo(() => {
    const years = new Set(sortedMemories.map((m) => m.date.split('-')[0]));
    return Array.from(years).sort();
  }, [sortedMemories]);

  // Filtered by selected year tab
  const displayedMemories = useMemo(() => {
    if (selectedYear === 'all') return sortedMemories;
    return sortedMemories.filter((m) => m.date.startsWith(selectedYear));
  }, [sortedMemories, selectedYear]);

  // Generate winding serpentine stations coordinates
  // Canvas width: 800, Station spacing: 180 in y
  const stations = useMemo(() => {
    return displayedMemories.map((memory, index) => {
      // Gentle winding S-curve: x varies between 220 and 580
      const x = 400 + Math.sin(index * 1.1) * 220;
      const y = 140 + index * 190;
      const emoji = categoryEmojis[memory.category] || '✨';
      return {
        memory,
        index,
        x,
        y,
        emoji,
      };
    });
  }, [displayedMemories]);

  const totalHeight = Math.max(700, stations.length * 190 + 200);

  // Generate smooth SVG path connecting all stations
  const pathD = useMemo(() => {
    if (stations.length === 0) return '';
    if (stations.length === 1) return `M ${stations[0].x} ${stations[0].y}`;

    let d = `M ${stations[0].x} ${stations[0].y}`;
    for (let i = 0; i < stations.length - 1; i++) {
      const p1 = stations[i];
      const p2 = stations[i + 1];
      const midY = (p1.y + p2.y) / 2;
      // Smooth cubic curve
      d += ` C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [stations]);

  // Move train to active station
  useEffect(() => {
    if (stations.length === 0) return;
    const clampedIndex = Math.min(activeStationIndex, stations.length - 1);
    const target = stations[clampedIndex];
    if (!target) return;

    // Calculate tangent angle
    let angle = 0;
    if (clampedIndex < stations.length - 1) {
      const next = stations[clampedIndex + 1];
      angle = (Math.atan2(next.y - target.y, next.x - target.x) * 180) / Math.PI;
    } else if (clampedIndex > 0) {
      const prev = stations[clampedIndex - 1];
      angle = (Math.atan2(target.y - prev.y, target.x - prev.x) * 180) / Math.PI;
    }

    setIsMoving(true);
    setTrainPos({ x: target.x, y: target.y, angle });

    const timer = setTimeout(() => {
      setIsMoving(false);
    }, reducedMotion ? 50 : 700);

    return () => clearTimeout(timer);
  }, [activeStationIndex, stations, reducedMotion]);

  const activeStation = stations[Math.min(activeStationIndex, stations.length - 1)];

  const handleNextStation = () => {
    if (activeStationIndex < stations.length - 1) {
      setActiveStationIndex((prev) => prev + 1);
    }
  };

  const handlePrevStation = () => {
    if (activeStationIndex > 0) {
      setActiveStationIndex((prev) => prev - 1);
    }
  };

  if (sortedMemories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-xs">
              🚂
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Memory Train Journey</h2>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                Our winding railway through love, milestones, and shared stories.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-[#EFE4D6] p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center text-4xl mx-auto shadow-inner">
            🛤️
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900">The Railway Awaits Your Memories!</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Each station on this candy railway represents a relationship memory. Add your first memory together to build the railway and start the toy train moving!
            </p>
          </div>
          <Link
            href="/memories/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity"
          >
            <span>Lay Down Station #1 (Add Memory)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Journey Header & Chapter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-[#EFE4D6] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-purple-100 text-purple-600">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">The Love Express Journey</h2>
              <p className="text-xs text-slate-500">
                Click any station bubble to whistle the train forward and unlock memories
              </p>
            </div>
          </div>
        </div>

        {/* Chapter / Year Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setSelectedYear('all');
              setActiveStationIndex(0);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedYear === 'all'
                ? 'bg-gradient-to-r from-[#F5A3A3] to-[#CBBEF4] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Years ({sortedMemories.length})
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setSelectedYear(yr);
                setActiveStationIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedYear === yr
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Year {yr}
            </button>
          ))}

          {/* Reduced Motion Toggle */}
          <button
            onClick={() => setReducedMotion(!reducedMotion)}
            title={reducedMotion ? 'Enable animations' : 'Reduced motion'}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors ${
              reducedMotion
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {reducedMotion ? 'Motion: Off' : 'Motion: On'}
          </button>
        </div>
      </div>

      {/* Main Track Viewport + Floating Station Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candy Crush Style SVG Track Canvas (2 cols) */}
        <div className="lg:col-span-2 relative rounded-3xl bg-gradient-to-b from-[#FFF8EE] via-[#FFF5F7] to-[#F2F7FF] border border-[#EFE4D6] shadow-sm p-4 overflow-hidden min-h-[600px]">
          {/* Background whimsical decorative clouds and trees */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-10 left-8 text-4xl">☁️</div>
            <div className="absolute top-48 right-12 text-3xl">🌸</div>
            <div className="absolute top-96 left-14 text-4xl">🌲</div>
            <div className="absolute top-[600px] right-10 text-3xl">✨</div>
            <div className="absolute top-[850px] left-8 text-3xl">🏰</div>
          </div>

          <div className="overflow-x-auto pb-4">
            <svg
              viewBox={`0 0 800 ${totalHeight}`}
              className="w-full max-w-[800px] mx-auto select-none"
              style={{ minWidth: '460px', height: `${totalHeight}px` }}
            >
              <defs>
                {/* Track shadow */}
                <filter id="track-shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#CBBEF4" floodOpacity="0.3" />
                </filter>
                {/* Station bubble drop shadow */}
                <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#292538" floodOpacity="0.18" />
                </filter>
                {/* Candy Track Gradient */}
                <linearGradient id="railroad-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F8C8D8" />
                  <stop offset="50%" stopColor="#CBBEF4" />
                  <stop offset="100%" stopColor="#B6DDF4" />
                </linearGradient>
              </defs>

              {/* Rails: Outer Border Path */}
              <path
                d={pathD}
                fill="none"
                stroke="#E2D4F8"
                strokeWidth="28"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#track-shadow)"
              />

              {/* Rail Ties (Ties along track) */}
              <path
                d={pathD}
                fill="none"
                stroke="#B8A7E0"
                strokeWidth="18"
                strokeDasharray="4 14"
                strokeLinecap="round"
              />

              {/* Center Shiny Track Path */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#railroad-grad)"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Stations (Candy Bubbles) */}
              {stations.map((st, i) => {
                const isActive = i === activeStationIndex;
                const isPast = i < activeStationIndex;

                return (
                  <g
                    key={st.memory.id}
                    onClick={() => setActiveStationIndex(i)}
                    className="cursor-pointer group"
                    transform={`translate(${st.x}, ${st.y})`}
                  >
                    {/* Pulsing ring for active station */}
                    {isActive && (
                      <circle
                        r="44"
                        fill="none"
                        stroke="#F5A3A3"
                        strokeWidth="4"
                        strokeDasharray="6 6"
                        className="animate-spin-slow opacity-80"
                      />
                    )}

                    {/* Outer Glow Halo */}
                    <circle
                      r={isActive ? '36' : '30'}
                      fill={isActive ? '#FFFFFF' : '#FFF9F4'}
                      stroke={isActive ? '#F5A3A3' : '#CBBEF4'}
                      strokeWidth={isActive ? '4' : '3'}
                      filter="url(#bubble-shadow)"
                      className="transition-all duration-300 group-hover:scale-110"
                    />

                    {/* Inner Colored Core */}
                    <circle
                      r={isActive ? '28' : '22'}
                      fill={isActive ? '#F5A3A3' : isPast ? '#CBBEF4' : '#E8E2F7'}
                      className="transition-colors duration-300"
                    />

                    {/* Station Emoji */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isActive ? '18' : '15'}
                      className="pointer-events-none select-none"
                    >
                      {st.emoji}
                    </text>

                    {/* Station Number Badge Pill */}
                    <g transform="translate(0, -32)">
                      <rect
                        x="-20"
                        y="-10"
                        width="40"
                        height="18"
                        rx="9"
                        fill="#292538"
                        className="shadow-sm"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none select-none"
                      >
                        #{i + 1}
                      </text>
                    </g>

                    {/* Date label tag below station */}
                    <g transform="translate(0, 42)">
                      <rect
                        x="-48"
                        y="-9"
                        width="96"
                        height="20"
                        rx="8"
                        fill="rgba(255, 255, 255, 0.95)"
                        stroke="#EFE4D6"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="4.5"
                        textAnchor="middle"
                        fill="#6B6878"
                        fontSize="9.5"
                        fontWeight="600"
                        className="pointer-events-none select-none"
                      >
                        {formatDate(st.memory.date)}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Animated Illustrated Toy Train Engine */}
              <g
                style={{
                  transform: `translate(${trainPos.x}px, ${trainPos.y}px) rotate(${trainPos.angle}deg)`,
                  transition: reducedMotion
                    ? 'none'
                    : 'transform 0.65s cubic-bezier(0.34, 1.3, 0.64, 1)',
                  transformOrigin: '0px 0px',
                }}
              >
                {/* Floating animated steam puff clouds */}
                <g className={isMoving ? 'animate-bounce' : 'animate-pulse'}>
                  <circle cx="-38" cy="-22" r="6" fill="#FFFFFF" opacity="0.85" />
                  <circle cx="-50" cy="-30" r="8" fill="#FFFFFF" opacity="0.75" />
                  <circle cx="-64" cy="-38" r="10" fill="#FFFFFF" opacity="0.6" />
                </g>

                {/* Tender Car (Passenger Wagon behind engine) */}
                <g transform="translate(-48, -14)">
                  <rect x="0" y="0" width="26" height="20" rx="4" fill="#CBBEF4" stroke="#9E8ED6" strokeWidth="1.5" />
                  {/* Heart on wagon */}
                  <path
                    d="M 13,6 C 11,3 7,5 7,8 C 7,12 13,15 13,15 C 13,15 19,12 19,8 C 19,5 15,3 13,6 Z"
                    fill="#F5A3A3"
                  />
                  {/* Wagon wheels */}
                  <circle cx="6" cy="22" r="4" fill="#292538" />
                  <circle cx="6" cy="22" r="1.5" fill="#F8DEA0" />
                  <circle cx="20" cy="22" r="4" fill="#292538" />
                  <circle cx="20" cy="22" r="1.5" fill="#F8DEA0" />
                  {/* Coupler link */}
                  <line x1="26" y1="10" x2="32" y2="10" stroke="#716788" strokeWidth="2" />
                </g>

                {/* Locomotive Main Engine Body */}
                <g transform="translate(-16, -18)">
                  {/* Engine Cab */}
                  <rect x="0" y="0" width="22" height="26" rx="4" fill="#F5A3A3" stroke="#D97A7A" strokeWidth="1.5" />
                  {/* Cab Window */}
                  <rect x="4" y="4" width="14" height="10" rx="2" fill="#FFF8EE" stroke="#D97A7A" strokeWidth="1" />
                  {/* Boiler (Cylinder front) */}
                  <rect x="22" y="6" width="24" height="20" rx="5" fill="#F8C8D8" stroke="#D97A7A" strokeWidth="1.5" />
                  {/* Cowcatcher / Pilot on front */}
                  <polygon points="46,14 54,26 46,26" fill="#F8DEA0" stroke="#D97A7A" strokeWidth="1" />
                  {/* Smokestack */}
                  <rect x="36" y="-2" width="6" height="8" rx="2" fill="#292538" />
                  <polygon points="34,-2 44,-2 41,2 37,2" fill="#F8DEA0" />
                  {/* Golden Headlight */}
                  <circle cx="48" cy="12" r="3" fill="#F8DEA0" stroke="#D97A7A" strokeWidth="1" />
                  {/* Engine Wheels */}
                  <circle cx="8" cy="28" r="5" fill="#292538" />
                  <circle cx="8" cy="28" r="2" fill="#F8DEA0" />
                  <circle cx="28" cy="28" r="5" fill="#292538" />
                  <circle cx="28" cy="28" r="2" fill="#F8DEA0" />
                  <circle cx="40" cy="28" r="5" fill="#292538" />
                  <circle cx="40" cy="28" r="2" fill="#F8DEA0" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Station Memory Inspector Card (1 col) */}
        <div className="space-y-4">
          {/* Station Stepper Controls */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#EFE4D6] shadow-xs">
            <button
              onClick={handlePrevStation}
              disabled={activeStationIndex <= 0}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous station"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                Station {activeStationIndex + 1} of {stations.length}
              </span>
              <p className="text-[11px] text-slate-400">
                {activeStation ? formatDate(activeStation.memory.date) : ''}
              </p>
            </div>

            <button
              onClick={handleNextStation}
              disabled={activeStationIndex >= stations.length - 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next station"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Active Station Card Detail */}
          {activeStation ? (
            <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Photo Banner */}
              {activeStation.memory.photos?.[0] ? (
                <div className="h-44 rounded-2xl overflow-hidden relative group">
                  <img
                    src={activeStation.memory.photos[0].url}
                    alt={activeStation.memory.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1">
                    <span>{activeStation.emoji}</span>
                    <span>{activeStation.memory.category}</span>
                  </div>
                </div>
              ) : (
                <div className="h-32 rounded-2xl bg-gradient-to-tr from-[#F8C8D8] to-[#CBBEF4] flex items-center justify-center text-4xl shadow-inner">
                  {activeStation.emoji}
                </div>
              )}

              {/* Station Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-purple-500" />
                  <span>{formatDate(activeStation.memory.date)}</span>
                  <span>•</span>
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span className="truncate">{activeStation.memory.location}</span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 leading-snug">
                  {activeStation.memory.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {activeStation.memory.description}
                </p>
              </div>

              {/* Perspective Snippet */}
              {activeStation.memory.perspectives?.[activeProfile.id] && (
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs text-purple-950">
                  <span className="font-bold block text-purple-800 mb-0.5">
                    Your POV ({activeProfile.name}):
                  </span>
                  <p className="italic leading-relaxed">
                    "{activeStation.memory.perspectives[activeProfile.id]}"
                  </p>
                </div>
              )}

              {/* Tags */}
              {activeStation.memory.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeStation.memory.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Open Memory Button */}
              <div className="pt-2 border-t border-slate-100">
                <Link
                  href={`/memories/${activeStation.memory.id}`}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#F5A3A3] via-[#CBBEF4] to-[#B6DDF4] text-slate-900 font-bold text-sm shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Open Full Memory Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white border border-[#EFE4D6] text-center text-slate-400 text-sm">
              No stations available for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
