'use client';

import { useEffect, useRef, useState } from 'react';
import createGlobe, { type Globe, type Marker } from 'cobe';
import { useThemeColors, type ThemeColors } from './capabilities';
import {
  clampTheta,
  cssColorToRgb01,
  dampTowards,
  latLngToGlobeAngles,
  nearestEquivalentAngle,
} from '@/lib/features/globe-math';

// Client-only (load with next/dynamic ssr:false). cobe 2.x has no internal render loop:
// every `globe.update()` draws one frame, so we drive our own requestAnimationFrame loop.

export type GlobeMarker = { id: string; lat: number; lng: number };

type Props = {
  markers: GlobeMarker[];
  selectedId: string | null;
  /** Bump `key` to re-run the fly-to even for the same point. */
  focus: { lat: number; lng: number; key: number } | null;
  autoRotate: boolean;
  /** Snap instead of animating the fly-to (reduced motion). */
  instant: boolean;
  label: string;
};

const DEFAULT_THETA = 0.3;
const FALLBACK_COLORS: ThemeColors = {
  primary: '#BE185D',
  secondary: '#F9A8D4',
  accent: '#E11D48',
  canvas: '#FFF7FA',
  surface: '#FFFFFF',
  ink: '#2A1520',
  inkMuted: '#6B4A5A',
  line: '#F3D3E0',
  dark: false,
};

function globeColors(c: ThemeColors) {
  const primary = cssColorToRgb01(c.primary, [0.75, 0.09, 0.36]);
  const accent = cssColorToRgb01(c.accent, [0.88, 0.11, 0.28]);
  return c.dark
    ? {
        dark: 1,
        mapBrightness: 5,
        baseColor: [0.32, 0.18, 0.26] as [number, number, number],
        glowColor: [0.45, 0.2, 0.33] as [number, number, number],
        markerColor: primary,
        accent,
      }
    : {
        dark: 0,
        mapBrightness: 6,
        baseColor: [1, 0.9, 0.94] as [number, number, number],
        glowColor: [1, 0.86, 0.92] as [number, number, number],
        markerColor: primary,
        accent,
      };
}

function toCobeMarkers(markers: GlobeMarker[], selectedId: string | null, accent: [number, number, number]): Marker[] {
  return markers.map((m) =>
    m.id === selectedId
      ? { location: [m.lat, m.lng], size: 0.11, color: accent }
      : { location: [m.lat, m.lng], size: 0.055 }
  );
}

export default function MemoryGlobe({ markers, selectedId, focus, autoRotate, instant, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const colors = useThemeColors();
  const [ready, setReady] = useState(false);

  const motion = useRef({
    phi: 0,
    theta: DEFAULT_THETA,
    targetPhi: null as number | null,
    targetTheta: DEFAULT_THETA,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartPhi: 0,
    dragStartTheta: 0,
    autoRotate,
    instant,
  });

  useEffect(() => {
    motion.current.autoRotate = autoRotate;
    motion.current.instant = instant;
    // Resuming the spin releases any fly-to target.
    if (autoRotate) motion.current.targetPhi = null;
  }, [autoRotate, instant]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // cobe wraps the canvas in its own div, so the canvas must not be React-owned.
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'width:100%;height:100%;display:block;cursor:grab;touch-action:pan-y;opacity:0;transition:opacity 0.8s ease';
    host.appendChild(canvas);

    const size = Math.max(200, Math.round(host.clientWidth || 400));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Real colours and markers are applied by the effect below right after creation.
    const c = globeColors({ ...FALLBACK_COLORS });
    const s = motion.current;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi: s.phi,
      theta: s.theta,
      dark: c.dark,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: c.mapBrightness,
      baseColor: c.baseColor,
      markerColor: c.markerColor,
      glowColor: c.glowColor,
      markers: [],
      markerElevation: 0.02,
    });
    globeRef.current = globe;

    let raf = 0;
    let last = performance.now();
    let drawnPhi = NaN;
    let drawnTheta = NaN;
    let shown = false;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!s.dragging) {
        if (s.targetPhi !== null) {
          s.phi = s.instant ? s.targetPhi : dampTowards(s.phi, s.targetPhi, 4, dt);
        } else if (s.autoRotate) {
          s.phi += dt * 0.22;
        }
        s.theta = s.instant ? s.targetTheta : dampTowards(s.theta, s.targetTheta, 4, dt);
      }
      if (s.phi !== drawnPhi || s.theta !== drawnTheta) {
        globe.update({ phi: s.phi, theta: s.theta });
        drawnPhi = s.phi;
        drawnTheta = s.theta;
      }
      if (!shown) {
        shown = true;
        canvas.style.opacity = '1';
        setReady(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onDown = (e: PointerEvent) => {
      s.dragging = true;
      s.targetPhi = null;
      s.dragStartX = e.clientX;
      s.dragStartY = e.clientY;
      s.dragStartPhi = s.phi;
      s.dragStartTheta = s.theta;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!s.dragging) return;
      const scale = 3.2 / Math.max(200, canvas.clientWidth);
      s.phi = s.dragStartPhi + (e.clientX - s.dragStartX) * scale;
      s.theta = clampTheta(s.dragStartTheta + (e.clientY - s.dragStartY) * scale);
      s.targetTheta = s.theta;
    };
    const onUp = (e: PointerEvent) => {
      if (!s.dragging) return;
      s.dragging = false;
      canvas.style.cursor = 'grab';
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const ro = new ResizeObserver(() => {
      const w = Math.max(200, Math.round(host.clientWidth));
      globe.update({ width: w, height: w });
      drawnPhi = NaN; // force a redraw at the new size
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      globe.destroy();
      globeRef.current = null;
      host.replaceChildren();
    };
  }, []);

  // Markers / theme changes.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const c = globeColors(colors);
    globe.update({
      dark: c.dark,
      mapBrightness: c.mapBrightness,
      baseColor: c.baseColor,
      glowColor: c.glowColor,
      markerColor: c.markerColor,
      markers: toCobeMarkers(markers, selectedId, c.accent),
    });
  }, [markers, selectedId, colors]);

  // Fly to the focused place.
  useEffect(() => {
    if (!focus) return;
    const s = motion.current;
    const { phi, theta } = latLngToGlobeAngles(focus.lat, focus.lng);
    s.targetPhi = nearestEquivalentAngle(s.phi, phi);
    s.targetTheta = theta;
  }, [focus]);

  return (
    <div className="relative w-full aspect-square">
      <div ref={hostRef} role="img" aria-label={label} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 aspect-square rounded-full bg-purple-50 animate-pulse" />
        </div>
      )}
    </div>
  );
}
