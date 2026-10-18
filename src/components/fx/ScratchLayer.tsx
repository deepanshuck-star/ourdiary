'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { clearedFraction, shouldRevealScratch } from '@/lib/features/fx-math';

interface ScratchLayerProps {
  /** Called once the layer has been cleared (by scratching or the Reveal button). */
  onReveal: () => void;
  /** Accessible name of what is hidden, e.g. the coupon category. */
  label?: string;
}

const BRUSH = 34; // CSS px
const FADE_MS = 350;

function cssVar(name: string, fallback: string) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

/**
 * A foil layer drawn on a <canvas> that sits over its (relatively positioned) parent.
 * Dragging a pointer scratches it away; past ~55% cleared it fades out and calls onReveal.
 * A real <button> offers the same outcome for keyboard and assistive-tech users.
 */
export function ScratchLayer({ onReveal, label = 'surprise' }: ScratchLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const finished = useRef(false);
  const [fading, setFading] = useState(false);
  const reduceMotion = useReducedMotion();

  // Paint the foil to match the element's size (and redraw on resize until scratched).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const primary = cssVar('--color-primary', '#BE185D');
      const secondary = cssVar('--color-secondary', '#F9A8D4');
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, secondary);
      grad.addColorStop(0.5, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, rect.width, rect.height);
      // Subtle foil speckle
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 90; i++) {
        const x = ((i * 73) % 997) / 997 * rect.width;
        const y = ((i * 151) % 991) / 991 * rect.height;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 italic 20px Georgia, serif';
      ctx.fillText('A little something for you', rect.width / 2, rect.height / 2 - 26);
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText('Scratch to reveal', rect.width / 2, rect.height / 2 - 2);
    };
    paint();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if (moves.current === 0 && !finished.current) paint();
      });
      ro.observe(canvas);
    }
    return () => ro?.disconnect();
  }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    if (reduceMotion) {
      onReveal();
      return;
    }
    setFading(true);
    window.setTimeout(onReveal, FADE_MS);
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || canvas.width === 0) return;
    try {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (shouldRevealScratch(clearedFraction(img.data, canvas.width, canvas.height, 6))) finish();
    } catch {
      // getImageData can throw on tainted/odd canvases — fall back to the button.
    }
  };

  const scratchTo = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH;
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
    last.current = { x, y };
    moves.current += 1;
    if (moves.current % 12 === 0) checkProgress();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (finished.current) return;
    drawing.current = true;
    last.current = null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    scratchTo(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || finished.current) return;
    scratchTo(e.clientX, e.clientY);
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    checkProgress();
  };

  return (
    <div
      className="absolute inset-0 z-10 rounded-[inherit] overflow-hidden"
      style={{
        opacity: fading ? 0 : 1,
        transition: reduceMotion ? undefined : `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block w-full h-full cursor-crosshair select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onLostPointerCapture={endStroke}
      />
      <button
        type="button"
        onClick={finish}
        aria-label={`Reveal your ${label} coupon`}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface/90 text-primary text-xs font-semibold shadow-card hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Reveal</span>
      </button>
    </div>
  );
}
