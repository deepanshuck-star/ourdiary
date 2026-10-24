'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { MemoryCategory, Mood, MemoryPhoto } from '@/types';

// Defined at module scope (not inside the component) so these impure calls
// are never associated with render — they only ever run inside event
// handlers (photo upload / preset selection), never during render itself.
function makePhotoId(prefix: string): string {
  return `${prefix}_${Date.now()}${Math.random().toString(36).substring(2, 5)}`;
}
function nowIso(): string {
  return new Date().toISOString();
}
import {
  BookHeart,
  Calendar,
  MapPin,
  Tag,
  UploadCloud,
  X,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Chip, Field, inputClass } from '@/components/ui/Surface';
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

const DEMO_PRESET_PHOTOS = [
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
];

export default function NewMemoryPage() {
  const router = useRouter();
  const { activeProfile, addMemory } = useDiary();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2025-04-12');

  React.useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('Outing');
  const [mood, setMood] = useState<Mood>('happy');
  const [description, setDescription] = useState('');
  const [myPerspective, setMyPerspective] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);

  // Handle local file selection preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newPhoto: MemoryPhoto = {
            id: makePhotoId('p_loc'),
            url: event.target.result as string,
            caption: file.name,
            dateAdded: nowIso(),
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addPresetPhoto = (url: string) => {
    const newPhoto: MemoryPhoto = {
      id: makePhotoId('p_pre'),
      url,
      caption: 'Couple moment',
      dateAdded: nowIso(),
    };
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter((t) => t.length > 0);

    const created = addMemory({
      title: title.trim(),
      date,
      description: description.trim(),
      mood,
      category,
      location: location.trim() || 'Somewhere Special',
      photos,
      tags,
      createdBy: activeProfile.id,
      perspectives: {
        [activeProfile.id]: myPerspective.trim() || undefined,
      },
    });

    router.push(`/memories/${created.id}`);
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="px-0">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Creating as:</span>
            <Chip tone="primary">
              <img src={activeProfile.avatar} alt={activeProfile.name} className="w-4 h-4 rounded-full" />
              <span>{activeProfile.name}</span>
            </Chip>
          </div>
        </div>

        {/* Main Form Card */}
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-4 pb-6 mb-8 border-b border-line">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-beam shadow-cta flex-shrink-0">
              <BookHeart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink">
                Record a New Memory
              </h1>
              <p className="text-xs text-ink-muted mt-1">
                Log a moment for your love story. It will automatically appear on the Train Journey and Calendar!
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <Field id="memory-title" label="Memory Title *">
              <input
                id="memory-title"
                type="text"
                required
                placeholder="e.g. Midnight stargazing on the hill..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </Field>

            {/* Date & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="memory-date" label="Date *">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="memory-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </Field>

              <Field id="memory-location" label="Location">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="memory-location"
                    type="text"
                    placeholder="e.g. Blue Heron Cafe, Downtown"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={cn(inputClass, 'pl-11')}
                  />
                </div>
              </Field>
            </div>

            {/* Category & Mood */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="memory-category" label="Category">
                <select
                  id="memory-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                  className={inputClass}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="memory-mood" label="Mood">
                <select
                  id="memory-mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value as Mood)}
                  className={inputClass}
                >
                  {MOODS.map((m) => (
                    <option key={m.mood} value={m.mood}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Shared Story Description */}
            <Field id="memory-description" label="The Shared Story *">
              <textarea
                id="memory-description"
                required
                rows={4}
                placeholder="What happened on this day? Write down the details so neither of you ever forgets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </Field>

            {/* Your Perspective (Author POV) */}
            <Field
              id="memory-perspective"
              label={`Your Personal Perspective (${activeProfile.name})`}
              hint="Both of you can read and write your perspectives in the memory detail page!"
            >
              <textarea
                id="memory-perspective"
                rows={2}
                placeholder={`What were you privately thinking or feeling during this moment, ${activeProfile.name}?`}
                value={myPerspective}
                onChange={(e) => setMyPerspective(e.target.value)}
                className={cn(inputClass, 'border-primary/25')}
              />
            </Field>

            {/* Tags */}
            <Field id="memory-tags" label="Tags (comma separated)">
              <div className="relative">
                <Tag className="w-4 h-4 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="memory-tags"
                  type="text"
                  placeholder="e.g. Roadtrip, Sunset, Laughs, FirstDate"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className={cn(inputClass, 'pl-11')}
                />
              </div>
            </Field>

            {/* Photos Section */}
            <div className="space-y-4 pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Photos & Memories
              </label>

              {/* Upload or Preset Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-5 py-2.5 rounded-full bg-surface border border-line text-ink text-xs font-semibold flex items-center gap-2 shadow-sm bloom">
                  <UploadCloud className="w-4 h-4 text-primary" />
                  <span>Choose Local Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <span className="text-xs text-ink-muted">or pick quick couple presets:</span>

                <div className="flex items-center gap-2">
                  {DEMO_PRESET_PHOTOS.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => addPresetPhoto(url)}
                      className="w-9 h-9 rounded-xl overflow-hidden hover:scale-110 transition-transform"
                      title="Add sample photo"
                    >
                      <img src={url} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Preview Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative rounded-2xl overflow-hidden h-32 group">
                      <img src={p.url} alt="Memory" className="w-full h-full object-cover" />
                      <IconButton
                        label="Remove photo"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 text-snow hover:text-snow hover:bg-danger-solid"
                      >
                        <X className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-line flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Sparkles className="w-4 h-4" />
                <span>Save to Our Diary</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
