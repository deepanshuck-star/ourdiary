import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { DreamMountains } from '@/components/world/places/DreamMountains';

export const metadata: Metadata = {
  title: 'Dream Mountains',
  description: 'Your dreams, waiting on the trail up the mountain.',
};

export default function DreamMountainsPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <DreamMountains />
      </div>
    </AppShell>
  );
}
