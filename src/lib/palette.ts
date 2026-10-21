// UI-only preference: which colour palette the app wears. Stored per device, never synced.
// 'rose' is Rose Quartz Romance (the default look); 'peach' is Peach Fuzz Morning.
export type Palette = 'rose' | 'peach';

const STORAGE_KEY = 'ourdiary-palette';

export const PALETTES: { id: Palette; name: string; description: string; swatch: [string, string, string] }[] = [
  {
    id: 'rose',
    name: 'Rose Quartz',
    description: 'Deep rose on a blush canvas, with Playfair Display.',
    swatch: ['#BE185D', '#F9A8D4', '#FFF7FA'],
  },
  {
    id: 'peach',
    name: 'Peach Sunrise',
    description: 'Warm terracotta on a cream canvas, with Fraunces.',
    swatch: ['#C2410C', '#FFBE98', '#FFF8F3'],
  },
];

// Browser chrome tint, per palette and appearance — keeps the address bar in step.
const THEME_COLOR: Record<Palette, { light: string; dark: string }> = {
  rose: { light: '#FFF7FA', dark: '#1A1015' },
  peach: { light: '#FFF8F3', dark: '#1C130E' },
};

export function getPalette(): Palette {
  if (typeof window === 'undefined') return 'rose';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'peach' ? 'peach' : 'rose';
  } catch {
    return 'rose';
  }
}

export function setPalette(value: Palette) {
  document.documentElement.dataset.palette = value;
  syncThemeColor(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode / blocked storage: the choice still applies for this visit.
  }
}

// Next renders one <meta name="theme-color"> per colour scheme; retint both.
function syncThemeColor(value: Palette) {
  const colors = THEME_COLOR[value];
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = meta.media?.includes('dark') ? colors.dark : colors.light;
  });
}
