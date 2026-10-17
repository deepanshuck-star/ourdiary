'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import { CalendarEvent, EventCategory } from '@/types';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Edit3,
  X,
  Calendar as CalIcon,
  BookOpen,
} from 'lucide-react';

const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string; border: string }> = {
  Anniversary: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Birthday: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Date Night': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Trip: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Milestone: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Reminder: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function CalendarPage() {
  const { data, addEvent, updateEvent, deleteEvent } = useDiary();

  // Current calendar view month & year (initialized deterministically for Next.js SSR)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2025-04-12'));
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2025-04-12');
  const [todayStr, setTodayStr] = useState<string>('2025-04-12');

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    const dateFormatted = now.toISOString().split('T')[0];
    setSelectedDateStr(dateFormatted);
    setTodayStr(dateFormatted);
  }, []);

  // Event modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(selectedDateStr);
  const [eventTime, setEventTime] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('Date Night');
  const [eventDesc, setEventDesc] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar month days calculation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const str = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: str === todayStr,
      });
    }

    // Next month padding to complete 42 or 35 slots
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const str = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: str,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    return days;
  }, [year, month, todayStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Memories on selected date
  const selectedDateMemories = useMemo(() => {
    return data.memories.filter((m) => m.date === selectedDateStr);
  }, [data.memories, selectedDateStr]);

  // Events on selected date
  const selectedDateEvents = useMemo(() => {
    return data.events.filter((e) => e.date === selectedDateStr);
  }, [data.events, selectedDateStr]);

  const handleOpenAddEvent = (dateDefault?: string) => {
    setEditingEventId(null);
    setEventTitle('');
    setEventDate(dateDefault || selectedDateStr);
    setEventTime('');
    setEventCategory('Date Night');
    setEventDesc('');
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id);
    setEventTitle(ev.title);
    setEventDate(ev.date);
    setEventTime(ev.time || '');
    setEventCategory(ev.category);
    setEventDesc(ev.description || '');
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    if (editingEventId) {
      updateEvent(editingEventId, {
        title: eventTitle.trim(),
        date: eventDate,
        time: eventTime.trim() || undefined,
        category: eventCategory,
        description: eventDesc.trim() || undefined,
      });
    } else {
      addEvent({
        title: eventTitle.trim(),
        date: eventDate,
        time: eventTime.trim() || undefined,
        category: eventCategory,
        description: eventDesc.trim() || undefined,
      });
    }

    setShowEventModal(false);
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header & Month Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#EFE4D6] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-blue-100 text-blue-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">{monthName}</h1>
              <p className="text-xs text-slate-500">
                Memories, milestones, and upcoming dates for {data.couple.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => handleOpenAddEvent()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A3A3] to-[#CBBEF4] text-white font-bold text-xs shadow-sm hover:shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid + Selected Date Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Monthly Grid (2 cols) */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-[#EFE4D6] p-4 sm:p-6 shadow-sm space-y-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 py-1 border-b border-slate-100">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Grid Days */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const isSelected = day.dateStr === selectedDateStr;
                const memoriesOnDay = data.memories.filter((m) => m.date === day.dateStr);
                const eventsOnDay = data.events.filter((e) => e.date === day.dateStr);

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-2xl flex flex-col justify-between text-left transition-all ${
                      isSelected
                        ? 'ring-2 ring-purple-500 bg-purple-50/60 shadow-sm'
                        : day.isCurrentMonth
                        ? 'hover:bg-slate-50/80 bg-white border border-slate-100'
                        : 'opacity-40 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          day.isToday
                            ? 'bg-rose-500 text-white'
                            : isSelected
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {memoriesOnDay.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Memory here"></span>
                      )}
                    </div>

                    {/* Mini event tags */}
                    <div className="w-full space-y-1 mt-1 overflow-hidden">
                      {memoriesOnDay.slice(0, 1).map((m) => (
                        <div
                          key={m.id}
                          className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100/80 text-rose-800 truncate"
                        >
                          📖 {m.title}
                        </div>
                      ))}
                      {eventsOnDay.slice(0, 1).map((e) => (
                        <div
                          key={e.id}
                          className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100/80 text-blue-800 truncate"
                        >
                          📍 {e.title}
                        </div>
                      ))}
                      {memoriesOnDay.length + eventsOnDay.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-semibold block text-right">
                          +{memoriesOnDay.length + eventsOnDay.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Inspector Panel (1 col) */}
          <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Selected Date Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {formatDate(selectedDateStr)}
                  </h3>
                  <p className="text-xs text-slate-400">Date Overview</p>
                </div>
                <button
                  onClick={() => handleOpenAddEvent(selectedDateStr)}
                  className="p-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Memories on this date */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                  Memories On This Day ({selectedDateMemories.length})
                </h4>

                {selectedDateMemories.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedDateMemories.map((m) => (
                      <Link
                        key={m.id}
                        href={`/memories/${m.id}`}
                        className="block p-3 rounded-2xl bg-rose-50/50 border border-rose-100 hover:border-rose-300 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-rose-700 uppercase">{m.category}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 truncate">{m.location}</span>
                        </div>
                        <h5 className="font-bold text-sm text-slate-800 group-hover:text-rose-600 mt-1">
                          {m.title}
                        </h5>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{m.description}</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No past memories recorded on this date.</p>
                )}
              </div>

              {/* Events on this date */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CalIcon className="w-3.5 h-3.5 text-blue-500" />
                  Events & Milestones ({selectedDateEvents.length})
                </h4>

                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedDateEvents.map((e) => {
                      const colors = CATEGORY_COLORS[e.category] || CATEGORY_COLORS.Reminder;
                      return (
                        <div
                          key={e.id}
                          className={`p-3.5 rounded-2xl border ${colors.bg} ${colors.border} space-y-1`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 ${colors.text}`}>
                              {e.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditEvent(e)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(e.id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h5 className="font-bold text-sm text-slate-900">{e.title}</h5>

                          {e.time && (
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{e.time}</span>
                            </p>
                          )}

                          {e.description && (
                            <p className="text-xs text-slate-600 pt-0.5">{e.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No upcoming events planned on this date.</p>
                )}
              </div>
            </div>

            <button
              onClick={() => handleOpenAddEvent(selectedDateStr)}
              className="w-full py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Event For This Day</span>
            </button>
          </div>
        </div>

        {/* Add/Edit Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editingEventId ? 'Edit Event' : 'Schedule a Date / Event'}
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunset Picnic, Anniversary Dinner..."
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={eventCategory}
                    onChange={(e) => setEventCategory(e.target.value as EventCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-purple-300 bg-white"
                  >
                    <option value="Anniversary">Anniversary</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Date Night">Date Night</option>
                    <option value="Trip">Trip</option>
                    <option value="Milestone">Milestone</option>
                    <option value="Reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Description / Plan Details
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Restaurant reservation, packing list, or surprise notes..."
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-sm"
                  >
                    {editingEventId ? 'Update Event' : 'Save Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
