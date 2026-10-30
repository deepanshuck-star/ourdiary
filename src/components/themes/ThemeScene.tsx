'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useDiary } from '@/store/DiaryContext';
import { themeById } from '@/lib/themes';
import { applyPlaybackRate, motionSpeed } from '@/lib/motion';

// Each environment is loaded only when its theme is the one in use. A couple
// sees one scene, so shipping all six in the main bundle would cost every
// visitor five scenes they will never look at.
//
// ssr: false because the scenery is decorative and depends on the couple row,
// which does not exist during the server render. Rendering it on the server
// would mean a placeholder scene in the HTML and a swap on hydration.
const SCENES: Record<string, React.ComponentType> = {
  moonlit: dynamic(() => import('./MoonlitScene'), { ssr: false }),
  rooftop: dynamic(() => import('./RooftopScene'), { ssr: false }),
  blossom: dynamic(() => import('./BlossomScene'), { ssr: false }),
  forest: dynamic(() => import('./ForestScene'), { ssr: false }),
  ocean: dynamic(() => import('./OceanScene'), { ssr: false }),
  lantern: dynamic(() => import('./LanternScene'), { ssr: false }),
};

// Routes where the point of the page is reading or looking at something the
// couple made. The environment stays, but it steps back: the brief asks for
// no complex scenery behind a long story, and a gallery should be the
// photographs rather than the weather behind them.
const QUIET_ROUTES = [
  '/memories',
  '/letters',
  '/gallery',
  '/memory-book',
  '/chat',
  '/year-review',
  '/privacy',
];

function isQuiet(pathname: string | null): boolean {
  if (!pathname) return false;
  return QUIET_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * The animated environment behind the whole app.
 *
 * Renders nothing for the four original themes, which only ever tinted the
 * header — a couple who has not chosen an immersive theme gets exactly the
 * app they had before.
 */
export function ThemeScene() {
  const { data } = useDiary();
  const pathname = usePathname();
  const theme = themeById(data.couple?.theme);
  const ref = React.useRef<HTMLDivElement>(null);

  // The speed knob. Scenes are loaded on demand, so their animations appear
  // after this wrapper has rendered — watch for them arriving rather than
  // applying the rate once and missing the whole scene.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => applyPlaybackRate(el, motionSpeed());
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(el, { childList: true, subtree: true });
    // Turning motion on in Settings creates the animations without adding
    // any element, so watch the switch itself as well.
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    return () => observer.disconnect();
  }, [theme.scene]);

  if (!theme.scene) return null;
  const Scene = SCENES[theme.scene];
  if (!Scene) return null;
  return (
    <div ref={ref} className={isQuiet(pathname) ? 'ourdiary-scene-quiet' : undefined}>
      <Scene />
    </div>
  );
}

export default ThemeScene;
