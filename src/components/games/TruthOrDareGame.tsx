'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Heart, Smile, Sparkles, Shuffle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { useLocalState } from '@/lib/local-store';
import {
  getRandomPrompt,
  TRUTH_OR_DARE_PROMPTS,
  type GameCategory,
  type TruthOrDareItem,
} from '@/lib/features/games';

export function TruthOrDareGame() {
  const { data } = useDiary();
  const coupleId = data.couple.id;

  const [category, setCategory] = useState<GameCategory | 'all'>('romantic');
  const selectedType = 'any';
  const [currentPrompt, setCurrentPrompt] = useState<TruthOrDareItem>(() => getRandomPrompt('romantic', 'any'));
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [turn, setTurn] = useState<'user_1' | 'user_2'>('user_1');
  const [completedCount, setCompletedCount] = useLocalState<number>(`games:tod_count:${coupleId || 'demo'}`, 0);

  // Timer for timed dares
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Custom prompt creation
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customType, setCustomType] = useState<'truth' | 'dare'>('truth');
  const [customCategory, setCustomCategory] = useState<GameCategory>('romantic');
  const [customPrompts, setCustomPrompts] = useLocalState<TruthOrDareItem[]>(
    `games:custom_tod:${coupleId || 'demo'}`,
    []
  );

  const user1Name = data.couple.user1.name;
  const user2Name = data.couple.user2.name;
  const activePlayerName = turn === 'user_1' ? user1Name : user2Name;

  // Handle countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const handleNextPrompt = (forcedType?: 'truth' | 'dare') => {
    const typeToUse = forcedType || selectedType;
    const allAvailable = [...TRUTH_OR_DARE_PROMPTS, ...customPrompts];
    
    // Filter by category and type
    const pool = allAvailable.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (typeToUse !== 'any' && p.type !== typeToUse) return false;
      return !usedIds.includes(p.id);
    });

    const chosenPool = pool.length > 0 ? pool : allAvailable.filter(
      (p) => (category === 'all' || p.category === category) && (typeToUse === 'any' || p.type === typeToUse)
    );

    const next = chosenPool[Math.floor(Math.random() * chosenPool.length)] || TRUTH_OR_DARE_PROMPTS[0];
    setCurrentPrompt(next);
    setUsedIds((prev) => [...prev, next.id]);
    setIsTimerRunning(false);
    setTimerSeconds(next.durationSec || null);
  };

  const handleComplete = () => {
    setCompletedCount((prev) => prev + 1);
    setTurn((prev) => (prev === 'user_1' ? 'user_2' : 'user_1'));
    handleNextPrompt();
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const newItem: TruthOrDareItem = {
      id: `custom_${Date.now()}`,
      type: customType,
      category: customCategory,
      text: customText.trim(),
    };

    setCustomPrompts((prev) => [newItem, ...prev]);
    setCurrentPrompt(newItem);
    setCustomText('');
    setShowCustomModal(false);
  };

  const categories: { key: GameCategory | 'all'; label: string; icon: any; color: string }[] = [
    { key: 'romantic', label: 'Romantic', icon: Heart, color: 'text-rose-500 bg-rose-50 border-rose-200' },
    { key: 'playful', label: 'Playful', icon: Smile, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { key: 'intimate', label: 'Intimate', icon: Sparkles, color: 'text-purple-500 bg-purple-50 border-purple-200' },
    { key: 'spicy', label: 'Spicy 🔥', icon: Flame, color: 'text-red-500 bg-red-50 border-red-200' },
    { key: 'all', label: 'Mix All', icon: Shuffle, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Category selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((c) => {
          const Icon = c.icon;
          const isSelected = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setCategory(c.key);
                setUsedIds([]);
              }}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
                isSelected
                  ? 'border-primary bg-primary text-on-primary shadow-xs scale-102'
                  : 'border-line bg-surface hover:bg-canvas text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Turn & Score Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-line">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-ink-muted">It’s your turn:</span>
          <strong className="text-sm text-ink">{activePlayerName}</strong>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Completed:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
            {completedCount} 🔥
          </span>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-surface via-surface to-canvas border-2 border-line shadow-card text-center overflow-hidden">
        {/* Type Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest ${
              currentPrompt.type === 'truth'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            {currentPrompt.type}
          </span>
          <span className="text-xs font-semibold text-ink-muted capitalize">
            • {currentPrompt.category}
          </span>
        </div>

        {/* Prompt Content */}
        <div className="min-h-[120px] flex items-center justify-center px-4">
          <p className="font-display text-xl sm:text-2xl font-bold text-ink leading-relaxed">
            "{currentPrompt.text}"
          </p>
        </div>

        {/* Timer Section (if applicable) */}
        {timerSeconds !== null && (
          <div className="mt-4 pt-4 border-t border-line/60 inline-flex flex-col items-center">
            <div className="flex items-center gap-2 text-primary font-mono text-xl font-bold">
              <Clock className="w-5 h-5" />
              <span>{timerSeconds}s</span>
            </div>
            <button
              type="button"
              onClick={() => setIsTimerRunning((v) => !v)}
              className="mt-2 text-xs font-semibold text-ink-muted hover:text-primary transition-colors underline"
            >
              {isTimerRunning ? 'Pause Timer' : timerSeconds === 0 ? 'Restart Timer' : 'Start Countdown'}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleComplete}
            className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-cta transition-transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed! Next Turn</span>
          </button>

          <button
            type="button"
            onClick={() => handleNextPrompt('truth')}
            className="px-4 py-2.5 rounded-full border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
          >
            Pick a Truth
          </button>

          <button
            type="button"
            onClick={() => handleNextPrompt('dare')}
            className="px-4 py-2.5 rounded-full border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
          >
            Pick a Dare
          </button>
        </div>
      </div>

      {/* Custom Dare / Truth Creator Button */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-ink-muted">
          Add secret questions or spicy dares only the two of you know!
        </p>
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Prompt</span>
        </button>
      </div>

      {/* Custom Prompt Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-line rounded-3xl p-6 shadow-card space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="font-display text-lg font-bold text-ink">Add a Secret Couple Prompt 💕</h3>
            
            <form onSubmit={handleAddCustom} className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomType('truth')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    customType === 'truth'
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  Truth
                </button>
                <button
                  type="button"
                  onClick={() => setCustomType('dare')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    customType === 'dare'
                      ? 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-line text-ink-muted'
                  }`}
                >
                  Dare
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Category</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as GameCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-canvas text-ink"
                >
                  <option value="romantic">Romantic</option>
                  <option value="playful">Playful</option>
                  <option value="intimate">Intimate</option>
                  <option value="spicy">Spicy</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-muted block mb-1">Prompt Text</label>
                <textarea
                  rows={3}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="e.g. Kiss me for 10 seconds without letting go..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-line bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-focus"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-full border border-line text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
                >
                  Save & Play
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
