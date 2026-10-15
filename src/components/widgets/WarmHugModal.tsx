'use client';

import React, { useState } from 'react';
import { Heart, Sparkles, Send, X } from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';

interface WarmHugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WarmHugModal({ isOpen, onClose }: WarmHugModalProps) {
  const { partnerProfile, sendWarmHug } = useDiary();
  const [hugMessage, setHugMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSendHug = (e: React.FormEvent) => {
    e.preventDefault();
    sendWarmHug(hugMessage.trim() || undefined);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setHugMessage('');
      onClose();
    }, 1400);
  };

  const presetHugNotes = [
    'Take a breath, I am here for you! 🤗',
    'I’m cooking your favorite dinner tonight! 🍝',
    'Wrapping you in the warmest cozy blanket hug 🧸',
    'Proud of you and how hard you worked today! ✨',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 space-y-4 relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-2xl shadow-md shadow-purple-200">
            🤗
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Send Warm Hug to {partnerProfile.name}
            </h3>
            <p className="text-xs text-purple-600 font-semibold mt-0.5">
              Let them know they are loved and cared for
            </p>
          </div>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-90">
            <div className="text-4xl animate-bounce">🫂💖</div>
            <p className="font-extrabold text-slate-900 text-sm">Warm Hug Delivered!</p>
            <p className="text-xs text-slate-500">
              {partnerProfile.name} will receive your hug and sweet message!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendHug} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Attach a sweet hug note (optional):
              </label>
              <textarea
                rows={2}
                value={hugMessage}
                onChange={(e) => setHugMessage(e.target.value)}
                placeholder="e.g. You got this baby, see you in a few hours! ❤️"
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-300 focus:outline-hidden bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Quick sweet notes:
              </span>
              <div className="flex flex-col gap-1.5">
                {presetHugNotes.slice(0, 3).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHugMessage(preset)}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-800 hover:bg-purple-100 transition-colors text-left font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Send Warm Hug & Message 🤗💕</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
