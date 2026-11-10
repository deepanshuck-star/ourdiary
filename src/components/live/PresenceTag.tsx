'use client';

import React from 'react';

/**
 * "In the game" / "Not in the game" under a player's name.
 *
 * Renders nothing when presence can't be known (demo mode, or no partner yet)
 * — a dot that is always green would be worse than no dot.
 */
export function PresenceTag({
  available,
  here,
  isMe = false,
  where = 'the game',
  className = '',
}: {
  available: boolean;
  here: boolean;
  isMe?: boolean;
  where?: string;
  className?: string;
}) {
  if (!available) return null;
  const on = isMe || here;
  const text = isMe ? 'You’re here' : here ? `In ${where}` : `Not in ${where}`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold leading-none ${
        on ? 'text-success' : 'text-ink-muted'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-ink-muted/50'}`}
      />
      {text}
    </span>
  );
}
