'use client';

import React from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../ui/ToastContainer';
import { useDiary } from '@/store/DiaryContext';
import { OnThisDayNotifier } from '../widgets/OnThisDayNotifier';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isHydrated } = useDiary();

  // The diary and "today" only exist in the browser: the server render uses seed data and a
  // fixed demo date, so rendering the shell before hydration caused text mismatches on every page.
  if (!isHydrated) {
    return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  }

  return (
    // data-theme drives the decorative hero gradient chosen in Settings.
    <div
      data-theme={data.couple.theme || 'candy'}
      className="min-h-screen flex flex-col bg-canvas text-ink"
    >
      <AppNavbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <AppSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
      <ToastContainer />
      <OnThisDayNotifier />
    </div>
  );
}
