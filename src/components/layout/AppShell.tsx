'use client';

import React from 'react';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '../ui/ToastContainer';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EE] text-[#292538] selection:bg-rose-200">
      <AppNavbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <AppSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
      <ToastContainer />
    </div>
  );
}
