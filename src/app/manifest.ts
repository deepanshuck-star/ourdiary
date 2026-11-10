import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OurDiary 💕 - Relationship Space',
    short_name: 'OurDiary',
    description: 'A modern, playful, colorful relationship web space for couples.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF7FA',
    theme_color: '#BE185D',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // Long-press the installed app icon to jump straight in. This is the web
    // equivalent of home-screen widgets, which web apps cannot provide.
    shortcuts: [
      {
        name: 'Countdowns',
        short_name: 'Countdowns',
        description: 'Days until your next anniversary, milestone and plans',
        url: '/countdowns',
      },
      {
        name: 'Add memory',
        short_name: 'Add memory',
        description: 'Save a new moment together',
        url: '/memories/new',
      },
      {
        name: 'Dashboard',
        short_name: 'Home',
        description: 'Your shared dashboard',
        url: '/dashboard',
      },
    ],
  };
}
