'use client';

import React from 'react';
import type { LiveReaction } from '@/lib/features/reactions';

/**
 * Emoji drifting up the screen. Fixed to the viewport and click-through, so it
 * floats over whatever is underneath without ever blocking a tap on the board.
 * The sender picks the horizontal position, so both phones show the kiss
 * rising from the same side.
 */
export function FloatingReactions({ reactions, myId }: { reactions: LiveReaction[]; myId: string | null }) {
  if (reactions.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {reactions.map((r, i) => (
        <span
          key={r.id}
          className="od-reaction absolute bottom-24 text-4xl sm:text-5xl select-none"
          style={
            {
              left: `${r.x * 100}%`,
              // Alternate the sway so a burst fans out instead of stacking.
              '--od-drift': `${i % 2 === 0 ? 1 : -1}${10 + (i % 3) * 8}px`,
              filter: r.from === myId ? undefined : 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.7))',
            } as React.CSSProperties
          }
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
