'use client';

import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { envelopeTimeline, type EnvelopePhase } from '@/lib/features/fx-math';

interface EnvelopeGateProps {
  /** Envelope paper colour (the letter's chosen colour). */
  color?: string;
  title?: string;
  /** Called if the reader dismisses while the envelope is still opening. */
  onDismiss?: () => void;
  /** The letter itself, rendered once the envelope has opened. */
  children: React.ReactNode;
}

const ORDER: EnvelopePhase[] = ['closed', 'crack', 'flap', 'slide', 'done'];
const reached = (phase: EnvelopePhase, target: EnvelopePhase) =>
  ORDER.indexOf(phase) >= ORDER.indexOf(target);

/**
 * Plays a CSS-3D envelope opening (wax seal cracks, flap swings open, letter slides up)
 * and then renders its children. Mount it with a `key` per letter so every opening replays.
 * Reduced motion skips straight to the letter; any click or key also skips ahead.
 */
export function EnvelopeGate({ color = '#F8C8D8', title, onDismiss, children }: EnvelopeGateProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<EnvelopePhase>('closed');

  useEffect(() => {
    if (reduceMotion) return;
    const timers = envelopeTimeline(false)
      .filter((s) => s.at > 0)
      .map((s) => window.setTimeout(() => setPhase(s.phase), s.at));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || phase === 'done') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss?.();
      else if (e.key === 'Enter' || e.key === ' ') setPhase('done');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, reduceMotion, onDismiss]);

  if (reduceMotion || phase === 'done') return <>{children}</>;

  const cracked = reached(phase, 'crack');
  const flapOpen = reached(phase, 'flap');
  const sliding = reached(phase, 'slide');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={() => setPhase('done')}
      role="dialog"
      aria-modal="true"
      aria-label={title ? `Opening letter: ${title}` : 'Opening letter'}
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="relative w-[18rem] h-[12rem] sm:w-[22rem] sm:h-[14.5rem]"
          style={{ perspective: '900px' }}
          aria-hidden="true"
        >
          {/* Envelope back (inside) */}
          <div
            className="absolute inset-0 rounded-xl shadow-2xl"
            style={{ background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 82%, black))` }}
          />

          {/* Letter paper */}
          <div
            className="absolute left-[7%] right-[7%] top-[10%] bottom-[6%] rounded-lg bg-[#FFFDF9] shadow-md p-4 space-y-2"
            style={{
              zIndex: 2,
              transform: sliding ? 'translateY(-58%)' : 'translateY(0)',
              transition: 'transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div className="h-2 w-1/2 rounded-full bg-[#F3D3E0]" />
            <div className="h-2 w-5/6 rounded-full bg-[#F3D3E0]/70" />
            <div className="h-2 w-2/3 rounded-full bg-[#F3D3E0]/70" />
            <div className="h-2 w-3/4 rounded-full bg-[#F3D3E0]/70" />
          </div>

          {/* Front pocket */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              zIndex: 3,
              background: `linear-gradient(160deg, color-mix(in oklab, ${color} 92%, white), ${color})`,
              clipPath: 'polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)',
            }}
          />

          {/* Top flap */}
          <div
            className="absolute inset-x-0 top-0 h-[58%]"
            style={{
              zIndex: flapOpen ? 1 : 4,
              transformOrigin: 'top center',
              transformStyle: 'preserve-3d',
              transform: flapOpen ? 'rotateX(180deg)' : 'rotateX(0deg)',
              transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, color-mix(in oklab, ${color} 88%, black), ${color})`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))',
              }}
            />
          </div>

          {/* Wax seal — splits in two as it cracks */}
          <div
            className="absolute left-1/2 top-[58%] w-14 h-14 -translate-x-1/2 -translate-y-1/2"
            style={{ zIndex: 5 }}
          >
            {(['left', 'right'] as const).map((side) => (
              <div
                key={side}
                className="absolute inset-0 rounded-full flex items-center justify-center text-[#FDE7EF] font-display text-xl shadow-lg"
                style={{
                  background: 'radial-gradient(circle at 35% 30%, #E0477F, #9D174D 70%)',
                  clipPath:
                    side === 'left'
                      ? 'polygon(0 0, 54% 0, 44% 35%, 56% 60%, 46% 100%, 0 100%)'
                      : 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%, 56% 60%, 44% 35%)',
                  transform: cracked
                    ? `translateX(${side === 'left' ? -14 : 14}px) translateY(10px) rotate(${side === 'left' ? -18 : 18}deg)`
                    : 'none',
                  opacity: flapOpen ? 0 : 1,
                  transition: 'transform 300ms ease-out, opacity 250ms ease-out',
                }}
              >
                ♥
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPhase('done');
          }}
          className="text-xs font-semibold text-snow/90 hover:text-snow underline underline-offset-4 rounded-full px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-snow"
          autoFocus
        >
          Skip to the letter
        </button>
      </div>
    </div>
  );
}
