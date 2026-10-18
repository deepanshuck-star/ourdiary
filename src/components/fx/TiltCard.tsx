'use client';

import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { tiltFromOrientation, tiltFromPointer, NEUTRAL_TILT, type TiltState } from '@/lib/features/fx-math';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees (default 8). */
  maxTilt?: number;
  /** Show a soft moving highlight (default true). */
  glare?: boolean;
  /** Temporarily switch the effect off (e.g. while a scratch layer is being dragged). */
  disabled?: boolean;
  /**
   * On touch / coarse-pointer devices, follow the device's orientation instead of the pointer.
   * Only used when DeviceOrientation fires without needing a permission prompt.
   */
  gyro?: boolean;
}

/**
 * Pointer-driven 3D tilt with a soft glare. Writes CSS variables directly on the element so
 * moving the pointer never re-renders React. Off for reduced motion and for touch pointers.
 */
export function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  glare = true,
  disabled = false,
  gyro = false,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  const enabled = !disabled && !reduceMotion;

  const apply = (state: TiltState, active: boolean) => {
    const el = ref.current;
    if (!el) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      el.style.setProperty('--tilt-rx', `${state.rx}deg`);
      el.style.setProperty('--tilt-ry', `${state.ry}deg`);
      el.style.setProperty('--tilt-gx', `${state.gx}%`);
      el.style.setProperty('--tilt-gy', `${state.gy}%`);
      el.style.setProperty('--tilt-glare', active ? '1' : '0');
    });
  };

  // Reset whenever the effect gets switched off.
  useEffect(() => {
    if (enabled) return;
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tilt-rx', '0deg');
    el.style.setProperty('--tilt-ry', '0deg');
    el.style.setProperty('--tilt-glare', '0');
  }, [enabled]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  // Optional gyro tilt for coarse pointers. Never prompts for permission (iOS requires a
  // user-gesture permission request, so we simply stay flat there).
  useEffect(() => {
    if (!enabled || !gyro || typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) return;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown };
    if (typeof DOE.requestPermission === 'function') return;

    const el = ref.current;
    let raf: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      const t = tiltFromOrientation(e.beta, e.gamma, maxTilt);
      if (!t || !el) return;
      // Only tilt while the card is on screen.
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        el.style.setProperty('--tilt-rx', `${t.rx}deg`);
        el.style.setProperty('--tilt-ry', `${t.ry}deg`);
        el.style.setProperty('--tilt-gx', `${t.gx}%`);
        el.style.setProperty('--tilt-gy', `${t.gy}%`);
        el.style.setProperty('--tilt-glare', '0.6');
      });
    };
    try {
      window.addEventListener('deviceorientation', onOrient);
    } catch {
      return;
    }
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [enabled, gyro, maxTilt]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    apply(tiltFromPointer(e.clientX, e.clientY, el.getBoundingClientRect(), maxTilt), true);
  };

  const onPointerLeave = () => {
    if (!enabled) return;
    apply(NEUTRAL_TILT, false);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
      className={`relative ${className}`}
      style={{
        transform: enabled
          ? 'perspective(900px) rotateX(var(--tilt-rx, 0deg)) rotateY(var(--tilt-ry, 0deg))'
          : undefined,
        transition: 'transform 160ms ease-out',
        willChange: enabled ? 'transform' : undefined,
      }}
    >
      {children}
      {glare && enabled && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{
            background:
              'radial-gradient(circle at var(--tilt-gx, 50%) var(--tilt-gy, 50%), rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)',
            opacity: 'var(--tilt-glare, 0)',
            transition: 'opacity 200ms ease-out',
          }}
        />
      )}
    </div>
  );
}
