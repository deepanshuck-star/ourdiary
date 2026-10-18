'use client';

import React from 'react';
import { useReducedMotion } from 'motion/react';

interface FlipCardProps {
  /** Shown before flipping (e.g. the sealed side). */
  back: React.ReactNode;
  /** Shown after flipping (the revealed side). */
  front: React.ReactNode;
  flipped: boolean;
  className?: string;
  durationMs?: number;
}

/**
 * Two faces stacked in one grid cell (so the card is as tall as the taller face) that turn
 * over in 3D. With reduced motion the faces simply swap. The hidden face is inert.
 */
export function FlipCard({ back, front, flipped, className = '', durationMs = 350 }: FlipCardProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{flipped ? front : back}</div>;
  }

  const face: React.CSSProperties = {
    gridArea: '1 / 1',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div className={className} style={{ perspective: '1200px' }}>
      <div
        className="grid"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: `transform ${durationMs}ms cubic-bezier(0.3, 0.7, 0.2, 1)`,
        }}
      >
        <div style={face} inert={flipped} aria-hidden={flipped}>
          {back}
        </div>
        <div
          style={{ ...face, transform: 'rotateY(180deg)' }}
          inert={!flipped}
          aria-hidden={!flipped}
        >
          {front}
        </div>
      </div>
    </div>
  );
}
