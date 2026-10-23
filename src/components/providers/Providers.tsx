'use client';

import React, { useEffect } from 'react';
import { DiaryProvider } from '@/store/DiaryContext';
import { PresenceProvider } from './PresenceProvider';
import { registerServiceWorker } from '@/lib/notifications';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <DiaryProvider>
      <PresenceProvider>{children}</PresenceProvider>
    </DiaryProvider>
  );
}
