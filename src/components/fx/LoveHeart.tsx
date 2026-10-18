'use client';

import React, { useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'motion/react';
import { Heart } from 'lucide-react';

function StaticHeart({ className = '' }: { className?: string }) {
  return <Heart aria-hidden="true" className={`w-8 h-8 text-primary fill-current ${className}`} />;
}

const Heart3D = dynamic(() => import('./Heart3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <StaticHeart />
    </div>
  ),
});

/** Falls back to the static icon if WebGL is unavailable or three.js throws. */
class WebGLBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Swallow: a missing heart animation should never break the alert.
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

let webglSupport: boolean | null = null;
const noopSubscribe = () => () => {};
const getWebGLSnapshot = () => {
  if (webglSupport === null) webglSupport = hasWebGL();
  return webglSupport;
};
const getServerSnapshot = () => false;

function readPrimaryColor() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    return v || '#BE185D';
  } catch {
    return '#BE185D';
  }
}
const getColorSnapshot = () => readPrimaryColor();
const getServerColor = () => '#BE185D';

/** A small rotating, beating 3D heart; static icon for reduced motion / no WebGL / loading. */
export function LoveHeart({ className = '' }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const webgl = useSyncExternalStore(noopSubscribe, getWebGLSnapshot, getServerSnapshot);
  const color = useSyncExternalStore(noopSubscribe, getColorSnapshot, getServerColor);

  const fallback = (
    <div className={`flex items-center justify-center ${className}`}>
      <StaticHeart />
    </div>
  );

  if (reduceMotion || !webgl) return fallback;

  return (
    <div className={className}>
      <WebGLBoundary fallback={fallback}>
        <Heart3D color={color} />
      </WebGLBoundary>
    </div>
  );
}
