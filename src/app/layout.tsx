import type { Metadata, Viewport } from 'next';
import { Playfair_Display, DM_Sans, Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

// Both palettes ship their own pair of faces. Each is exposed under its own CSS
// variable; globals.css points --font-display-face / --font-body at the chosen pair.
// Rose Quartz Romance: Playfair Display for display moments, DM Sans for UI text.
const roseDisplayFont = Playfair_Display({
  variable: '--font-display-rose',
  subsets: ['latin'],
  display: 'swap',
});

const roseBodyFont = DM_Sans({
  variable: '--font-body-rose',
  subsets: ['latin'],
  display: 'swap',
});

// Peach Fuzz Morning: Fraunces (SOFT axis up for a rounded, warm serif) + Plus Jakarta Sans.
const peachDisplayFont = Fraunces({
  variable: '--font-display-peach',
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const peachBodyFont = Plus_Jakarta_Sans({
  variable: '--font-body-peach',
  subsets: ['latin'],
  display: 'swap',
});

// Applies the saved appearance (light / dark / system) and palette (rose / peach)
// before first paint so there is no flash of the other look.
const preferencesScript = `try{var d=document.documentElement,a=localStorage.getItem('ourdiary-appearance');d.dataset.appearance=a==='dark'||a==='system'?a:'light';var p=localStorage.getItem('ourdiary-palette')==='peach'?'peach':'rose';d.dataset.palette=p;var c=p==='peach'?['#FFF8F3','#1C130E']:['#FFF7FA','#1A1015'];[['light',c[0]],['dark',c[1]]].forEach(function(e){var m=document.createElement('meta');m.name='theme-color';m.media='(prefers-color-scheme: '+e[0]+')';m.content=e[1];document.head.appendChild(m)})}catch(e){}`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ourdiary.app';

// theme-color is injected by preferencesScript instead of declared here, so the
// browser chrome follows the chosen palette. Declaring it in the viewport export
// as well would render a second, fixed pair of metas that wins on document order.
export const viewport: Viewport = {
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
      data-palette="rose"
      suppressHydrationWarning
      className={`${roseDisplayFont.variable} ${roseBodyFont.variable} ${peachDisplayFont.variable} ${peachBodyFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
