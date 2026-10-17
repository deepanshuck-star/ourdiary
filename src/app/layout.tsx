import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

// Rose Quartz Romance: Playfair Display for display moments, DM Sans for all UI text.
const displayFont = Playfair_Display({
  variable: '--font-display-face',
  subsets: ['latin'],
  display: 'swap',
});

const bodyFont = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
});

// Applies the saved appearance (light / dark / system) before first paint so there is no flash.
const appearanceScript = `try{var a=localStorage.getItem('ourdiary-appearance');document.documentElement.dataset.appearance=a==='dark'||a==='system'?a:'light'}catch(e){}`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ourdiary.app';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1015' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'OurDiary 💕 - Modern Relationship Web Space',
    template: '%s | OurDiary 💕',
  },
  description:
    'A modern, playful, colorful relationship web space for couples. Celebrate milestones, travel through the interactive toy train journey, cherish memories, and send wax-sealed love letters.',
  applicationName: 'OurDiary',
  authors: [{ name: 'OurDiary Team', url: siteUrl }],
  generator: 'Next.js',
  keywords: [
    'relationship diary',
    'couples journal',
    'relationship milestones',
    'anniversary countdown',
    'toy train journey',
    'love letters',
    'couple bucket list',
    'photo gallery',
    'shared notes',
    'romantic web app',
  ],
  creator: 'OurDiary',
  publisher: 'OurDiary',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'OurDiary 💕 - Modern Relationship Web Space',
    description:
      'A modern, playful, colorful relationship web application for couples with interactive memories, animated train journey, shared notes, and time letters.',
    siteName: 'OurDiary',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=630&auto=format&fit=crop&q=80',
        width: 1200,
        height: 630,
        alt: 'OurDiary - Modern Relationship Web Space for Couples',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OurDiary 💕 - Modern Relationship Web Space',
    description:
      'A modern, playful, colorful relationship web application for couples with interactive memories, animated train journey, shared notes, and time letters.',
    images: [
      'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=1200&h=630&auto=format&fit=crop&q=80',
    ],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-appearance="light"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
