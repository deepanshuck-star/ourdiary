'use client';

import { Box, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shown in place of a 3D scene when WebGL is missing or the viewer prefers reduced motion. */
export function ThreeFallback({
  reason,
  onShowAnyway,
  children,
}: {
  reason: 'no-webgl' | 'reduced-motion';
  onShowAnyway?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] bg-surface border border-line shadow-card p-6 sm:p-8 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full bg-purple-100 text-primary flex items-center justify-center flex-shrink-0">
          {reason === 'no-webgl' ? <Box className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </span>
        <div className="space-y-1">
          <h3 className="font-display text-lg text-ink">
            {reason === 'no-webgl' ? '3D isn’t available here' : 'Keeping things still for you'}
          </h3>
          <p className="text-xs text-ink-muted max-w-md">
            {reason === 'no-webgl'
              ? 'This browser or device can’t draw 3D graphics, so here’s a calmer view instead.'
              : 'Your device asks for reduced motion, so the 3D scene is paused. You can still open it, and it won’t spin on its own.'}
          </p>
        </div>
      </div>
      {reason === 'reduced-motion' && onShowAnyway && (
        <button
          onClick={onShowAnyway}
          className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold shadow-cta"
        >
          Show 3D anyway
        </button>
      )}
      {children}
    </div>
  );
}

export function ThreeLoading({ text, className = 'h-[420px]' }: { text: string; className?: string }) {
  return (
    <div
      className={`${className} rounded-[1.25rem] bg-hero border border-line shadow-card flex items-center justify-center`}
      role="status"
    >
      <span className="text-xs font-semibold text-ink-muted animate-pulse">{text}</span>
    </div>
  );
}
