'use client';

import { useState } from 'react';
// The default entry is the client-rendered component. '@splinetool/react-spline/next' is an
// async Server Component (it fetches a blurred placeholder on the server), so it cannot be
// used inside this client-only, next/dynamic({ ssr: false }) loaded view.
import Spline from '@splinetool/react-spline';

export default function SplineTrain({ scene }: { scene: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-[440px] sm:h-[520px] rounded-[1.25rem] bg-hero border border-line shadow-card overflow-hidden">
      <Spline scene={scene} onLoad={() => setLoaded(true)} className="w-full h-full" />
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-muted"
          role="status"
        >
          Loading your 3D scene...
        </div>
      )}
    </div>
  );
}
