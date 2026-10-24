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
  Calendar,
  MapPin,
  Smile,
  MessageCircle,
  Image as GalleryIcon,
  Trash2,
  Compass,
} from 'lucide-react';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Card, Chip, inputClass } from '@/components/ui/Surface';
import { cn } from '@/lib/cn';

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
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header — sits on the dark, no box around it */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 px-1 pt-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <BookHeart className="w-5 h-5" />
              </span>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-normal tracking-tight text-ink">
                  Our Shared Memories
                </h1>
                <p className="text-xs text-ink-muted mt-1.5">
                  {data.memories.length} timeless chapters in our journey together
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ButtonLink href="/journey" variant="outline" size="sm">
              <Compass className="w-4 h-4 text-primary" />
              <span>Train View</span>
            </ButtonLink>
            <ButtonLink href="/memories/new" variant="primary" size="sm">
              <PlusCircle className="w-4 h-4" />
              <span>Record Memory</span>
            </ButtonLink>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search memories by title, location, story, or #tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(inputClass, 'pl-11 py-2.5')}
              />
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={cn(inputClass, 'w-full sm:w-auto py-2.5 text-xs font-semibold')}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <Button
              variant={selectedCategory === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0"
            >
              All Categories
            </Button>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="flex-shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Mood Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-[0.18em] mr-1 flex-shrink-0">
              Mood:
            </span>
            <Button
              variant={selectedMood === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedMood('all')}
              className="flex-shrink-0"
            >
              Any
            </Button>
            {MOODS.map((m) => (
              <Button
                key={m.mood}
                variant={selectedMood === m.mood ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedMood(m.mood)}
                className="flex-shrink-0"
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Memories Grid */}
        {filteredMemories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredMemories.map((mem) => {
              const primaryPhoto = mem.photos?.[0];
              // Check notes count visible to active user
              const visibleNotes = mem.notes?.filter(
                (n) => n.visibility === 'shared' || n.authorId === activeProfile.id
              ) || [];

              return (
                <Card
                  key={mem.id}
                  className="lift flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo Header */}
                    <Link href={`/memories/${mem.id}`} className="block relative h-56 overflow-hidden bg-canvas">
                      {primaryPhoto ? (
                        <img
                          src={primaryPhoto.url}
                          alt={mem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-hero">
                          ✨
                        </div>
                      )}
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <Chip tone="muted" className="bg-canvas/70 border-transparent text-ink backdrop-blur-sm">
                          {mem.category}
                        </Chip>
                      </div>
                      <Chip
                        tone="muted"
                        className="absolute top-3 right-3 bg-canvas/70 border-transparent text-ink backdrop-blur-sm"
                      >
                        <Smile className="w-3.5 h-3.5 text-primary" />
                        <span className="capitalize">{mem.mood}</span>
                      </Chip>
                    </Link>

                    {/* Content Body */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(mem.date)}</span>
                        <span>•</span>
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{mem.location}</span>
                      </div>

                      <Link href={`/memories/${mem.id}`}>
                        <h3 className="font-display text-xl sm:text-2xl font-normal tracking-tight text-ink group-hover:text-primary transition-colors line-clamp-1">
                          {mem.title}
                        </h3>
                      </Link>

                      <p className="text-xs sm:text-sm text-ink-muted line-clamp-2 leading-relaxed">
                        {mem.description}
                      </p>

                      {/* Perspective excerpt */}
                      {mem.perspectives?.[activeProfile.id] && (
                        <div className="p-3 rounded-xl bg-ink/5 border-l-2 border-primary text-[11px] text-ink-muted italic line-clamp-2">
                          <span className="font-semibold not-italic text-primary">Your POV: </span>
                          "{mem.perspectives[activeProfile.id]}"
                        </div>
                      )}

                      {/* Tags */}
                      {mem.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {mem.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-ink/5 text-ink-muted text-[10px] font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                          {mem.tags.length > 3 && (
                            <span className="text-[10px] text-ink-muted">+{mem.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-line flex items-center justify-between text-xs text-ink-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" title="Photos">
                        <GalleryIcon className="w-3.5 h-3.5" />
                        <span>{mem.photos?.length || 0}</span>
                      </span>
                      <span className="flex items-center gap-1" title="Notes">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{visibleNotes.length}</span>
                      </span>
                      {mem.reactions?.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          {mem.reactions.slice(0, 2).map((r) => r.emoji).join('')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <IconButton
                        label="Delete memory"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteCandidateId(mem.id)}
                        className="hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                      <Link
                        href={`/memories/${mem.id}`}
                        className="font-semibold text-primary hover:text-primary-hover"
                      >
                        Open →
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card tone="flat" className="p-12 text-center space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="font-display text-xl font-normal text-ink">No memories match your filter</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              Try adjusting your search keywords, category, or mood filters.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedMood('all');
              }}
            >
              Reset Filters
            </Button>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        {deleteCandidateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <Card className="p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="font-display text-xl font-normal text-ink">Delete this memory?</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Are you sure you want to delete this memory? It will be removed from your diary, train journey stations, and calendar.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteCandidateId(null)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
                  Yes, Delete Memory
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
