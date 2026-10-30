import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { StarlightHill } from '@/components/world/places/StarlightHill';

export const metadata: Metadata = {
  title: 'Starlight Hill',
  description: 'Letters and quiet moments, on a hill under the stars.',
};

export default function StarlightHillPage() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <StarlightHill />
      </div>
    </AppShell>
  );
}
