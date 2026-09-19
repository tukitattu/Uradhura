// ============================================================
// URADHURA ASSET CATALOG GENERATOR
// Single source of truth for original URADHURA artwork.
//   run: node platform/scripts/generate-asset-catalog.mjs
// Outputs:
//   platform/assets/<category-path>/<key>.svg          (vector artwork)
//   platform/assets/catalog.json                       (registry index for seeding)
//   platform/apps/player/src/lib/assets/bundledSVG.ts  (APK-bundled SVG strings)
//
// Everything here is ORIGINAL design — deep navy / black / electric
// blue / violet / cyan with premium gradients, glass surfaces and a
// soft glow. Nothing is copied from any other product.
// The registry accepts webp/avif raster uploads; SVG stays the
// preferred vector format for icons and glass backgrounds.
// ============================================================

import { mkdir, writeFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'assets');
const PLAYER_BUNDLE = join(__dirname, '..', 'apps', 'player', 'src', 'lib', 'assets', 'bundledSVG.ts');

const C = {
  navy950: '#050914',
  navy900: '#0a1220',
  navy800: '#0f1c33',
  navy700: '#16243f',
  navy600: '#1f3357',
  blue: '#2e6bff',
  violet: '#7c3aed',
  violetSoft: '#a78bfa',
  cyan: '#22d3ee',
  cyanSoft: '#7ae7ff',
  white: '#eef2ff',
  muted: '#8fa3c8',
  gold: '#ffc24d',
  rose: '#ff6b9d',
  green: '#34d399',
};

function linear(id, stops) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops
    .map(([off, color, op = 1]) => `<stop offset="${off}" stop-color="${color}" stop-opacity="${op}"/>`)
    .join('')}</linearGradient></defs>`;
}
function radial(id, stops) {
  return `<defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%">${stops
    .map(([off, color, op = 1]) => `<stop offset="${off}" stop-color="${color}" stop-opacity="${op}"/>`)
    .join('')}</radialGradient></defs>`;
}
function sprite(extra = '') {
  return [
    linear('ug-main', [['0', C.blue], ['0.55', C.violet], ['1', C.cyan]]),
    radial('ug-glow', [['0', C.cyanSoft, 0.85], ['1', C.cyan, 0]]),
    linear('ug-gold', [['0', '#ffe9b0'], ['0.5', C.gold], ['1', '#f59e0b']]),
    linear('ug-violet', [['0', C.violetSoft], ['1', C.violet]]),
    linear('ug-navy', [['0', C.navy700], ['1', C.navy900]]),
    linear('ug-glass', [['0', '#ffffff', 0.16], ['1', '#ffffff', 0.04]]),
    linear('ug-rose', [['0', C.rose], ['1', '#e11d48']]),
    linear('ug-bg', [['0', C.navy900], ['0.55', C.navy800], ['1', C.navy950]]),
    radial('ug-orbs', [['0', C.violet, 0.6], ['1', C.violet, 0]]),
    extra,
  ].join('');
}

function base({ w = 24, h = 24, body = '', def = sprite() }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none">${def}${body}</svg>`;
}
function glow(x = 12, y = 12, r = 8) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ug-glow)" opacity="0.4"/>`;
}

// ------------------------------------------------------------
// NAVIGATION ICONS — original line/duotone + selected variants
// ------------------------------------------------------------
function navIcon(d, sel) {
  const stroke = sel ? C.white : C.muted;
  return base({
    body: `${sel ? glow(12, 12, 8) : ''}
<path d="${d}" stroke="${stroke}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${sel ? 'fill="url(#ug-main)" fill-opacity="0.22"' : 'fill="none"'}/>
<path d="${d}" stroke="url(#ug-main)" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="${sel ? 1 : 0.85}"/>`,
  });
}

const NAV = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.4v-5h-5.2v5H5a1 1 0 0 1-1-1v-8.5Z',
  live: 'M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-11Zm5.5 2.2v6.6l5.5-3.3-5.5-3.3Z',
  party: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm-2.1 7.2 4.4 2.5-4.4 2.5v-5Zm-1.3 3.7-.2-2.7-3 .2v2.3h3.2Zm8.5-2.7-3 .2-.2 2.7h3.2v-2.9Zm-3.1-1.7 3.1-1-.9-2.1-3 1.4-.2 2.4.9-.6Zm-2.9-1.5.8 2.4h3l.8-2.4-1.2-1.2h-2.2l-1.2 1.2Z',
  games: 'M8.5 12a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7 0a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5 5h2.4l2.7 4H18a4.6 4.6 0 0 1 4.5 5.4L20.6 20a1.7 1.7 0 0 1-1.6 1H5a1.7 1.7 0 0 1-1.7-1.6l-.3-12.7A1.7 1.7 0 0 1 4.7 5H5Zm3 1.6.3 1.1L6.9 7h-1l3.2 4.4h.8L11.3 8.4l.4.2L13 6.7h1.3l.4 1.9.8 1.3c.9-.2 1.9-.2 2.9-.1l-1.4-2.7h1.2l-.5-1.4H8Z',
  wallet: 'M14 7H5a1.8 1.8 0 0 1 0-3.6h11.4V5M14 7l-1.6 9.4a1.8 1.8 0 0 1-1.8 1.6H6.3A1.8 1.8 0 0 1 4.5 16L6.1 7M18 8.5h1.2a1.8 1.8 0 0 1 1.8 1.8v3.4a1.8 1.8 0 0 1-1.8 1.8H18a1.9 1.9 0 0 1 0-3.8 1.9 1.9 0 0 1 0-3.8',
  messages: 'M5 5a2 2 0 0 0-2 2v7.2a2 2 0 0 0 2 2h1.2V19l3.6-2.8h9.2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5Zm3.2 4.6h7.6M8.2 12h4.6',
  profile: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-6.6 8a6.6 6.6 0 0 1 13.2 0Z',
};

const NAV_ICONS = Object.entries(NAV).map(([name, d]) => [
  { key: `icons.navigation.${name}`, name: `Nav ${name}`, target: name === 'messages' ? 'messages' : name, b: () => navIcon(d, false) },
  { key: `icons.navigation.${name}.selected`, name: `Nav ${name} (selected)`, target: name === 'messages' ? 'messages' : name, b: () => navIcon(d, true) },
]).flat();

// ------------------------------------------------------------
// HOME / PROFILE / SEAT / INVITE / CRYPTO icons
// ------------------------------------------------------------
const HOME_ICONS = [
  { key: 'icons.home.banner-cta', name: 'Home Banner CTA', target: 'home', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56" viewBox="0 0 120 56" fill="none">${sprite()}<rect width="120" height="56" rx="16" fill="url(#ug-bg)"/><rect width="120" height="56" rx="16" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.24"/><circle cx="20" cy="18" r="7" fill="url(#ug-main)" opacity="0.95"/><path d="M16 18h8M20 14v8" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round"/><text x="38" y="21" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${C.white}">Featured reward</text><text x="38" y="36" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="${C.muted}">Original limited-time event</text><rect x="88" y="16" width="24" height="24" rx="12" fill="url(#ug-main)"/><text x="100" y="32" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="${C.white}">Claim</text></svg>` },
  { key: 'icons.home.featured', name: 'Featured Star', target: 'home', b: () => base({ body: `<path d="M12 2 15 9l7 .6-5.3 4.7 1.6 7-6.3-3.9L5.7 21.3l1.6-7L2 9.6 9 9 12 2Z" fill="url(#ug-main)"/>` }) },
  { key: 'icons.home.ranking-badge', name: 'Ranking Badge', target: 'ranking', b: () => base({ body: `<circle cx="12" cy="12" r="9" fill="url(#ug-gold)" stroke="#ffffff" stroke-opacity="0.4"/><path d="m12 15-4 2.2 1-4.1-3.2-2.9 4.2-.4L12 6l2 4.3 4.2.4-3.2 2.9 1 4.1L12 15Z" fill="${C.navy900}"/>` }) },
  { key: 'icons.home.live-now', name: 'Live Now', target: 'live', b: () => base({ body: `<circle cx="12" cy="13" r="7" fill="url(#ug-violet)" opacity="0.9"/><path d="M9 15c1-1.6 2-2 3-2s2 .4 3 2" stroke="${C.white}" stroke-width="1.3" stroke-linecap="round" fill="none"/><circle cx="12" cy="5" r="2.4" fill="${C.white}"/>` }) },
];

const PROFILE_ICONS = [
  { key: 'icons.profile.level', name: 'Profile Level', target: 'profile', b: () => base({ body: `<polygon points="12,3 19,6 12,9 5,6" fill="url(#ug-violet)"/><path d="M5 9.5 12 12.5 19 9.5 19 14.6 12 17.6 5 14.6Z" fill="none" stroke="${C.violetSoft}" stroke-width="1.2"/><path d="M5 9.5 12 12.5 19 9.5" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.profile.store', name: 'Profile Store', target: 'profile', b: () => base({ body: `<path d="M5 10h14l-1 9a1.6 1.6 0 0 1-1.6 1.4H7.6A1.6 1.6 0 0 1 6 19l-1-9Zm2-5 2-3h6l2 3" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M9 14.5a3 3 0 0 0 6 0" stroke="url(#ug-main)" stroke-width="1.5" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.profile.items', name: 'Profile Items', target: 'profile', b: () => base({ body: `<rect x="6" y="8.4" width="12" height="11.6" rx="1.5" fill="none" stroke="${C.white}" stroke-width="1.4"/><path d="M6 10h12" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round"/><path d="M9.5 13.2v3.4a.6.6 0 0 0 .9.5l2.6-1.6 2.6 1.6a.6.6 0 0 0 .9-.5v-3.4" stroke="url(#ug-main)" stroke-width="1.5" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.profile.stats', name: 'Profile Stats', target: 'profile', b: () => base({ body: `<path d="M5 20V10M12 20V4M19 20v-7" stroke="${C.white}" stroke-width="2" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.profile.live-center', name: 'Live Center', target: 'live', b: () => base({ body: `<rect x="4.5" y="6" width="15" height="13" rx="3" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M10 9.2v6.6L15 12.5 10 9.2Z" fill="url(#ug-main)"/>` }) },
  { key: 'icons.profile.agency', name: 'My Agency', target: 'profile', b: () => base({ body: `<circle cx="12" cy="8.5" r="4" fill="url(#ug-violet)" opacity="0.9"/><path d="M4.5 19a7.5 7.5 0 0 1 15 0" stroke="${C.white}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M19.4 6.2a3 3 0 1 0 2.4-.4 2.6 2.6 0 1 1-2.4.4Z" fill="url(#ug-gold)"/>` }) },
];

// ------------------------------------------------------------
// LIVE / PARTY / GAMES / WALLET / MESSAGE / RANKING / GIFT
// + audio-room menu + reactions — all original URADHURA artwork
// ------------------------------------------------------------
const EXTRA_ICONS = [
  // audio room menu (original art, inspired placement)
  { key: 'icons.audio-room-menu.games', name: 'Audio Room: Games', target: 'room', b: () => base({ body: `<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="3.6" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M9 5.4 7.4 10h9.2L15 5.4" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="9.4" cy="13.5" r="1.1" fill="url(#ug-main)"/><circle cx="12" cy="15.2" r="1.1" fill="url(#ug-violet)"/><circle cx="14.6" cy="13.5" r="1.1" fill="url(#ug-rose)"/>` }) },
  { key: 'icons.audio-room-menu.luck-bag', name: 'Audio Room: Luck Bag', target: 'room', b: () => base({ body: `<path d="M5 11h14l-1.1 8.4a1.7 1.7 0 0 1-1.7 1.6H7.8a1.7 1.7 0 0 1-1.7-1.6L5 11Zm1.5-2.2A2.3 2.3 0 0 1 8.8 6.5L12 8l3.2-1.5c1.9.1 2.6 2.6.8 4.1M9 14l3 1.8 3-1.8" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="15.8" r="3.4" fill="url(#ug-gold)" opacity="0.35"/>` }) },
  // live room action bar
  { key: 'icons.live.comment', name: 'Live: Comment', target: 'live', b: () => base({ body: `<path d="M4.5 6.5a2.5 2.5 0 0 1 2.5-2.5h10a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.4 3v-3H7a2.5 2.5 0 0 1-2.5-2.5v-7Z" fill="none" stroke="${C.white}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="10" r="1.2" fill="url(#ug-main)"/><circle cx="12" cy="10" r="1.2" fill="url(#ug-violet)"/><circle cx="15" cy="10" r="1.2" fill="url(#ug-cyan)"/>` }) },
  { key: 'icons.live.gift', name: 'Live: Send Gift', target: 'live', b: () => base({ body: `<path d="M5 10h14l-1.2 9a1.6 1.6 0 0 1-1.6 1.4H7.8A1.6 1.6 0 0 1 6.2 19L5 10Zm2.4-5 3-2.4a2.6 2.6 0 0 1 3.2 0l3 2.4" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 14.5a4 4 0 0 0 8 0Z" fill="url(#ug-main)"/>` }) },
  { key: 'icons.live.react', name: 'Live: React', target: 'live', b: () => base({ body: `<circle cx="12" cy="12" r="8.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M8.6 13.6c.8 1.7 2 2.5 3.4 2.5s2.6-.8 3.4-2.5" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="9" cy="9.4" r="1.2" fill="url(#ug-main)"/><circle cx="15" cy="9.4" r="1.2" fill="url(#ug-cyan)"/><path d="M8 5.6l.8-.8M16 5.6l-.8-.8" stroke="${C.violetSoft}" stroke-width="1.2" stroke-linecap="round"/>` }) },
  { key: 'icons.live.viewers', name: 'Live: Viewers', target: 'live', b: () => base({ body: `<path d="M3 12s2.8-5.4 9-5.4S21 12 21 12s-2.8 5.4-9 5.4S3 12 3 12Z" stroke="${C.white}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="2.8" fill="url(#ug-violet)"/>` }) },
  { key: 'icons.live.follow', name: 'Live: Follow', target: 'live', b: () => base({ body: `<circle cx="10" cy="9.5" r="3.6" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M3.6 19a6.4 6.4 0 0 1 12.8 0M18.5 8.2v4.6M16.2 10.5h4.6" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="18.5" cy="8.2" r="2.9" fill="url(#ug-rose)" opacity="0.4"/>` }) },
  // party
  { key: 'icons.party.create', name: 'Party: Create Room', target: 'party', b: () => base({ body: `<circle cx="10" cy="11" r="6" fill="url(#ug-violet)" opacity="0.4"/><circle cx="15" cy="15" r="6" fill="none" stroke="${C.white}" stroke-width="1.5"/><path d="M11.8 12.8h6.4M15 10v6.4" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round"/>` }) },
  { key: 'icons.party.members', name: 'Party: Members', target: 'party', b: () => base({ body: `<circle cx="9" cy="9" r="3.6" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M3 19a6 6 0 0 1 12 0M16 5.6a3.2 3.2 0 0 1 0 6.2M15.5 19a6.2 6.2 0 0 1 1.4-3.9 4.6 4.6 0 0 0-1-9" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="15.8" cy="8.4" r="1.4" fill="url(#ug-cyan)"/>` }) },
  { key: 'icons.party.invite', name: 'Party: Invite', target: 'party', b: () => base({ body: `<rect x="4" y="6" width="16" height="12" rx="2.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="m5.2 7.6 6.8 4.8 6.8-4.8" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 13.2V9.4M10.4 11.4h3.2" stroke="url(#ug-main)" stroke-width="1.4" stroke-linecap="round"/>` }) },
  // game launcher icons
  { key: 'icons.games.teen-patti', name: 'Game: Teen Patti', target: 'games', b: () => base({ body: `<rect x="3.4" y="8" width="7.4" height="9.6" rx="1.4" transform="rotate(-9 7.1 12.8)" stroke="${C.white}" stroke-width="1.4" fill="none"/><rect x="8.6" y="6.8" width="7.4" height="9.6" rx="1.4" transform="rotate(6 12.3 11.6)" fill="url(#ug-violet)" opacity="0.45"/><rect x="13.4" y="8.6" width="7.4" height="9.6" rx="1.4" transform="rotate(12 17.1 13.4)" stroke="url(#ug-main)" stroke-width="1.6" fill="none"/><circle cx="11.6" cy="10" r="1.3" fill="url(#ug-main)"/><circle cx="14.8" cy="12.4" r="1.3" fill="url(#ug-rose)"/><circle cx="18.2" cy="14" r="1.3" fill="url(#ug-gold)"/>` }) },
  { key: 'icons.games.greedy-monkey', name: 'Game: Greedy Monkey', target: 'games', b: () => base({ body: `<circle cx="8" cy="12" r="3.6" fill="url(#ug-gold)" opacity="0.4"/><circle cx="16" cy="12" r="3.6" fill="url(#ug-gold)" opacity="0.4"/><circle cx="12" cy="9.4" r="5.2" fill="url(#ug-main)"/><circle cx="10" cy="8.4" r="1.2" fill="${C.white}"/><circle cx="14" cy="8.4" r="1.2" fill="${C.white}"/><path d="M9 12.6c1.6 1.6 4.4 1.6 6 0" stroke="${C.navy900}" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M4.6 8.4 3.6 6.4m16 2 1-2" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round"/>` }) },
  { key: 'icons.games.greedy-lion', name: 'Game: Greedy Lion', target: 'games', b: () => base({ body: `<circle cx="12" cy="13" r="6.4" fill="url(#ug-gold)"/><path d="M7.6 8.4 6 5.6m10.4 2.8L18 5.6M9 6.4l2-2.6m4 2.6-2-2.6" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="11.4" r="3" fill="${C.navy900}"/><circle cx="11" cy="10.6" r=".9" fill="${C.white}"/><circle cx="13" cy="10.6" r=".9" fill="${C.white}"/><path d="M10 14c1 .8 3 .8 4 0" stroke="${C.navy900}" stroke-width="1.2" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.games.food-wheel', name: 'Game: Food Wheel', target: 'games', b: () => base({ body: `<circle cx="12" cy="12" r="8" stroke="${C.white}" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="5.4" fill="url(#ug-violet)" opacity="0.35"/><path d="M12 4v3.2m6.8 6H15.6M12 20v-3.2M5.2 13.2H8.4" stroke="url(#ug-main)" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="${C.gold}"/>` }) },
  { key: 'icons.games.three-card', name: 'Game: Three-Player Card', target: 'games', b: () => base({ body: `<rect x="3.5" y="9" width="6" height="9" rx="1.4" stroke="${C.white}" stroke-width="1.4" fill="none"/><rect x="9.5" y="6" width="6" height="9" rx="1.4" fill="url(#ug-violet)" opacity="0.5"/><rect x="14.5" y="9.6" width="6" height="9.4" rx="1.4" stroke="url(#ug-main)" stroke-width="1.6" fill="none"/><circle cx="12.4" cy="9.2" r="1.1" fill="url(#ug-gold)"/>` }) },
  { key: 'icons.games.slot-multiplier', name: 'Game: Slot Multiplier', target: 'games', b: () => base({ body: `<rect x="4" y="5.4" width="16" height="13.2" rx="2.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M9 3.4h6l-.8 2H9.8L9 3.4Z" fill="${C.muted}"/><circle cx="9.4" cy="12" r="1.5" fill="url(#ug-rose)"/><circle cx="12" cy="12" r="1.5" fill="url(#ug-gold)"/><circle cx="14.6" cy="12" r="1.5" fill="url(#ug-main)"/><path d="M9 16.6h6" stroke="${C.white}" stroke-width="1.3" stroke-linecap="round"/>` }) },
  { key: 'icons.games.coming-soon', name: 'Game: Coming Soon', target: 'games', b: () => base({ body: `<circle cx="12" cy="12" r="8.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M12 7.2V12l3 1.8" stroke="url(#ug-main)" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M5 3.4 3.4 5m17-1.6L19 5" stroke="${C.violetSoft}" stroke-width="1.3" stroke-linecap="round"/>` }) },
  // wallet actions
  { key: 'icons.wallet.deposit', name: 'Wallet: Deposit', target: 'wallet', b: () => base({ body: `<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="2.6" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M12 9.4v5m-2.2-2.2L12 14.6l2.2-2.2" stroke="url(#ug-main)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
  { key: 'icons.wallet.withdraw', name: 'Wallet: Withdraw', target: 'wallet', b: () => base({ body: `<rect x="3.6" y="5.4" width="16.8" height="13.2" rx="2.6" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M12 14.6v-5m-2.2 2.2L12 9.4l2.2 2.2" stroke="url(#ug-violet)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
  { key: 'icons.wallet.transfers', name: 'Wallet: Transfers', target: 'wallet', b: () => base({ body: `<path d="M4 8h11m0 0-3-3m3 3-3 3M20 16H9m0 0 3-3m-3 3 3 3" stroke="url(#ug-main)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
  { key: 'icons.wallet.crypto', name: 'Wallet: Crypto Gateways', target: 'crypto', b: () => base({ body: `<circle cx="10" cy="12" r="4.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><circle cx="14.5" cy="13.6" r="4.4" stroke="url(#ug-main)" stroke-width="1.5" fill="none"/><path d="M13.2 9.8 11 14.4" stroke="${C.gold}" stroke-width="1.4" stroke-linecap="round"/>` }) },
  // messages
  { key: 'icons.message.threads', name: 'Messages: Threads', target: 'messages', b: () => base({ body: `<path d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v4a2.5 2.5 0 0 1-2.5 2.5H10l-3.5 2.8V15H7.5A2.5 2.5 0 0 1 5 12.5v-4Z" stroke="${C.white}" stroke-width="1.5" stroke-linejoin="round" fill="none"/><path d="M8.5 10.2h7M8.5 12.6h4" stroke="url(#ug-main)" stroke-width="1.4" stroke-linecap="round"/>` }) },
  { key: 'icons.message.dm', name: 'Messages: Direct', target: 'messages', b: () => base({ body: `<circle cx="9" cy="9.5" r="3.4" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M3 18.5a5.8 5.8 0 0 1 11.4-.6 5 5 0 0 1 2.6 2 2.6 2.6 0 0 1-2.6 2H5.6" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" fill="none"/><path d="M18.5 6.5v5M16 9h5" stroke="url(#ug-rose)" stroke-width="1.5" stroke-linecap="round"/>` }) },
  // ranking
  { key: 'icons.ranking.trophy', name: 'Ranking: Trophy', target: 'ranking', b: () => base({ body: `<path d="M9 4h6v4.4A3 3 0 0 1 12 11a3 3 0 0 1-3-2.6V4Z" fill="url(#ug-gold)"/><path d="M9 5H6.2a2.4 2.4 0 0 0 2.4 4M15 5h2.8a2.4 2.4 0 0 1-2.4 4M12 11v4m0 0h-4v1.6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V15h-4Zm0 0v3" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
  { key: 'icons.ranking.medal-1', name: 'Ranking: Gold Medal', target: 'ranking', b: () => base({ body: `<circle cx="12" cy="14.5" r="6.2" fill="url(#ug-gold)"/><circle cx="12" cy="14.5" r="4.6" fill="${C.navy900}"/><text x="12" y="17.6" font-family="Arial, Helvetica, sans-serif" font-size="7" font-weight="900" fill="${C.gold}" text-anchor="middle">1</text><path d="M9 5.4 12 8l3-2.6-1 4.2-2-1.4-2 1.4-1-4.2Z" fill="url(#ug-gold)"/>` }) },
  { key: 'icons.ranking.medal-2', name: 'Ranking: Silver Medal', target: 'ranking', b: () => base({ body: `<circle cx="12" cy="14.5" r="6.2" fill="#cbd5e1"/><circle cx="12" cy="14.5" r="4.6" fill="${C.navy900}"/><text x="12" y="17.6" font-family="Arial, Helvetica, sans-serif" font-size="7" font-weight="900" fill="#cbd5e1" text-anchor="middle">2</text><path d="M9 5.4 12 8l3-2.6-1 4.2-2-1.4-2 1.4-1-4.2Z" fill="#cbd5e1"/>` }) },
  { key: 'icons.ranking.medal-3', name: 'Ranking: Bronze Medal', target: 'ranking', b: () => base({ body: `<circle cx="12" cy="14.5" r="6.2" fill="#d9a066"/><circle cx="12" cy="14.5" r="4.6" fill="${C.navy900}"/><text x="12" y="17.6" font-family="Arial, Helvetica, sans-serif" font-size="7" font-weight="900" fill="#d9a066" text-anchor="middle">3</text><path d="M9 5.4 12 8l3-2.6-1 4.2-2-1.4-2 1.4-1-4.2Z" fill="#d9a066"/>` }) },
  // gift panel
  { key: 'icons.gift.panel', name: 'Gift: Panel', target: 'gift', b: () => base({ body: `<path d="M5 10h14l-1.2 9a1.6 1.6 0 0 1-1.6 1.4H7.8A1.6 1.6 0 0 1 6.2 19L5 10Zm2.4-5 3-2.4a2.6 2.6 0 0 1 3.2 0l3 2.4" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 14.6a4 4 0 0 0 8 0ZM9.6 16.4l1-1m2.9 1.1 1 1" stroke="url(#ug-main)" stroke-width="1.2" stroke-linecap="round"/>` }) },
  { key: 'icons.gift.super-send', name: 'Gift: Super Send', target: 'gift', b: () => base({ body: `<path d="M12 3c2.4.6 4 2.2 4.8 4.8.6 2.2.2 5-1 7.8l-1.2 2.6h-5.2l-1.2-2.6c-1.2-2.8-1.6-5.6-1-7.8C8 5.2 9.6 3.6 12 3Zm0 0v3.2M5.6 16.2c1.4 1.2 3.2 1.9 5.4 1.9M18.4 16.2c-1.4 1.2-3.2 1.9-5.4 1.9" stroke="${C.white}" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M12 9.6v5.2m-2.6-2.6h5.2" stroke="url(#ug-main)" stroke-width="1.5" stroke-linecap="round"/>` }) },
  { key: 'icons.gift.combo', name: 'Gift: Combo', target: 'gift', b: () => base({ body: `<path d="M9.6 6.4C12 4.8 15.6 5.4 16.4 8c.6 2 0 3.6-1.6 4.8M14.4 17.6c-2.4 1.6-6 1-6.8-1.6-.6-2 0-3.6 1.6-4.8" stroke="${C.white}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="m12 9.8 3 2.2-3 2.2V12Z" fill="url(#ug-main)"/><path d="M8.4 6 6 8.4 8.4 10.8 6 13.2l2.4 2.4" stroke="url(#ug-gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
];

// ------------------------------------------------------------
// REACTIONS — original live reaction glyphs
// ------------------------------------------------------------
const REACTIONS = [
  { key: 'reactions.like', name: 'React: Like', target: 'live', b: () => base({ body: `<path d="M6 19.4V10c0-.6.4-1 1-1h1l3.2-4.4A1.6 1.6 0 0 1 13 5.4c.7.5.9 1.3.7 2l-.7 2.6h3.3a1.9 1.9 0 0 1 1.9 2.3l-1 4.6a2 2 0 0 1-2 1.6H7a1 1 0 0 1-1-1Z" fill="url(#ug-main)"/><path d="M6 19.4h3.4" stroke="${C.white}" stroke-width="1.5" stroke-linecap="round"/>` }) },
  { key: 'reactions.heart', name: 'React: Love', target: 'live', b: () => base({ body: `<path d="M12 20.5 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5L12 20.5Z" fill="url(#ug-rose)"/><path d="M9 5.5c2.4 1.6 2.6 3.6 1.6 5.8M13.4 4.8c-1.6 1-.8 2.8.4 3.2" stroke="${C.white}" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.7"/>` }) },
  { key: 'reactions.haha', name: 'React: HaHa', target: 'live', b: () => base({ body: `<circle cx="12" cy="12" r="8.4" fill="url(#ug-gold)" opacity="0.9"/><circle cx="9" cy="10" r="1.2" fill="${C.navy900}"/><circle cx="15" cy="10" r="1.2" fill="${C.navy900}"/><path d="M8.6 14.4c1 1.2 2 1.8 3.4 1.8s2.4-.6 3.4-1.8" stroke="${C.navy900}" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M9 7.6c-1 .8-1 .8-2 1.2M17 7.6c1 .8 1 .8 2 1.2" stroke="${C.navy900}" stroke-width="1.2" stroke-linecap="round" fill="none"/>` }) },
  { key: 'reactions.wow', name: 'React: Wow', target: 'live', b: () => base({ body: `<circle cx="12" cy="12" r="8.4" fill="url(#ug-violet)" opacity="0.9"/><circle cx="9.2" cy="9.8" r="1.5" fill="${C.white}"/><circle cx="14.8" cy="9.8" r="1.5" fill="${C.white}"/><ellipse cx="12" cy="14.8" rx="2.1" ry="2.7" fill="${C.navy900}"/><path d="M9 7.4c-.9-.7-1-1-1-1.6M15 7.4c.9-.7 1-1 1-1.6" stroke="${C.white}" stroke-width="1.1" stroke-linecap="round" fill="none"/>` }) },
  { key: 'reactions.sad', name: 'React: Sad', target: 'live', b: () => base({ body: `<circle cx="12" cy="12" r="8.4" fill="url(#ug-main)" opacity="0.85"/><circle cx="9.2" cy="10.4" r="1.4" fill="${C.white}"/><circle cx="14.8" cy="10.4" r="1.4" fill="${C.white}"/><path d="M8.8 16.4c1-1.2 2-1.7 3.2-1.7s2.2.5 3.2 1.7" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/><path d="M7.4 8c-.4.8-.4 1-.2 1.6" stroke="${C.white}" stroke-width="1.1" stroke-linecap="round" fill="none"/><path d="M9.6 7.4c-.4.6-.9.9-1.6 1.1" stroke="${C.white}" stroke-width="1.1" stroke-linecap="round" fill="none"/>` }) },
  { key: 'reactions.congrats', name: 'React: Congrats', target: 'live', b: () => base({ body: `<circle cx="12" cy="12" r="7" fill="url(#ug-main)" opacity="0.9"/><path d="M8.6 12.6c.8 1.2 1.8 1.8 3.4 1.8s2.6-.6 3.4-1.8" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="9.2" cy="10" r="1.1" fill="${C.white}"/><circle cx="14.8" cy="10" r="1.1" fill="${C.white}"/><path d="M5 4.5l.8 1.8M19 4.5l-.8 1.8M12 3.4v-.6" stroke="url(#ug-gold)" stroke-width="1.4" stroke-linecap="round"/>` }) },
];

const SEAT_ICONS = [
  { key: 'icons.audio-seat.host', name: 'Host Seat', target: 'room', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-gold)"/><circle cx="12" cy="9" r="3.1" fill="${C.navy900}"/><path d="M6 18.5c1.3-2.5 3.3-3.7 6-3.7s4.7 1.2 6 3.7" stroke="${C.navy900}" stroke-width="1.7" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.audio-seat.co-host', name: 'Co-Host Seat', target: 'room', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-violet)"/><circle cx="12" cy="9" r="3.1" fill="${C.white}"/><path d="M6 18.5c1.3-2.5 3.3-3.7 6-3.7s4.7 1.2 6 3.7" stroke="${C.white}" stroke-width="1.7" stroke-linecap="round" fill="none"/>` }) },
  { key: 'icons.audio-seat.user', name: 'User Seat', target: 'room', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-navy)" stroke="#ffffff" stroke-opacity="0.35"/><circle cx="12" cy="9" r="3.1" fill="${C.muted}"/><path d="M6 18.5c1.3-2.5 3.3-3.7 6-3.7s4.7 1.2 6 3.7" stroke="${C.muted}" stroke-width="1.7" stroke-linecap="round" fill="none"/>` }) },
];

function shareRect(stroke, fill = 'url(#ug-navy)') {
  return `<rect width="32" height="32" rx="9" fill="${fill}" stroke="${stroke}" stroke-opacity="0.5"/>`;
}
const INVITE_ICONS = [
  { key: 'icons.invite.share', name: 'Share (app)', target: 'profile', b: () => base({ body: `<path d="M12 3v11M8 6.8 4.5 9.6A6.6 6.6 0 0 0 8 18.4M16 6.8l3.5 2.8A6.6 6.6 0 0 1 16 18.4" stroke="${C.white}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M9 14h6" stroke="${C.white}" stroke-width="1.6" stroke-linecap="round"/>` }) },
  { key: 'icons.invite.whatsapp', name: 'Share: WhatsApp', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#34d399')}<path d="M6.4 25.6 8 20.6A10.5 10.5 0 1 1 11.4 24l-5 .6Zm8.1-4.2c3.9 2.1 7.2 1 8.3-2 .5-1.5.1-2.9-1.6-3.8l-1.3-.6a1.1 1.1 0 0 0-1.4.3l-.5.6a.3.3 0 0 1-.4 0 8 8 0 0 1-2.2-2.2.3.3 0 0 1 0-.4l.6-.5a1.1 1.1 0 0 0 .3-1.4l-.7-1.3c-.4-.9-1-1.7-1.9-1.5-2.9.7-4.1 3.9-2 7.2" stroke="#34d399" stroke-width="1.1" fill="none"/></svg>` },
  { key: 'icons.invite.telegram', name: 'Share: Telegram', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#22d3ee')}<path d="M6 16.4 24.6 8.8l-2.1 13.1-4.3-2 .2 3.4-1.7-1.8-2.4 1.2 1-4.2L20 13l-9.6 4.2-2-2.3Z" fill="#22d3ee" fill-opacity="0.9"/></svg>` },
  { key: 'icons.invite.x', name: 'Share: X', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#a78bfa')}<path d="M7.5 7.5h4.1l8.8 17h-4.1L7.5 7.5Zm6 7.2 3.3-3.9-3.6 5.2 3.4 5.7-3.1.2-3.5-5.7 3.5-1.5Z" fill="#eef2ff"/></svg>` },
  { key: 'icons.invite.facebook', name: 'Share: Facebook', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#4d7fff')}<path d="M16 8h4.8v4H19c-.8 0-1 .4-1 1v2h2.6l-.6 3.4H18v7.6h-4V18.4h-2.7V15H14v-2.4c0-2.8 1.3-4.6 4-4.6h-2Z" fill="#4d7fff"/></svg>` },
  { key: 'icons.invite.instagram', name: 'Share: Instagram', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#ff6b9d')}<rect x="8" y="8" width="16" height="16" rx="5" stroke="#ff6b9d" stroke-width="1.6" fill="none"/><circle cx="16" cy="16" r="4" stroke="#ff6b9d" stroke-width="1.6" fill="none"/><circle cx="22.4" cy="9.6" r="1.3" fill="#ff6b9d"/></svg>` },
  { key: 'icons.invite.link', name: 'Share: Copy Link', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">${sprite()}${shareRect('#22d3ee')}<path d="M18.5 13.5 14 18a2.4 2.4 0 0 1-3.4-3.4l2-2M13.5 18.5 18 14a2.4 2.4 0 0 0 3.4 3.4l-2 2" stroke="#22d3ee" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>` },
];

const CRYPTO_ICONS = [
  { key: 'crypto.btc', name: 'Bitcoin (mark)', target: 'crypto', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-gold)"/><path d="M9.6 15.6V8.4h3.4c2.1-.1 3.7 1 3.9 2.9.1 1.6-.7 2.4-2 2.7 1.6.3 2.6 1.4 2.5 3-.2 2.2-1.9 3.4-4.4 3.4H9.6Z" stroke="${C.navy900}" stroke-width="1.4" fill="none"/><path d="M10.2 12h2.9M10.2 9.2h1.9M10.2 15.6h1.9" stroke="${C.navy900}" stroke-width="1.4" stroke-linecap="round"/>` }) },
  { key: 'crypto.eth', name: 'Ethereum (mark)', target: 'crypto', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-violet)"/><path d="M12 5.5 16.2 12.4 12 9.6 7.8 12.4 12 5.5Z" fill="${C.white}" opacity="0.95"/><path d="M12 9.6v5.4l4.2-2.6L12 9.6Zm0 5.4L7.8 12.4 12 15Zm0 1.6v3.5L7.8 13 12 17Zm0 3.5 4.2-7.5L12 20.5Z" fill="${C.white}" fill-opacity="0.55"/>` }) },
  { key: 'crypto.usdt', name: 'Tether (mark)', target: 'crypto', b: () => base({ body: `<circle cx="12" cy="12" r="9.2" fill="url(#ug-main)"/><rect x="7.4" y="10.6" width="9.2" height="2.2" rx="1.1" fill="${C.white}" opacity="0.9"/><path d="M12 6.4c2.6 0 4.6 1.4 5 3h-2c-.3-.9-1.5-1.6-3-1.6s-2.7.7-3 1.6H7c.4-1.6 2.4-3 5-3Zm0 4.6v8.6l4.2-2.3V11a8 8 0 0 1-8.4 0v6.3L12 19.6Z" fill="${C.white}" fill-opacity="0.85"/>` }) },
  { key: 'crypto.coming-soon', name: 'Crypto Coming Soon', target: 'crypto', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56" viewBox="0 0 120 56" fill="none">${sprite()}<rect width="120" height="56" rx="16" fill="url(#ug-bg)"/><rect width="120" height="56" rx="16" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.2"/><circle cx="18" cy="28" r="8" fill="url(#ug-main)" opacity="0.9"/><path d="M16 28h4M18 26v4" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round"/><text x="34" y="32" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="${C.white}">Crypto deposits — coming soon</text><rect x="88" y="20" width="24" height="16" rx="8" fill="url(#ug-navy)" stroke="${C.violetSoft}" stroke-opacity="0.6"/><text x="100" y="31" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="${C.violetSoft}">SOON</text></svg>` },
];

// ------------------------------------------------------------
// GIFTS — original glyphs
// ------------------------------------------------------------
const GIFTS = [
  { key: 'gifts.basic.heart', name: 'Gift: Heart', target: 'gift', b: () => base({ body: `<path d="M12 20.5 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5L12 20.5Z" fill="url(#ug-main)"/><path d="M8 4h3l1 1.2h3v2.6H8V4Z" fill="${C.white}" fill-opacity="0.85"/>` }) },
  { key: 'gifts.basic.rose', name: 'Gift: Rose', target: 'gift', b: () => base({ body: `<path d="M12 19c-4-2.4-5.8-5-5.8-7.6 0-1.9 1.5-3.4 3.4-3.4 1.2 0 2.1.7 2.4.9.3-.2 1.2-.9 2.4-.9 1.9 0 3.4 1.5 3.4 3.4 0 2.6-1.8 5.2-5.8 7.6Z" fill="url(#ug-rose)"/><path d="M10 3.4c.6 1.4 1.4 2.4 2.6 3" stroke="${C.green}" stroke-width="1.3" stroke-linecap="round" fill="none"/>` }) },
  { key: 'gifts.basic.star', name: 'Gift: Star', target: 'gift', b: () => base({ body: `<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8L12 3Z" fill="url(#ug-gold)"/>` }) },
  { key: 'gifts.basic.candy', name: 'Gift: Candy', target: 'gift', b: () => base({ body: `<path d="M12 8.5c-2 0-3.6 3.4-3.6 6s1.6 3.6 3.6 3.6 3.6-1 3.6-3.6-1.6-6-3.6-6Zm-4.5-1 1.5-1.5m6 0 1.5 1.5m-4.5 0V5" stroke="${C.white}" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="9.4" cy="11.6" r="1.1" fill="url(#ug-main)"/><circle cx="13" cy="13.4" r="1.1" fill="url(#ug-violet)"/><circle cx="12" cy="16.6" r="1.1" fill="url(#ug-rose)"/>` }) },
  { key: 'gifts.premium.crown', name: 'Gift: Crown', target: 'gift', b: () => base({ body: `<path d="M5 17h14l1.4-8.4-4.4 3.6L12 5.5 8 12.2 3.6 8.6 5 17Z" fill="url(#ug-gold)"/><circle cx="5" cy="18.4" r="1.2" fill="${C.navy900}"/><circle cx="12" cy="18.4" r="1.2" fill="${C.navy900}"/><circle cx="19" cy="18.4" r="1.2" fill="${C.navy900}"/>` }) },
  { key: 'gifts.premium.rocket', name: 'Gift: Rocket', target: 'gift', b: () => base({ body: `<path d="M12 3c2.6.6 4.4 2.4 5.2 5.2.7 2.4.2 5.4-1 8.6l-1.5 3H9.3L7.8 16.8c-1.2-3.2-1.7-6.2-1-8.6C7.6 5.4 9.4 3.6 12 3Zm0 0v3.2M5.5 17c1.5 1.3 3.4 2 5.8 2M18.5 17c-1.5 1.3-3.4 2-5.8 2" stroke="${C.white}" stroke-width="1.3" stroke-linecap="round" fill="none"/><circle cx="12" cy="9.6" r="1.9" fill="${C.navy900}"/>` }) },
  { key: 'gifts.premium.diamond', name: 'Gift: Diamond', target: 'gift', b: () => base({ body: `<path d="M12 3.5 18.5 8 12 20.5 5.5 8 12 3.5ZM12 3.5 8.5 8m0 0h7m-7 0L12 20.5m3.5-12.5L12 20.5" stroke="url(#ug-main)" stroke-width="1.4" stroke-linejoin="round" fill="none"/><path d="M5.5 8h13" stroke="${C.white}" stroke-width="1.2" stroke-linecap="round"/>` }) },
  { key: 'gifts.luxury.world', name: 'Gift: World', target: 'gift', b: () => base({ body: `<circle cx="12" cy="12" r="8.5" fill="url(#ug-violet)" opacity="0.35"/><circle cx="12" cy="12" r="7.8" stroke="${C.violetSoft}" stroke-width="1.2" fill="none"/><path d="M4.5 12h15M12 4.5c2 2 3 4.7 3 7.5s-1 5.5-3 7.5c-2-2-3-4.7-3-7.5s1-5.5 3-7.5Z" stroke="${C.violetSoft}" stroke-width="1.2" fill="none"/>` }) },
];

// ------------------------------------------------------------
// BACKGROUNDS — original gradient environments
// ------------------------------------------------------------
function bgArt(key, label) {
  const grad = `ug-bg-${key}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960" fill="none">${sprite(linear(grad, [['0', '#070d1d'], ['0.5', '#122044'], ['1', '#1a1440']]))}<rect width="540" height="960" fill="url(#${grad})"/>
<circle cx="96" cy="140" r="180" fill="url(#ug-orbs)" opacity="0.55"/>
<circle cx="452" cy="320" r="220" fill="url(#ug-orbs)" opacity="0.4"/>
<circle cx="270" cy="760" r="260" fill="url(#ug-orbs)" opacity="0.45"/>
<path d="M0 820 C160 760 300 880 540 800" stroke="url(#ug-main)" stroke-width="1.4" stroke-opacity="0.5" fill="none"/>
<path d="M0 860 C180 800 340 920 540 840" stroke="${C.violet}" stroke-width="1" stroke-opacity="0.35" fill="none"/>
<g fill="${C.white}" fill-opacity="0.5">
<circle cx="40" cy="60" r="2"/><circle cx="150" cy="30" r="1.4"/><circle cx="470" cy="90" r="1.8"/><circle cx="500" cy="520" r="1.6"/><circle cx="30" cy="420" r="1.4"/><circle cx="260" cy="180" r="1.7"/><circle cx="420" cy="640" r="1.5"/><circle cx="90" cy="700" r="1.6"/>
</g>
<rect x="20" y="60" width="180" height="18" rx="9" fill="url(#ug-main)" opacity="0.9"/>
<text x="30" y="73" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="${C.white}">${label}</text></svg>`;
}

const BG = [
  ['home', 'Home'], ['room', 'Room'], ['ranking', 'Ranking'],
  ['wallet', 'Wallet'], ['games', 'Games'], ['party', 'Party'], ['live', 'Live'],
];

// ------------------------------------------------------------
// LOGOS / SPLASH / APP ICON
// ------------------------------------------------------------
const LOGOS = [
  { key: 'logo.uradhura-logo', name: 'Uradhura Logo', target: 'global', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="52" viewBox="0 0 200 52" fill="none">${sprite()}<path d="M6 12a12 12 0 0 1 24 0l2 34H6l2-34Z" fill="url(#ug-main)" fill-opacity="0.16" stroke="url(#ug-main)" stroke-width="2"/><path d="M13 14c1.5-4 4.5-6 8-6 5 0 8 4 9 9.5V30c1.2 2 1.6 4 1.6 6" stroke="url(#ug-main)" stroke-width="2.4" stroke-linecap="round"/><text x="50" y="34" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="1" fill="${C.white}">Uradhura</text><text x="52" y="48" font-family="Arial, Helvetica, sans-serif" font-size="10" letter-spacing="3" fill="${C.cyanSoft}">PLAY · LIVE · PARTY</text></svg>` },
  { key: 'logo.uradhura-emblem', name: 'Uradhura Emblem', target: 'global', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">${sprite()}<path d="M8 16a14 14 0 0 1 28 0l2 36H6l2-36Z" fill="url(#ug-main)" fill-opacity="0.2" stroke="url(#ug-main)" stroke-width="2.4"/><path d="M15 18c1.7-4.6 5.2-7 9.4-7 5.8 0 9.4 4.6 10.5 11" stroke="url(#ug-main)" stroke-width="2.6" stroke-linecap="round"/><circle cx="24" cy="18" r="3.4" fill="${C.white}"/></svg>` },
  { key: 'logo.uradhura-splash', name: 'Uradhura Splash', target: 'login', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360" fill="none">${sprite()}<rect width="360" height="360" fill="url(#ug-bg)"/><circle cx="180" cy="150" r="120" fill="url(#ug-orbs)" opacity="0.5"/><path d="M150 132a42 42 0 0 1 84 0l6 108h-96l6-108Z" fill="url(#ug-main)" fill-opacity="0.22" stroke="url(#ug-main)" stroke-width="5"/><path d="M164 136c5-14 15-21 28-21 17 0 28 14 31 33" stroke="url(#ug-main)" stroke-width="8" stroke-linecap="round"/><circle cx="192" cy="132" r="10" fill="${C.white}"/><text x="180" y="278" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="${C.white}" text-anchor="middle">Uradhura</text><text x="180" y="306" font-family="Arial, Helvetica, sans-serif" font-size="12" letter-spacing="6" fill="${C.cyanSoft}" text-anchor="middle">PLAY · LIVE · PARTY</text></svg>` },
  { key: 'logo.uradhura-app-icon', name: 'Uradhura App Icon', target: 'global', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">${sprite()}<rect width="512" height="512" rx="112" fill="url(#ug-bg)"/><circle cx="256" cy="240" r="170" fill="url(#ug-orbs)" opacity="0.5"/><path d="M210 216a60 60 0 0 1 120 0l8 154h-136l8-154Z" fill="url(#ug-main)" fill-opacity="0.22" stroke="url(#ug-main)" stroke-width="12"/><path d="M228 220c7-20 22-30 40-30 25 0 40 20 45 47" stroke="url(#ug-main)" stroke-width="16" stroke-linecap="round"/><circle cx="268" cy="212" r="15" fill="${C.white}"/></svg>` },
];

// ------------------------------------------------------------
// FRAMES — original overlay frames
// ------------------------------------------------------------
const FRAMES = [
  { key: 'frame.avatar.default', name: 'Avatar Frame: Default', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="40" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/><circle cx="48" cy="48" r="35" fill="none" stroke="url(#ug-navy)" stroke-width="5"/></svg>` },
  { key: 'frame.avatar.top1', name: 'Avatar Frame: Rank 1', target: 'ranking', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="41" fill="none" stroke="url(#ug-gold)" stroke-width="5"/><circle cx="48" cy="48" r="45" fill="none" stroke="${C.gold}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 6"/><path d="M48 4l3 3h6l-2 4 6-2 2 6-5 2 5 2-2 6-6-2 2 4h-6l-3 3-3-3h-6l2-4-6 2-2-6 5-2-5-2 2-6 6 2-2-4h6l3-3Z" fill="url(#ug-gold)"/></svg>` },
  { key: 'frame.avatar.top2', name: 'Avatar Frame: Rank 2', target: 'ranking', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="41" fill="none" stroke="url(#ug-main)" stroke-width="5"/><circle cx="48" cy="48" r="45" fill="none" stroke="${C.blueSoft}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="4 6"/><path d="M48 6 56 16H40L48 6Z" fill="url(#ug-main)"/></svg>` },
  { key: 'frame.avatar.top3', name: 'Avatar Frame: Rank 3', target: 'ranking', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="41" fill="none" stroke="#d9a066" stroke-width="5"/><circle cx="48" cy="48" r="45" fill="none" stroke="#d9a066" stroke-opacity="0.4" stroke-width="2" stroke-dasharray="4 6"/><path d="M48 6 54 14H42L48 6Z" fill="#d9a066"/></svg>` },
  { key: 'frame.profile.gilded', name: 'Profile Frame: Gilded', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<rect x="6" y="6" width="84" height="84" rx="40" fill="none" stroke="url(#ug-gold)" stroke-width="4"/><rect x="12" y="12" width="72" height="72" rx="36" fill="none" stroke="${C.gold}" stroke-opacity="0.3" stroke-width="1.5"/></svg>` },
  { key: 'frame.vip.badge', name: 'VIP Ring', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<rect x="4" y="4" width="88" height="88" rx="44" fill="url(#ug-violet)" opacity="0.16"/><rect x="4" y="4" width="88" height="88" rx="44" fill="none" stroke="url(#ug-main)" stroke-width="5"/><text x="48" y="56" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="${C.white}" text-anchor="middle">VIP</text></svg>` },
  { key: 'frame.ranking.podium', name: 'Ranking Podium Card', target: 'ranking', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="96" viewBox="0 0 240 96" fill="none">${sprite()}<rect width="240" height="96" rx="18" fill="url(#ug-bg)"/><rect width="240" height="96" rx="18" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.22"/><path d="M120 46v20M80 40l-10 14v12M160 46l-10-6v20" fill="url(#ug-main)" opacity="0.85"/></svg>` },
  { key: 'frame.level.bronze', name: 'Level Frame: Bronze', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="40" fill="none" stroke="url(#ug-gold)" stroke-width="3"/><circle cx="48" cy="48" r="34" fill="none" stroke="${C.navy700}" stroke-width="6" stroke-dasharray="8 6"/></svg>` },
];

// ------------------------------------------------------------
// avatars, badges, tasks, rewards, events, notifications, wallet
// ------------------------------------------------------------
const EXTRA = [
  { key: 'avatars.default.neon', name: 'Default Avatar: Neon', category: 'avatars.default', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<circle cx="48" cy="48" r="46" fill="url(#ug-navy)"/><circle cx="48" cy="40" r="16" fill="url(#ug-main)" opacity="0.9"/><path d="M22 84c4-14 13-21 26-21s22 7 26 21" fill="url(#ug-main)" opacity="0.85"/></svg>` },
  { key: 'avatars.default.cobalt', name: 'Default Avatar: Cobalt', category: 'avatars.default', target: 'profile', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">${sprite()}<rect width="96" height="96" rx="48" fill="url(#ug-bg)"/><circle cx="48" cy="38" r="14" fill="#ffffff" fill-opacity="0.9"/><path d="M24 74c3-12 12-18 24-18s21 6 24 18" fill="#ffffff" fill-opacity="0.8"/></svg>` },
  { key: 'badges.verified', name: 'Verified Badge', category: 'badges', target: 'profile', b: () => base({ body: `<path d="M12 3l2.3 2.4 3.3-.4 1.3 3.1 3 1.4-.9 3.2.9 3.2-3 1.4-1.3 3.1-3.3-.4L12 22l-2.3-2.4-3.3.4-1.3-3.1-3-1.4.9-3.2-.9-3.2 3-1.4 1.3-3.1 3.3.4L12 3Z" fill="url(#ug-main)"/><path d="m8.6 12 2.2 2.2 4.6-4.6" stroke="${C.white}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` }) },
  { key: 'badges.level-star', name: 'Level Star Badge', category: 'badges', target: 'profile', b: () => base({ body: `<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8L12 3Z" fill="url(#ug-gold)"/><text x="12" y="16.4" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="900" fill="${C.navy900}" text-anchor="middle">1</text>` }) },
  { key: 'tasks.daily', name: 'Daily Task', category: 'tasks', target: 'home', b: () => base({ body: `<rect x="5" y="6" width="14" height="14" rx="3" stroke="${C.white}" stroke-width="1.5" fill="none"/><path d="M5 11h14M9 4v3M15 4v3" stroke="${C.muted}" stroke-width="1.4" stroke-linecap="round"/><path d="M9.5 15.5l2 2 3.5-4" stroke="url(#ug-main)" stroke-width="1.6" stroke-linecap="round" fill="none"/>` }) },
  { key: 'rewards.claim', name: 'Reward Claim', category: 'rewards', target: 'home', b: () => base({ body: `<circle cx="12" cy="12" r="9" fill="url(#ug-gold)" opacity="0.28"/><circle cx="12" cy="12" r="6.4" stroke="${C.gold}" stroke-width="1.5" fill="none"/><path d="M12 8l.9 2.2 2.3.3-1.7 1.6.5 2.4-2-1.1-2 1.1.5-2.4-1.7-1.6 2.3-.3L12 8Z" fill="url(#ug-gold)"/>` }) },
  { key: 'events.banner-bg', name: 'Event Banner Background', category: 'events', target: 'home', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160" viewBox="0 0 360 160" fill="none">${sprite()}<rect width="360" height="160" rx="20" fill="url(#ug-bg)"/><rect width="360" height="160" rx="20" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.18"/><circle cx="80" cy="80" r="90" fill="url(#ug-orbs)" opacity="0.6"/><circle cx="300" cy="40" r="70" fill="url(#ug-orbs)" opacity="0.5"/><text x="180" y="76" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" fill="${C.white}" text-anchor="middle">Limited-time event</text><text x="180" y="102" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="${C.muted}" text-anchor="middle">Original rewards · fair play</text></svg>` },
  { key: 'notifications.bell', name: 'Notification Bell', category: 'notifications', target: 'messages', b: () => base({ body: `<path d="M18 8.5a6 6 0 1 0-12 0v6.5l-1.6 2.2c-.6.8-.1 1.8.9 1.8h13.4c1 0 1.5-1 .9-1.8L18 15V8.5ZM10 19.6a2 2 0 0 0 4 0" stroke="url(#ug-main)" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="18" cy="5" r="2.6" fill="${C.rose}"/>` }) },
  { key: 'wallet.card-bg', name: 'Wallet Card Background', category: 'wallet', target: 'wallet', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170" viewBox="0 0 300 170" fill="none">${sprite()}<rect width="300" height="170" rx="18" fill="url(#ug-bg)"/><rect width="300" height="170" rx="18" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.2"/><circle cx="46" cy="40" r="60" fill="url(#ug-orbs)" opacity="0.7"/><circle cx="270" cy="150" r="80" fill="url(#ug-orbs)" opacity="0.6"/><path d="M0 120C100 90 200 150 300 110" stroke="url(#ug-main)" stroke-width="1.4" stroke-opacity="0.5" fill="none"/></svg>` },
  { key: 'crypto.wallet-bg', name: 'Crypto Coming Soon BG', category: 'crypto', target: 'crypto', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="170" viewBox="0 0 300 170" fill="none">${sprite()}<rect width="300" height="170" rx="18" fill="url(#ug-bg)"/><rect width="300" height="170" rx="18" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.18"/><circle cx="150" cy="85" r="80" fill="url(#ug-orbs)" opacity="0.55"/><path d="m118 120-8-26 22-13 22 13-8 26h-28Z" fill="none" stroke="url(#ug-main)" stroke-width="2"/><path d="M150 60v26" stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/></svg>` },
];

// ------------------------------------------------------------
// TEEN PATTI — original table/cards/chips/seats/effects
// ------------------------------------------------------------
const TEENPATTI = [
  { key: 'games.teen-patti.table.bg', name: 'Teen Patti Table', category: 'games.teen-patti.table', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520" fill="none">${sprite()}<rect width="720" height="520" fill="url(#ug-bg)"/><circle cx="360" cy="300" r="260" fill="url(#ug-navy)"/><ellipse cx="360" cy="300" rx="236" ry="196" fill="${C.navy800}" stroke="url(#ug-main)" stroke-width="5"/><ellipse cx="360" cy="300" rx="210" ry="172" fill="${C.navy700}"/><ellipse cx="360" cy="300" rx="150" ry="120" fill="${C.navy800}" opacity="0.6"/><text x="360" y="312" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="${C.cyanSoft}" text-anchor="middle">TEEN PATTI</text></svg>` },
  { key: 'games.teen-patti.cards.face', name: 'Teen Patti Card Face', category: 'games.teen-patti.cards', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="144" viewBox="0 0 100 144" fill="none">${sprite()}<rect x="4" y="4" width="92" height="136" rx="10" fill="url(#ug-bg)"/><rect x="4" y="4" width="92" height="136" rx="10" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.25"/><rect x="12" y="12" width="76" height="120" rx="6" fill="${C.navy900}" stroke="#ffffff" stroke-opacity="0.12"/><circle cx="50" cy="62" r="16" fill="url(#ug-main)" opacity="0.95"/><text x="50" y="90" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="800" fill="${C.cyanSoft}" text-anchor="middle">A</text></svg>` },
  { key: 'games.teen-patti.cards.back', name: 'Teen Patti Card Back', category: 'games.teen-patti.cards', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="144" viewBox="0 0 100 144" fill="none">${sprite()}<rect x="4" y="4" width="92" height="136" rx="10" fill="url(#ug-bg)"/><rect x="4" y="4" width="92" height="136" rx="10" fill="url(#ug-glass)" stroke="url(#ug-main)" stroke-width="2"/><path d="M50 16v112M22 44h56M22 84h56" stroke="url(#ug-main)" stroke-width="1.4" stroke-opacity="0.7"/><circle cx="50" cy="72" r="14" fill="none" stroke="url(#ug-main)" stroke-width="2.4"/></svg>` },
  ...['blue', 'gold', 'violet', 'cyan'].map((color, i) => {
    const col = ['#3b82f6', C.gold, C.violet, C.cyan][i];
    return { key: `games.teen-patti.chips.${color}`, name: `Chip: ${color}`, category: 'games.teen-patti.chips', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">${sprite()}<circle cx="36" cy="36" r="30" fill="${col}"/><circle cx="36" cy="36" r="21" fill="${col}" stroke="#ffffff" stroke-opacity="0.7" stroke-width="4"/><circle cx="36" cy="36" r="12" fill="${col}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2.5"/><text x="36" y="41" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" fill="${C.white}" text-anchor="middle">${i + 1}</text></svg>` };
  }),
  { key: 'games.teen-patti.seats.p1', name: 'Seat: P1', category: 'games.teen-patti.seats', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="72" viewBox="0 0 120 72" fill="none">${sprite()}<rect width="120" height="72" rx="16" fill="url(#ug-bg)"/><rect width="120" height="72" rx="16" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.25"/><circle cx="28" cy="36" r="12" fill="url(#ug-main)" opacity="0.9"/><text x="50" y="40" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="${C.white}">You</text></svg>` },
  { key: 'games.teen-patti.seats.p2', name: 'Seat: P2', category: 'games.teen-patti.seats', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="72" viewBox="0 0 120 72" fill="none">${sprite()}<rect width="120" height="72" rx="16" fill="url(#ug-bg)"/><rect width="120" height="72" rx="16" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.25"/><circle cx="28" cy="36" r="12" fill="url(#ug-violet)" opacity="0.9"/><text x="50" y="40" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="${C.white}">Seat 2</text></svg>` },
  { key: 'games.teen-patti.seats.p3', name: 'Seat: P3', category: 'games.teen-patti.seats', target: 'teenpatti', b: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="72" viewBox="0 0 120 72" fill="none">${sprite()}<rect width="120" height="72" rx="16" fill="url(#ug-bg)"/><rect width="120" height="72" rx="16" fill="url(#ug-glass)" stroke="#ffffff" stroke-opacity="0.25"/><circle cx="28" cy="36" r="12" fill="url(#ug-gold)" opacity="0.9"/><text x="50" y="40" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="${C.white}">Seat 3</text></svg>` },
  { key: 'games.teen-patti.effects.winner-glow', name: 'Winner Glow', category: 'games.teen-patti.effects', target: 'teenpatti', b: () => base({ w: 200, h: 200, body: `<circle cx="100" cy="100" r="80" fill="url(#ug-glow)" opacity="0.8"/><path d="m100 40 20 20 25-5-5 25 20 20-20 20 5 25-25-5-20 20-20-20-25 5 5-25-20-20 20-20-5-25 25 5 20-20Z" fill="url(#ug-gold)"/>` }) },
];

// ------------------------------------------------------------
// ASSEMBLE full catalog
// ------------------------------------------------------------
const ALL = [
  ...NAV_ICONS.map((x) => ({ ...x, category: 'icons.navigation' })),
  ...HOME_ICONS.map((x) => ({ ...x, category: 'icons.home' })),
  ...PROFILE_ICONS.map((x) => ({ ...x, category: 'icons.profile' })),
  ...SEAT_ICONS.map((x) => ({ ...x, category: 'icons.audio-seat' })),
  ...INVITE_ICONS.map((x) => ({ ...x, category: 'icons.invite' })),
  ...CRYPTO_ICONS.map((x) => ({ ...x, category: 'crypto' })),
  ...GIFTS.map((x) => ({ ...x, category: x.key.startsWith('gifts.basic') ? 'gifts.basic' : x.key.startsWith('gifts.premium') ? 'gifts.premium' : 'gifts.luxury' })),

  // backgrounds
  ...BG.map(([k, label]) => ({ key: `bg.${k}.default`, name: `${label} Background`, category: `bg.${k}`, target: k === 'live' ? 'live' : k, b: () => bgArt(k, label) })),

  // logos / frames / extras / teenpatti
  ...LOGOS.map((x) => ({ ...x, category: 'logo' })),
  ...FRAMES.map((x) => ({ ...x, category: x.key.startsWith('frame.avatar') ? 'frame.avatar' : x.key.startsWith('frame.profile') ? 'frame.profile' : x.key.startsWith('frame.vip') ? 'frame.vip' : x.key.startsWith('frame.ranking') ? 'frame.ranking' : 'frame.level' })),
  ...EXTRA,
  ...TEENPATTI,
];

const seen = new Set();
const catalog = [];
for (const e of ALL) {
  e.isBundled = e.isBundled ?? true;
  if (seen.has(e.key)) {
    console.warn(`[catalog] duplicate key ignored: ${e.key}`);
    continue;
  }
  seen.add(e.key);
  const svg = e.b();
  catalog.push({ ...e, svg });
}

// ------------------------------------------------------------
// WRITE OUTPUTS
// ------------------------------------------------------------
async function main() {
  await rm(ROOT, { recursive: true, force: true });

  const index = {
    generator: 'platform/scripts/generate-asset-catalog.mjs',
    palette: {
      deepNavy: [C.navy950, C.navy900, C.navy800, C.navy700],
      electricBlue: C.blue,
      violet: C.violet,
      cyan: C.cyan,
      white: C.white,
      muted: C.muted,
    },
    assetCount: catalog.length,
    categories: [...new Set(catalog.map((c) => c.category))].sort(),
    assets: catalog.map(({ key, name, category, target, sortOrder = 0, isBundled }) => ({
      key, name, category, target, sortOrder, isBundled, format: 'svg',
    })).sort((a, b) => (a.category + a.key < b.category + b.key ? -1 : 1)),
  };

  for (const e of catalog) {
    const file = join(ROOT, `${e.key.replace(/\./g, '/')}.svg`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, e.svg, 'utf8');
  }

  await writeFile(join(ROOT, 'catalog.json'), JSON.stringify(index, null, 2), 'utf8');

  const bundledLines = catalog
    .filter((c) => c.isBundled)
    .map((c) => `  '${c.key}': ${JSON.stringify(c.svg)},`)
    .join('\n');
  const bundled = `// AUTO-GENERATED by platform/scripts/generate-asset-catalog.mjs — do not edit.
// Original URADHURA artwork bundled inside the player APK for offline core UI.
export const BUNDLED_SVG: Record<string, string> = {
${bundledLines}
};
`;
  await mkdir(dirname(PLAYER_BUNDLE), { recursive: true });
  await writeFile(PLAYER_BUNDLE, bundled, 'utf8');

  console.log(`[catalog] wrote ${catalog.length} assets (${catalog.filter((c) => c.isBundled).length} bundled)`);
  console.log(`[catalog] index -> ${join(ROOT, 'catalog.json')}`);
  console.log(`[catalog] bundle -> ${PLAYER_BUNDLE}`);
}

main().catch((err) => {
  console.error('[catalog] generation failed:', err);
  process.exit(1);
});