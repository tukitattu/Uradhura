/**
 * Uradhura player design tokens.
 * Palette mirrors the catalogue in platform/scripts/generate-asset-catalog.mjs
 * (deep navy, electric blue, violet, cyan + gold/rose accents).
 */
export const colors = {
  bg: '#0a1220',
  bgDeep: '#060b16',
  surface: '#0f1c33',
  surfaceLight: '#16243f',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(139,163,200,0.20)',
  primary: '#2e6bff',
  violet: '#7c3aed',
  cyan: '#22d3ee',
  violetSoft: '#a78bfa',
  glow: '#7ae7ff',
  gold: '#ffc24d',
  goldDeep: '#f59e0b',
  goldSoft: '#ffe9b0',
  rose: '#ff6b9d',
  roseDeep: '#e11d48',
  green: '#34d399',
  text: '#ffffff',
  textSoft: '#eef2ff',
  textSecondary: '#8fa3c8',
  textMuted: '#64748b',
} as const;

/** Background asset key used by every tab screen. */
export const backgroundKeys = {
  home: 'bg.home.default',
  live: 'bg.live.default',
  party: 'bg.party.default',
  games: 'bg.games.default',
  wallet: 'bg.wallet.default',
  room: 'bg.room.default',
  ranking: 'bg.ranking.default',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const navy = '#16213e';

/**
 * Translucent native-stack header over a branded screen.
 * Use on stacks whose screens render their own BrandBackground.
 */
export const translucentHeader = (tint: string = colors.primary) =>
  ({
    headerStyle: {
      backgroundColor: 'rgba(10,18,32,0.55)',
    },
    headerShadowVisible: false,
    headerTintColor: tint === 'transparent' ? '#fff' : tint,
    headerTitleStyle: { fontWeight: '700' } as const,
    headerBlurEffect: undefined,
  }) as const;