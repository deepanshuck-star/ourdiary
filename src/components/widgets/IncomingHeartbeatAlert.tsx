'use client';

import React from 'react';
import {Heart, X, Check} from 'lucide-react';
import { useDiary } from '@/store/DiaryContext';
import {} from '@/lib/date-utils';

export function IncomingHeartbeatAlert() {
  const { data, activeProfile, markHeartbeatSeen, isHydrated } = useDiary();

  if (!isHydrated) return null;

  const hb = data.latestHeartbeat;
  if (!hb || hb.seen || hb.fromId === activeProfile.id) {
    return null;
  }

  const isWarmHug = hb.message?.startsWith('Warm Hug');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gradient-to-br from-white via-pink-50/50 to-purple-50/50 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border-2 border-rose-200 text-center space-y-5 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={markHeartbeatSeen}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Heartbeat Rings */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-rose-400/30 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-300">
            {isWarmHug ? (
              <span className="text-3xl animate-bounce">🤗</span>
            ) : (
              <Heart className="w-8 h-8 text-white fill-white animate-pulse" />
            )}
          </div>
        </div>

        {/* Header Content */}
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-100/80 px-3 py-1 rounded-full">
            {isWarmHug ? 'Warm Hug Delivered' : 'Heartbeat Love Ping'}
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-2">
            {hb.fromName} is thinking of you!
          </h3>
          <p className="text-xs text-slate-400">
            Sent just now • {new Date(hb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Partner Custom Message */}
        {hb.message && (
          <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs text-xs sm:text-sm text-slate-800 font-medium italic relative">
            <span className="text-rose-400 font-serif text-lg absolute top-2 left-2">“</span>
            <p className="px-3 leading-relaxed">{hb.message}</p>
            <span className="text-rose-400 font-serif text-lg absolute bottom-1 right-2">”</span>
          </div>
        )}

        {/* Receive Action */}
        <button
          onClick={markHeartbeatSeen}
          className="w-full py-3 px-4 font-extrabold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 bg-primary hover:bg-primary-hover text-on-primary shadow-cta rounded-full"
        >
          <Check className="w-4 h-4" />
          <span>Receive With Love 🥰</span>
        </button>
      </div>
    </div>
  );
}
