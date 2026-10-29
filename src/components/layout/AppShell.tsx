'use client';

import React from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../ui/ToastContainer';
import { useDiary } from '@/store/DiaryContext';
import { OnThisDayNotifier } from '../widgets/OnThisDayNotifier';
import { ThemeScene } from '../themes/ThemeScene';
import { themeById } from '@/lib/themes';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isHydrated } = useDiary();
  const theme = themeById(data.couple?.theme);

  // Mirror the theme onto <html>.
  //
  // Two reasons it cannot live on the wrapper div alone. The body sits outside
  // this component, so overscroll would show the old canvas colour; and the 3D
  // journey watches documentElement for data-theme (see three/capabilities.ts)
  // and would not repaint until a reload.
  //
  // The localStorage copy is read by the inline script in layout.tsx before
  // first paint. The couple row stays the source of truth — this is a cache to
  // avoid a flash of the default theme while that row loads, nothing more.
  React.useEffect(() => {
    if (!isHydrated) return;
    document.documentElement.dataset.theme = theme.id;
    try {
      window.localStorage.setItem('ourdiary-theme', theme.id);
    } catch {
      // Private mode or blocked storage: the theme still applies this visit.
    }
  }, [isHydrated, theme.id]);

  // The diary and "today" only exist in the browser: the server render uses seed data and a
  // fixed demo date, so rendering the shell before hydration caused text mismatches on every page.
  if (!isHydrated) {
    return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  }

  return (
    // data-theme drives the hero gradient, and for the immersive themes the
    // whole palette and type pairing as well.
    <div
      data-theme={theme.id}
      className="relative min-h-screen flex flex-col bg-canvas text-ink"
    >
      <ThemeScene />
      {/* Everything the user reads sits above the scenery. */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <AppNavbar />
        <div className="flex-1 flex w-full max-w-7xl mx-auto">
          <AppSidebar />
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
      <ToastContainer />
      <OnThisDayNotifier />
    </div>
  );
}
