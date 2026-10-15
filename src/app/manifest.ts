import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OurDiary 💕 - Relationship Space',
    short_name: 'OurDiary',
    description: 'A modern, playful, colorful relationship web space for couples.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8EE',
    theme_color: '#F8C8D8',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
