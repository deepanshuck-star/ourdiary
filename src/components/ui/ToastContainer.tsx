'use client';

import React from 'react';
import { useDiary } from '@/store/DiaryContext';
import { IconButton } from '@/components/ui/Button';
import { X, Heart, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

/**
 * Toasts are the one thing allowed to interrupt, so they are lit like a
 * panel that has just been switched on: surface over a blurred canvas, a
 * hairline of light along the top edge, and a deep drop so they float clear
 * of whatever they land on.
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useDiary();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'heart':
              return <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" />;
            case 'info':
              return <Info className="w-5 h-5 text-secondary" />;
            case 'warn':
              return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            default:
              return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
          }
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 bg-surface/95 backdrop-blur-md rounded-2xl shadow-card border border-line edge-lit transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-ink/5 flex-shrink-0">
                {getIcon()}
              </div>
              <p className="text-sm text-ink leading-snug">{toast.message}</p>
            </div>
            <IconButton
              label="Close notification"
              variant="ghost"
              size="sm"
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 text-ink-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
