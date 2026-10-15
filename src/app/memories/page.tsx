'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { formatDate } from '@/lib/date-utils';
import { MemoryCategory, Mood } from '@/types';
import {
  BookHeart,
  PlusCircle,
  Search,
  Filter,
  Calendar,
  MapPin,
  Smile,
  Heart,
  MessageCircle,
  Image as GalleryIcon,
  Tag,
  Trash2,
  Lock,
  Compass,
} from 'lucide-react';

const CATEGORIES: MemoryCategory[] = [
  'First date',
  'Outing',
  'Trip',
  'Anniversary',
  'Birthday',
  'Funny moment',
  'Special moment',
  'Fight or disagreement',
  'Important conversation',
  'Other',
];

const MOODS: { mood: Mood; label: string; emoji: string }[] = [
  { mood: 'happy', label: 'Happy', emoji: '😄' },
  { mood: 'romantic', label: 'Romantic', emoji: '💖' },
  { mood: 'adventurous', label: 'Adventurous', emoji: '🏕️' },
  { mood: 'funny', label: 'Funny', emoji: '😂' },
  { mood: 'cozy', label: 'Cozy', emoji: '☕' },
  { mood: 'touching', label: 'Touching', emoji: '🥺' },
  { mood: 'peaceful', label: 'Peaceful', emoji: '🌿' },
];

export default function MemoriesPage() {
  const { data, activeProfile, deleteMemory } = useDiary();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const filteredMemories = useMemo(() => {
    return data.memories
      .filter((mem) => {
        // Search
        const matchesSearch =
          mem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mem.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mem.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          mem.tags?.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

        // Category filter
        const matchesCat = selectedCategory === 'all' || mem.category === selectedCategory;

        // Mood filter
        const matchesMood = selectedMood === 'all' || mem.mood === selectedMood;

        return matchesSearch && matchesCat && matchesMood;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [data.memories, searchTerm, selectedCategory, selectedMood, sortBy]);

  const handleDeleteConfirm = () => {
    if (deleteCandidateId) {
      deleteMemory(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-[#EFE4D6] shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-rose-100 text-rose-600">
                <BookHeart className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Our Shared Memories</h1>
                <p className="text-xs text-slate-500">
                  {data.memories.length} timeless chapters in our journey together
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/journey"
              className="px-4 py-2.5 rounded-2xl bg-purple-50 text-purple-700 font-semibold text-xs sm:text-sm hover:bg-purple-100 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              <span>Train View</span>
            </Link>
            <Link
              href="/memories/new"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5A3A3] to-[#CBBEF4] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Memory</span>
            </Link>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#EFE4D6] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search memories by title, location, story, or #tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 bg-slate-50/50"
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 transition-all ${
                selectedCategory === 'all'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Mood Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Mood:</span>
            <button
              onClick={() => setSelectedMood('all')}
              className={`px-2.5 py-1 rounded-lg font-medium flex-shrink-0 ${
                selectedMood === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Any
            </button>
            {MOODS.map((m) => (
              <button
                key={m.mood}
                onClick={() => setSelectedMood(m.mood)}
                className={`px-2.5 py-1 rounded-lg font-medium flex-shrink-0 flex items-center gap-1 ${
                  selectedMood === m.mood
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Memories Grid */}
        {filteredMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMemories.map((mem) => {
              const primaryPhoto = mem.photos?.[0];
              // Check notes count visible to active user
              const visibleNotes = mem.notes?.filter(
                (n) => n.visibility === 'shared' || n.authorId === activeProfile.id
              ) || [];

              return (
                <div
                  key={mem.id}
                  className="rounded-3xl bg-white border border-[#EFE4D6] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Photo Header */}
                    <Link href={`/memories/${mem.id}`} className="block relative h-48 overflow-hidden bg-slate-100">
                      {primaryPhoto ? (
                        <img
                          src={primaryPhoto.url}
                          alt={mem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-[#F8C8D8] via-[#CBBEF4] to-[#B6DDF4] flex items-center justify-center text-4xl">
                          ✨
                        </div>
                      )}
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-semibold backdrop-blur-xs">
                          {mem.category}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/90 text-slate-800 text-xs font-semibold backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <Smile className="w-3.5 h-3.5 text-rose-500" />
                        <span className="capitalize">{mem.mood}</span>
                      </div>
                    </Link>

                    {/* Content Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(mem.date)}</span>
                        <span>•</span>
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{mem.location}</span>
                      </div>

                      <Link href={`/memories/${mem.id}`}>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-1">
                          {mem.title}
                        </h3>
                      </Link>

                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {mem.description}
                      </p>

                      {/* Perspective excerpt */}
                      {mem.perspectives?.[activeProfile.id] && (
                        <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100/80 text-[11px] text-purple-900 italic line-clamp-2">
                          <span className="font-bold not-italic text-purple-700">Your POV: </span>
                          "{mem.perspectives[activeProfile.id]}"
                        </div>
                      )}

                      {/* Tags */}
                      {mem.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {mem.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                          {mem.tags.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{mem.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Photos">
                        <GalleryIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{mem.photos?.length || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Notes">
                        <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                        <span>{visibleNotes.length}</span>
                      </span>
                      {mem.reactions?.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {mem.reactions.slice(0, 2).map((r) => r.emoji).join('')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteCandidateId(mem.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/memories/${mem.id}`}
                        className="font-bold text-purple-600 hover:text-purple-700"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white border border-[#EFE4D6] space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="font-bold text-slate-800 text-lg">No memories match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search keywords, category, or mood filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedMood('all');
              }}
              className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteCandidateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-lg font-bold text-slate-900">Delete this memory?</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Are you sure you want to delete this memory? It will be removed from your diary, train journey stations, and calendar.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteCandidateId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm"
                >
                  Yes, Delete Memory
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
