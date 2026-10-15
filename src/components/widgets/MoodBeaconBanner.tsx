'use client';

import React, { useState } from 'react';
import { Sparkles, Heart, Smile, Send } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import { MoodType } from '@/types';
import { WarmHugModal } from './WarmHugModal';

const MOOD_CONFIG: Record<
  MoodType,
  { emoji: string; label: string; bg: string; text: string; border: string }
> = {
  happy: {
    emoji: '☀️',
    label: 'Happy & Energetic',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  cuddle: {
    emoji: '🧸',
    label: 'Needs Extra Hugs',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  low_battery: {
    emoji: '🔋',
    label: 'Low Battery / Tired',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  hangry: {
    emoji: '🍕',
    label: 'Hangry for Food',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
  },
  stressed: {
    emoji: '😤',
    label: 'Stressed from Work',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  romantic: {
    emoji: '💃',
    label: 'Romantic & Playful',
    bg: 'bg-pink-50',
    text: 'text-pink-800',
    border: 'border-pink-200',
  },
};

export function MoodBeaconBanner() {
  const { data, activeProfile, partnerProfile, updateMoodBeacon } = useDiary();
  const [showHugModal, setShowHugModal] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const activeId = data.activeProfileId;
  const partnerId = activeId === 'user_1' ? 'user_2' : 'user_1';

  const partnerMood = data.moodBeacons?.[partnerId];
  const myMood = data.moodBeacons?.[activeId];

  const currentPartnerConfig = partnerMood?.mood ? MOOD_CONFIG[partnerMood.mood] : MOOD_CONFIG.happy;
  const currentMyConfig = myMood?.mood ? MOOD_CONFIG[myMood.mood] : MOOD_CONFIG.happy;

  const handleSelectMood = (m: MoodType) => {
    updateMoodBeacon(m, customNote || undefined);
    setShowMoodPicker(false);
    setCustomNote('');
  };

  return (
    <>
      <div className="rounded-3xl bg-white border border-[#EFE4D6] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Partner's Emotional Mood Status */}
          <div className="flex items-center gap-3.5 flex-1">
            <div className={`w-12 h-12 rounded-2xl ${currentPartnerConfig.bg} border ${currentPartnerConfig.border} flex items-center justify-center text-2xl flex-shrink-0 shadow-2xs`}>
              {currentPartnerConfig.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {partnerProfile.name}’s Mood Right Now:
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentPartnerConfig.bg} ${currentPartnerConfig.text} border ${currentPartnerConfig.border}`}>
                  {currentPartnerConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 italic">
                {partnerMood?.customNote ? `"${partnerMood.customNote}"` : 'Everything is sweet & steady today.'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowHugModal(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Send a Warm Hug 🤗</span>
            </button>

            <button
              onClick={() => setShowMoodPicker(!showMoodPicker)}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>My Mood: {currentMyConfig.emoji}</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Mood Selector Drawer */}
        {showMoodPicker && (
          <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">How are you feeling right now?</span>
              <span className="text-[11px] text-slate-400">Updates instantly on {partnerProfile.name}'s screen</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {(Object.keys(MOOD_CONFIG) as MoodType[]).map((key) => {
                const cfg = MOOD_CONFIG[key];
                const isSelected = myMood?.mood === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectMood(key)}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? `${cfg.bg} ${cfg.border} ring-2 ring-purple-300 font-extrabold shadow-xs`
                        : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xl mb-1">{cfg.emoji}</div>
                    <span className="text-[11px] font-bold block truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <WarmHugModal isOpen={showHugModal} onClose={() => setShowHugModal(false)} />
    </>
  );
}
