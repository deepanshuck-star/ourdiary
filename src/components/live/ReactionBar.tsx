'use client';

import React from 'react';
import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/features/reactions';

/**
 * A row of emoji buttons. Scrolls sideways on a narrow phone rather than
 * wrapping, so it never pushes the board further down the screen.
 */
export function ReactionBar({
  onReact,
  label = 'Send a reaction',
  emojis = REACTION_EMOJIS,
  className = '',
}: {
  onReact: (emoji: ReactionEmoji) => void;
  label?: string;
  emojis?: readonly ReactionEmoji[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex items-center gap-1 overflow-x-auto no-scrollbar ${className}`}>
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl leading-none bg-surface border border-line hover:border-primary hover:scale-110 active:scale-90 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
