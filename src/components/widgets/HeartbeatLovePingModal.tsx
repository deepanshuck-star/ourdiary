'use client';

import React, { useState } from 'react';
import {Heart, Send, Flame, X} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';

interface HeartbeatLovePingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeartbeatLovePingModal({ isOpen, onClose }: HeartbeatLovePingModalProps) {
  const { data, partnerProfile, sendHeartbeatPing } = useDiary();
  const [customMsg, setCustomMsg] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const streak = data.heartbeatStreak || 1;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendHeartbeatPing(customMsg.trim() || undefined);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setCustomMsg('');
      onClose();
    }, 1400);
  };

  const presetMessages = [
    'Thinking of you right now! 💓',
    'Just saw something that reminded me of you ✨',
    'Sending you the biggest virtual hug 🤗',
    'Can’t wait to see your smile tonight 🥰',
    'Counting down the hours until our date ⏰💖',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 space-y-4 relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
            <Heart className="w-6 h-6 fill-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Send Heartbeat to {partnerProfile.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold mt-0.5">
              <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{streak}-Day Love Ping Streak!</span>
            </div>
          </div>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in-90">
            <div className="text-4xl animate-bounce">💓</div>
            <p className="font-extrabold text-slate-900 text-sm">Heartbeat Sent!</p>
            <p className="text-xs text-slate-500">
              When {partnerProfile.name} opens their dashboard, they will get a special animated pulse!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Attach a small cute message (optional):
              </label>
              <textarea
                rows={2}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="e.g. Can't wait for our cozy movie night tonight! 🍿"
                className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-rose-300 focus:outline-hidden bg-slate-50"
              />
            </div>

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Quick taps:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetMessages.slice(0, 3).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomMsg(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-100 text-pink-700 hover:bg-pink-100 transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-extrabold shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Heartbeat Love Ping 💓</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
