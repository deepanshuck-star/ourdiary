import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { MemoryForest } from '@/components/world/places/MemoryForest';

export const metadata: Metadata = {
  title: 'Memory Forest',
  description: 'Your memories, hanging from the trees of a quiet forest.',
};

export default function MemoryForestPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <MemoryForest />
      </div>
    </AppShell>
  );
}
