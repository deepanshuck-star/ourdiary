'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useDiary } from '@/store/DiaryContext';
import { useSpaceMode } from '@/hooks/useSpaceMode';
import { formatDate } from '@/lib/date-utils';
import { BucketCategory, BucketItem } from '@/types';
import confetti from 'canvas-confetti';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  Sparkles,
  Calendar,
  Trash2,
  Edit3,
  BookHeart,
  X,
} from 'lucide-react';

const CATEGORIES: BucketCategory[] = ['Travel', 'Food', 'Movies', 'Activities', 'Milestones'];

const CATEGORY_ICONS: Record<BucketCategory, string> = {
  Travel: '✈️',
  Food: '🍝',
  Movies: '🍿',
  Activities: '🧗',
  Milestones: '💍',
};

export default function BucketListPage() {
  const {
    data,
    activeProfile,
    addBucketItem,
    updateBucketItem,
    toggleBucketItem,
    deleteBucketItem,
    convertBucketToMemory,
  } = useDiary();
  const { isPersonal, note: spaceNote, title: spaceTitle } = useSpaceMode();
  const note = spaceNote('/bucket-list');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BucketCategory>('Travel');
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');

  // Statistics
  const totalItems = data.bucketList.length;
  const completedItems = data.bucketList.filter((b) => b.completed).length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Filtered List
  const filteredList = useMemo(() => {
    return data.bucketList.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'completed' && item.completed) ||
        (filterStatus === 'pending' && !item.completed);
      return matchCat && matchStatus;
    });
  }, [data.bucketList, selectedCategory, filterStatus]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Travel');
    setTargetDate('');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: BucketItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setTargetDate(item.targetDate || '');
    setNotes(item.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      updateBucketItem(editingId, {
        title: title.trim(),
        category,
        targetDate: targetDate || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addBucketItem({
        title: title.trim(),
        category,
        completed: false,
        targetDate: targetDate || undefined,
        notes: notes.trim() || undefined,
        createdBy: activeProfile.id,
      });
    }

    setShowModal(false);
  };

  const handleToggle = (id: string, willComplete: boolean) => {
    toggleBucketItem(id);
    if (willComplete) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#BE185D', '#F9A8D4', '#E11D48', '#FBCFE8'],
        disableForReducedMotion: true,
      });
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header & Progress Banner */}
        <div className="p-6 sm:p-8 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-hero">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-white/80 text-teal-700 shadow-xs">
                <CheckSquare className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {spaceTitle('/bucket-list', 'Couple Bucket List')}
              </h1>
            </div>
            {!isPersonal && (
              <p className="text-sm text-slate-700 font-medium">
                Dreams, adventures & goals for {data.couple.name} to conquer together
              </p>
            )}
            {note && <p className="text-sm text-ink-muted mt-2 max-w-2xl">{note}</p>}
          </div>

          <div className="w-full md:w-64 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Accomplished</span>
              <span className="text-purple-700">
                {completedItems} / {totalItems} ({progressPercent}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-purple-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Controls & Add Button */}
        <div className="p-4 rounded-3xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-50 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  filterStatus === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  filterStatus === 'pending' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  filterStatus === 'completed' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                }`}
              >
                Done
              </button>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 font-bold text-xs flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal</span>
            </button>
          </div>
        </div>

        {/* Bucket List Items */}
        <div className="space-y-3">
          {filteredList.length > 0 ? (
            filteredList.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  item.completed
                    ? 'bg-emerald-50/40 border-emerald-200 text-slate-700'
                    : 'bg-white border-line shadow-xs hover:border-purple-300'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Completion Checkbox */}
                  <button
                    onClick={() => handleToggle(item.id, !item.completed)}
                    className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
                    title={item.completed ? 'Mark pending' : 'Mark completed!'}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-100" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-300 hover:text-purple-400" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {CATEGORY_ICONS[item.category]} {item.category}
                      </span>
                      {item.completedDate && (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Completed on {formatDate(item.completedDate)} 🎉
                        </span>
                      )}
                      {!item.completed && item.targetDate && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Target: {formatDate(item.targetDate)}
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-base font-bold ${
                        item.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </h4>

                    {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {item.completed && !item.memoryId && (
                    <button
                      onClick={() => convertBucketToMemory(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Log this as an official memory in your diary & train journey"
                    >
                      <BookHeart className="w-3.5 h-3.5 text-purple-600" />
                      <span>Log as Memory</span>
                    </button>
                  )}

                  {item.memoryId && (
                    <Link
                      href={`/memories/${item.memoryId}`}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>View Memory</span>
                    </Link>
                  )}

                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteBucketItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center rounded-3xl bg-white border border-line space-y-3">
              <div className="text-5xl">✨</div>
              <h3 className="font-bold text-slate-800 text-lg">No bucket list items here</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add an adventure or dream you want to experience together!
              </p>
            </div>
          )}
        </div>

        {/* Modal: Add or Edit Bucket Item */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-lg text-slate-900">
                  {editingId ? 'Edit Bucket Item' : 'Add to Couple Bucket List'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Goal / Experience Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Watch the Northern Lights, Bake handmade pasta..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as BucketCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_ICONS[cat]} {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Target Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notes / Ideas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Where to go, who to ask, or why this matters to us..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-focus"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
                  >
                    {editingId ? 'Update Goal' : 'Add to Bucket List'}
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
