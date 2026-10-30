import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { WorldMap } from '@/components/world/WorldMap';

export const metadata: Metadata = {
  title: 'Our little world',
  description: 'Every place in your little world, and what each one holds.',
};

export default function WorldPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <WorldMap />
      </div>
    </AppShell>
  );
}
