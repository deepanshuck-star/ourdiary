import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { LoveRiver } from '@/components/world/places/LoveRiver';

export const metadata: Metadata = {
  title: 'Love River',
  description: 'Your messages, floating down the river as paper boats.',
};

export default function LoveRiverPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <LoveRiver />
      </div>
    </AppShell>
  );
}
