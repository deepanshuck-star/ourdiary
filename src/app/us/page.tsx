import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { UsPage } from '@/components/world/UsPage';

export const metadata: Metadata = {
  title: 'Us',
  description: 'The two of you, as you appear in your little world.',
};

export default function Us() {
  return (
    <AppShell>
      <div className="animate-in fade-in duration-300">
        <UsPage />
      </div>
    </AppShell>
  );
}
