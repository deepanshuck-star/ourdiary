import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ToyTrainJourney } from '@/features/journey/ToyTrainJourney';

export const metadata: Metadata = {
  title: 'Memory Train Journey 🚂',
  description:
    'Travel along our whimsical winding railway through all our milestones and sweetest relationship memories.',
};

export default function JourneyPage() {
  return (
    <AppShell>
      <div className="space-y-6 animate-in fade-in duration-300">
        <ToyTrainJourney />
      </div>
    </AppShell>
  );
}
