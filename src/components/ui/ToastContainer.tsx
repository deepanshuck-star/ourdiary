'use client';

import React from 'react';
import { useDiary } from '@/store/DiaryContext';
import { X, Heart, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, dismissToast } = useDiary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'heart':
              return <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />;
            case 'info':
              return <Info className="w-5 h-5 text-indigo-500" />;
            case 'warn':
              return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default:
              return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
          }
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-rose-100 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-rose-50 flex-shrink-0">
                {getIcon()}
              </div>
              <p className="text-sm font-medium text-slate-800 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
