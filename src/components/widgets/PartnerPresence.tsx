'use client';

import React from 'react';
import { usePresence } from '@/components/providers/PresenceProvider';
import { useDiary } from '@/store/DiaryContext';

const TONE_DOT: Record<string, string> = {
  online: 'bg-emerald-500',
  recent: 'bg-amber-400',
  offline: 'bg-slate-300',
  unknown: 'bg-slate-300',
};

/**
 * The status dot itself. `available` is false in demo mode and before a
 * partner has joined, where there is nobody to be online — it renders
 * nothing at all rather than a dot that means nothing.
 */
export function PresenceDot({ className = '' }: { className?: string }) {
  const { available, partnerOnline, label } = usePresence();
  if (!available) return null;
  return (
    <span
      className={`rounded-full border-2 border-surface ${TONE_DOT[label.tone] || TONE_DOT.offline} ${
        partnerOnline ? 'motion-safe:animate-pulse' : ''
      } ${className}`}
      title={label.text}
      aria-label={label.text}
      role="img"
    />
  );
}

/** Partner avatar + status, for the navbar. */
export function PartnerPresenceChip() {
  const { partnerProfile } = useDiary();
  const { available, partnerOnline, partnerTyping, label } = usePresence();
  if (!available) return null;

  return (
    <span
      className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-surface border border-line"
      title={`${partnerProfile.name} — ${label.text}`}
    >
      <span className="relative flex-shrink-0">
        <img
          src={partnerProfile.avatar}
          alt=""
          className={`w-7 h-7 rounded-full object-cover ${partnerOnline ? 'ring-2 ring-emerald-400' : 'opacity-70'}`}
        />
        <PresenceDot className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-ink-muted">
        {partnerTyping ? `${partnerProfile.name} is typing…` : label.text}
      </span>
    </span>
  );
}
