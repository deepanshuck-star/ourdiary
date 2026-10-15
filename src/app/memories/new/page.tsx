'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { MemoryCategory, Mood, MemoryPhoto } from '@/types';
import {
  BookHeart,
  Calendar,
  MapPin,
  Smile,
  Tag,
  Image as GalleryIcon,
  UploadCloud,
  X,
  Sparkles,
  ArrowLeft,
  Check,
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

const DEMO_PRESET_PHOTOS = [
  'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop&q=80',
];

export default function NewMemoryPage() {
  const router = useRouter();
  const { data, activeProfile, partnerProfile, addMemory } = useDiary();

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
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

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
            id: 'p_loc_' + Date.now() + Math.random().toString(36).substring(2, 5),
            url: event.target.result as string,
            caption: file.name,
            dateAdded: new Date().toISOString(),
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addPresetPhoto = (url: string) => {
    const newPhoto: MemoryPhoto = {
      id: 'p_pre_' + Date.now() + Math.random().toString(36).substring(2, 5),
      url,
      caption: 'Couple moment',
      dateAdded: new Date().toISOString(),
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Creating as:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-800 text-xs font-bold">
              <img src={activeProfile.avatar} alt={activeProfile.name} className="w-4 h-4 rounded-full" />
              <span>{activeProfile.name}</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="rounded-3xl bg-white border border-[#EFE4D6] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F8C8D8] to-[#CBBEF4] flex items-center justify-center text-white shadow-sm">
              <BookHeart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Record a New Memory</h1>
              <p className="text-xs text-slate-500">
                Log a moment for your love story. It will automatically appear on the Train Journey and Calendar!
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Memory Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Midnight stargazing on the hill..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            {/* Date & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Blue Heron Cafe, Downtown"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>
            </div>

            {/* Category & Mood */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mood
                </label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value as Mood)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                >
                  {MOODS.map((m) => (
                    <option key={m.mood} value={m.mood}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shared Story Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                The Shared Story *
              </label>
              <textarea
                required
                rows={4}
                placeholder="What happened on this day? Write down the details so neither of you ever forgets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
            </div>

            {/* Your Perspective (Author POV) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Personal Perspective ({activeProfile.name})
              </label>
              <textarea
                rows={2}
                placeholder={`What were you privately thinking or feeling during this moment, ${activeProfile.name}?`}
                value={myPerspective}
                onChange={(e) => setMyPerspective(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Both of you can read and write your perspectives in the memory detail page!
              </p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tags (comma separated)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Roadtrip, Sunset, Laughs, FirstDate"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>

            {/* Photos Section */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Photos & Memories
              </label>

              {/* Upload or Preset Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors">
                  <UploadCloud className="w-4 h-4 text-purple-600" />
                  <span>Choose Local Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <span className="text-xs text-slate-400">or pick quick couple presets:</span>

                <div className="flex items-center gap-2">
                  {DEMO_PRESET_PHOTOS.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => addPresetPhoto(url)}
                      className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:scale-110 transition-transform"
                      title="Add sample photo"
                    >
                      <img src={url} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Preview Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden h-28 group border border-slate-200">
                      <img src={p.url} alt="Memory" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5A3A3] via-[#CBBEF4] to-[#B6DDF4] text-slate-900 font-bold text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-700" />
                <span>Save to Our Diary</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
