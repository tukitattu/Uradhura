// ============================================================
// ASSET REGISTRY — CONSTANTS
// Dot-path categories mirror the original URADHURA asset catalog
// under /platform/assets. Categories were chosen from the functional
// structure of a social/live app (backgrounds, frames, logos, nav,
// profile, room/seat, invite) and extended for gaming + crypto.
// ============================================================

export const ASSET_CATEGORIES = [
  'bg.home',
  'bg.room',
  'bg.ranking',
  'bg.wallet',
  'bg.games',
  'bg.party',
  'bg.live',
  'logo',
  'logo.splash',
  'logo.app-icon',
  'frame.avatar',
  'frame.profile',
  'frame.vip',
  'frame.ranking',
  'frame.level',
  'icons.navigation',
  'icons.home',
  'icons.live',
  'icons.party',
  'icons.games',
  'icons.wallet',
  'icons.message',
  'icons.profile',
  'icons.audio-seat',
  'icons.invite',
  'icons.crypto',
  'icons.gift',
  'avatars.default',
  'avatars.frames',
  'gifts.basic',
  'gifts.premium',
  'gifts.luxury',
  'gifts.animations',
  'invite',
  'tasks',
  'rewards',
  'badges',
  'vip',
  'events',
  'notifications',
  'games.teen-patti.table',
  'games.teen-patti.cards',
  'games.teen-patti.chips',
  'games.teen-patti.seats',
  'games.teen-patti.effects',
  'games.teen-patti.audio',
  'wallet',
  'crypto',
  'crypto.coming-soon',
  'animations',
  'audio',
  'fonts',
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

// Target screens / contexts the asset is shown on.
export const ASSET_TARGETS = [
  'global',
  'home',
  'live',
  'party',
  'games',
  'wallet',
  'messages',
  'profile',
  'crypto',
  'ranking',
  'login',
  'room',
  'gift',
  'teenpatti',
] as const;

export type AssetTarget = (typeof ASSET_TARGETS)[number];

// Allowed upload formats → media type + optional width/height parsing.
export const ASSET_TYPE_MAP: Record<string, { type: string; raster: boolean }> = {
  svg: { type: 'image/svg+xml', raster: false },
  png: { type: 'image/png', raster: true },
  webp: { type: 'image/webp', raster: true },
  avif: { type: 'image/avif', raster: true },
  jpg: { type: 'image/jpeg', raster: true },
  jpeg: { type: 'image/jpeg', raster: true },
  gif: { type: 'image/gif', raster: true },
  lottie: { type: 'application/lottie+json', raster: false },
  json: { type: 'application/json', raster: false },
  mp3: { type: 'audio/mpeg', raster: false },
  wav: { type: 'audio/wav', raster: false },
  ogg: { type: 'audio/ogg', raster: false },
  otf: { type: 'font/otf', raster: false },
  ttf: { type: 'font/ttf', raster: false },
  woff: { type: 'font/woff', raster: false },
  woff2: { type: 'font/woff2', raster: false },
};

export const ALLOWED_ASSET_EXTENSIONS = Object.keys(ASSET_TYPE_MAP);

// Status lifecycle: draft → published → disabled → archived (restorable).
export const ASSET_STATUSES = ['draft', 'published', 'disabled', 'archived'] as const;

export const ASSET_VISIBILITIES = ['public', 'vip', 'internal', 'beta'] as const;

export const ASSET_MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB (nginx allows 50M)