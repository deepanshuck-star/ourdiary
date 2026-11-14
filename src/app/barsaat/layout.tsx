import type { Metadata } from 'next';
import { Kalam, Rozha_One } from 'next/font/google';
import '@/components/barsaat/barsaat.css';

// Two Devanagari faces, only for this page: a heavy brush-serif for the red
// title, and a hand for the lines that write themselves in. Declared here
// rather than in the root layout so no other page ever downloads them.
const titleFont = Rozha_One({
  variable: '--font-bs-title',
  subsets: ['devanagari', 'latin'],
  weight: '400',
  display: 'swap',
});

const handFont = Kalam({
  variable: '--font-bs-hand',
  subsets: ['devanagari', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Barsaat',
  description: 'A short rain story in ink on old paper, just for the two of you.',
};

export default function BarsaatLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${titleFont.variable} ${handFont.variable}`}>{children}</div>;
}
