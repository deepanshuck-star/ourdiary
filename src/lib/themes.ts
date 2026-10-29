// The six immersive environments, plus the four original header tints.
//
// Import-free on purpose: `node --test` loads this file directly (see
// tests/themes.test.mjs) and cannot resolve the @/ alias. Keeping it pure
// data also means the contrast checks in that suite run against exactly the
// values the app ships, not a copy.
//
// HOW A THEME REACHES THE SCREEN
//
// Three attributes already drive the look, and they stack:
//
//   data-appearance  light | dark | system     per device  (lib/appearance)
//   data-palette     rose | peach              per device  (lib/palette)
//   data-theme       one of the ids below      per couple  (couples.theme)
//
// The four legacy ids only ever set --hero-gradient, so a couple that picked
// "Dusk" in 2026 still gets exactly what they picked. The six immersive ids
// additionally override the colour and font tokens, which is what lets a
// theme own its own atmosphere rather than inheriting the palette's. That
// override is deliberate: a theme called Moonlit Garden that came out peach
// would not be moonlit.
//
// Tokens live in src/styles/themes/tokens.css. tests/themes.test.mjs asserts
// the two files agree, because a token defined here and forgotten there is
// invisible until someone opens that theme.

export type ThemeId =
  | 'candy'
  | 'sunset'
  | 'lavender'
  | 'mint'
  | 'moonlit'
  | 'rooftop'
  | 'blossom'
  | 'forest'
  | 'ocean'
  | 'lantern';

/** The colour tokens a theme overrides. Each maps to a Tailwind utility. */
export interface ThemeTokens {
  /** Page behind the scenery. Usually the deepest sky colour. */
  canvas: string;
  /** Cards, panels, anything you read words off. Always light enough to read. */
  surface: string;
  /** Body text on `surface`. */
  ink: string;
  /** Secondary text on `surface`. */
  inkMuted: string;
  /** Buttons and active states. */
  primary: string;
  primaryHover: string;
  /** Text on `primary`. */
  onPrimary: string;
  /** Decorative only — never used for text. */
  secondary: string;
  /** Small highlights and links on `surface`, so it must stay readable. */
  accent: string;
  /** Hairlines and card borders. */
  line: string;
  /**
   * Text sitting directly on the scenery rather than on a card — page
   * headings, section labels, anything outside a surface.
   *
   * It needs its own token because `ink` is tuned for a light card, and on a
   * night environment that would be dark text on a dark sky. The generated
   * CSS sets `ink` to this value at the theme root and then flips it back to
   * the card value inside anything with a surface background, so a page gets
   * readable text in both places without auditing every heading in the app.
   */
  onScene: string;
  onSceneMuted: string;
}

/** Colours the background scene draws with. Decorative, never text. */
export interface SceneTokens {
  /** Top of the sky. */
  sky: string;
  /** Bottom of the sky, behind the far layer. */
  skyLow: string;
  /** Furthest landscape band. */
  far: string;
  /** Middle band. */
  mid: string;
  /** Nearest band, the one at the bottom of the viewport. */
  near: string;
  /** The light source: moon, lanterns, fairy lights, low sun. */
  glow: string;
  /** Fireflies, petals, stars. */
  particle: string;
}

/** How the toy train's route is drawn inside this environment. */
export interface TrackTokens {
  rail: string;
  tie: string;
  stationFill: string;
  stationStroke: string;
  stationActive: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  /** One line, shown under the name in Settings. */
  description: string;
  /**
   * 'legacy' themes only tint the hero gradient — the look the app shipped
   * with. 'immersive' themes own the whole environment.
   */
  kind: 'legacy' | 'immersive';
  /** Whether the environment reads as a night scene. Drives scene contrast. */
  mood: 'day' | 'night';
  /** The component key in components/themes/ThemeScene. null for legacy. */
  scene: string | null;
  heroGradient: string;
  tokens: ThemeTokens | null;
  sceneTokens: SceneTokens | null;
  track: TrackTokens | null;
  /** CSS font-family stacks. Faces are declared in app/layout.tsx. */
  fonts: { display: string; body: string } | null;
}

const LEGACY_GRADIENTS: Record<string, { name: string; description: string; gradient: string }> = {
  candy: {
    name: 'Classic',
    description: 'The original blush header, unchanged.',
    gradient: 'linear-gradient(135deg,#FCE7F3 0%,#F9A8D4 55%,#FBCFE8 100%)',
  },
  sunset: {
    name: 'Dusk',
    description: 'A warmer rose tint across the header.',
    gradient: 'linear-gradient(135deg,#FDF2F8 0%,#FECDD3 50%,#F9A8D4 100%)',
  },
  lavender: {
    name: 'Soft',
    description: 'The palest version of the header gradient.',
    gradient: 'linear-gradient(135deg,#FFF7FA 0%,#FCE7F3 60%,#FBCFE8 100%)',
  },
  mint: {
    name: 'Deep',
    description: 'The most saturated header tint.',
    gradient: 'linear-gradient(135deg,#FBCFE8 0%,#F9A8D4 50%,#F472B6 100%)',
  },
};

function legacy(id: ThemeId): Theme {
  const entry = LEGACY_GRADIENTS[id];
  return {
    id,
    name: entry.name,
    description: entry.description,
    kind: 'legacy',
    mood: 'day',
    scene: null,
    heroGradient: entry.gradient,
    tokens: null,
    sceneTokens: null,
    track: null,
    fonts: null,
  };
}

// Font stacks. Every immersive theme names a display face and a UI face; the
// variables are declared by next/font in app/layout.tsx, which self-hosts and
// subsets them. Only the active theme's two faces are ever fetched, because
// nothing else references the variables.
const CORMORANT = "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif";
const DM_SERIF = "var(--font-dm-serif), 'DM Serif Display', Georgia, serif";
const FRAUNCES = "var(--font-display-peach), Fraunces, Georgia, serif";
const DM_SANS = "var(--font-body-rose), 'DM Sans', ui-sans-serif, system-ui, sans-serif";
const MANROPE = "var(--font-manrope), Manrope, ui-sans-serif, system-ui, sans-serif";
const NUNITO = "var(--font-nunito), 'Nunito Sans', ui-sans-serif, system-ui, sans-serif";
const INTER = "var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif";

export const THEMES: Theme[] = [
  legacy('candy'),
  legacy('sunset'),
  legacy('lavender'),
  legacy('mint'),

  {
    id: 'moonlit',
    name: "Moonlit Lovers' Garden",
    description: 'A hillside garden under an enormous moon, with fireflies in the grass.',
    kind: 'immersive',
    mood: 'night',
    scene: 'moonlit',
    heroGradient: 'linear-gradient(135deg,#111A35 0%,#343A68 55%,#1B2444 100%)',
    // Ivory cards and deep navy text, the way the brief asks. Firefly gold
    // reads at about 1.8:1 on ivory, so it lights the scene but never carries
    // text — `accent` is a darkened version that does.
    tokens: {
      canvas: '#111A35',
      surface: '#F6EFE4',
      ink: '#141C33',
      inkMuted: '#434D74',
      primary: '#343A68',
      primaryHover: '#262B50',
      onPrimary: '#F6EFE4',
      secondary: '#9B9ACB',
      accent: '#7A5418',
      line: '#D6CDE2',
      onScene: '#EDE6D8',
      onSceneMuted: '#B5B2D4',
    },
    sceneTokens: {
      sky: '#111A35',
      skyLow: '#343A68',
      far: '#2A3157',
      mid: '#1E2745',
      near: '#141C33',
      glow: '#E7D9C2',
      particle: '#E6B879',
    },
    track: {
      rail: '#9B9ACB',
      tie: '#343A68',
      stationFill: '#E7D9C2',
      stationStroke: '#9B9ACB',
      stationActive: '#E6B879',
    },
    fonts: { display: CORMORANT, body: DM_SANS },
  },

  {
    id: 'rooftop',
    name: 'Starlit Rooftop Date',
    description: 'A rooftop table for two, fairy lights above a quiet city.',
    kind: 'immersive',
    mood: 'night',
    scene: 'rooftop',
    heroGradient: 'linear-gradient(135deg,#17243B 0%,#344B63 55%,#1D2C45 100%)',
    tokens: {
      canvas: '#17243B',
      surface: '#F7EAD6',
      ink: '#1B2A42',
      inkMuted: '#425469',
      primary: '#344B63',
      primaryHover: '#243A52',
      onPrimary: '#F7EAD6',
      secondary: '#C9A8C9',
      accent: '#7E4F14',
      line: '#E3CDB0',
      onScene: '#F1DCC0',
      onSceneMuted: '#BBC6D3',
    },
    sceneTokens: {
      sky: '#17243B',
      skyLow: '#344B63',
      far: '#2A3E55',
      mid: '#1F3049',
      near: '#16202F',
      glow: '#D9A879',
      particle: '#F1DCC0',
    },
    track: {
      rail: '#C9A8C9',
      tie: '#344B63',
      stationFill: '#F1DCC0',
      stationStroke: '#D9A879',
      stationActive: '#D9A879',
    },
    fonts: { display: DM_SERIF, body: MANROPE },
  },

  {
    id: 'blossom',
    name: 'Cherry Blossom Dream',
    description: 'A spring garden with a stream, a little bridge and falling petals.',
    kind: 'immersive',
    mood: 'day',
    scene: 'blossom',
    heroGradient: 'linear-gradient(135deg,#F3E4DF 0%,#D9A0AD 55%,#E9CBA4 100%)',
    // The one daylight environment. Forest green on ivory keeps it elegant
    // rather than pink-heavy, which the brief asks for twice.
    tokens: {
      canvas: '#F3E4DF',
      surface: '#FFF9F5',
      ink: '#27352F',
      inkMuted: '#4B5F55',
      primary: '#45594F',
      primaryHover: '#2F3F37',
      onPrimary: '#FFF9F5',
      secondary: '#D9A0AD',
      accent: '#9A4356',
      line: '#D9E2D6',
      onScene: '#27352F',
      onSceneMuted: '#4B5F55',
    },
    sceneTokens: {
      sky: '#F3E4DF',
      skyLow: '#E9CBA4',
      far: '#AFC6AD',
      mid: '#8FB091',
      near: '#526B62',
      glow: '#E9CBA4',
      particle: '#D9A0AD',
    },
    track: {
      rail: '#526B62',
      tie: '#AFC6AD',
      stationFill: '#FFF9F5',
      stationStroke: '#526B62',
      stationActive: '#D9A0AD',
    },
    fonts: { display: FRAUNCES, body: DM_SANS },
  },

  {
    id: 'forest',
    name: 'Enchanted Forest of Memories',
    description: 'Mossy woodland, lantern light and a path winding toward a cottage.',
    kind: 'immersive',
    mood: 'night',
    scene: 'forest',
    heroGradient: 'linear-gradient(135deg,#203A32 0%,#426955 55%,#1A2F28 100%)',
    // Parchment surfaces, not dark green ones: the brief is explicit that
    // reading surfaces stay light.
    tokens: {
      canvas: '#203A32',
      surface: '#EFE7D6',
      ink: '#1C3328',
      inkMuted: '#3C5947',
      primary: '#3A5D4A',
      primaryHover: '#28412F',
      onPrimary: '#EFE7D6',
      secondary: '#8CA98A',
      accent: '#6E561E',
      line: '#D2C8AF',
      onScene: '#E7DCC8',
      onSceneMuted: '#A9BFA6',
    },
    sceneTokens: {
      sky: '#203A32',
      skyLow: '#426955',
      far: '#2F5244',
      mid: '#244137',
      near: '#172A24',
      glow: '#D9BD8B',
      particle: '#D9BD8B',
    },
    track: {
      rail: '#8CA98A',
      tie: '#426955',
      stationFill: '#E7DCC8',
      stationStroke: '#426955',
      stationActive: '#D9BD8B',
    },
    fonts: { display: CORMORANT, body: NUNITO },
  },

  {
    id: 'ocean',
    name: 'Sunset by the Ocean',
    description: 'Cliffs, a long horizon and the track running down to the shore.',
    kind: 'immersive',
    mood: 'day',
    scene: 'ocean',
    heroGradient: 'linear-gradient(135deg,#F2B38D 0%,#D77F76 50%,#687F93 100%)',
    tokens: {
      canvas: '#354C60',
      surface: '#FBF1E2',
      ink: '#243646',
      inkMuted: '#475D72',
      primary: '#3C566C',
      primaryHover: '#2A3E4F',
      onPrimary: '#FBF1E2',
      secondary: '#F2B38D',
      accent: '#9C3F35',
      line: '#E6D3BA',
      onScene: '#FBF1E2',
      onSceneMuted: '#C6D2DD',
    },
    sceneTokens: {
      sky: '#F2B38D',
      skyLow: '#D77F76',
      far: '#687F93',
      mid: '#4A6278',
      near: '#354C60',
      glow: '#F2DCC0',
      particle: '#F2DCC0',
    },
    track: {
      rail: '#F2DCC0',
      tie: '#687F93',
      stationFill: '#FBF1E2',
      stationStroke: '#354C60',
      stationActive: '#D77F76',
    },
    fonts: { display: CORMORANT, body: INTER },
  },

  {
    id: 'lantern',
    name: 'Lantern Festival Night',
    description: 'Lanterns lifting off a still lake, with their reflections below.',
    kind: 'immersive',
    mood: 'night',
    scene: 'lantern',
    heroGradient: 'linear-gradient(135deg,#222B49 0%,#56567A 55%,#1C2440 100%)',
    tokens: {
      canvas: '#222B49',
      surface: '#F7E9D2',
      ink: '#1E2743',
      inkMuted: '#474C6E',
      primary: '#454A70',
      primaryHover: '#2F3454',
      onPrimary: '#F7E9D2',
      secondary: '#9AABB2',
      accent: '#7D551A',
      line: '#E2CEB0',
      onScene: '#F0D8B7',
      onSceneMuted: '#B3BDCA',
    },
    sceneTokens: {
      sky: '#222B49',
      skyLow: '#56567A',
      far: '#3C3F63',
      mid: '#2A3052',
      near: '#1A2039',
      glow: '#E7B96D',
      particle: '#F0D8B7',
    },
    track: {
      rail: '#9AABB2',
      tie: '#56567A',
      stationFill: '#F0D8B7',
      stationStroke: '#56567A',
      stationActive: '#E7B96D',
    },
    fonts: { display: CORMORANT, body: DM_SANS },
  },
];

/** What a brand-new couple gets, and the fallback for anything unrecognised. */
export const DEFAULT_THEME_ID: ThemeId = 'candy';

export const THEME_IDS: ThemeId[] = THEMES.map((theme) => theme.id);

export const IMMERSIVE_THEMES: Theme[] = THEMES.filter((theme) => theme.kind === 'immersive');

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.indexOf(value as ThemeId) !== -1;
}

/**
 * Always returns a theme. An id from the future — a couple who picked a theme
 * in a newer build, or a hand-edited database row — falls back to the default
 * rather than rendering an unstyled page.
 */
export function themeById(id: unknown): Theme {
  const found = THEMES.filter((theme) => theme.id === id)[0];
  return found || THEMES.filter((theme) => theme.id === DEFAULT_THEME_ID)[0];
}
