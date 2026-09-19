// Add to package.json:
// "prisma": {
//   "seed": "ts-node prisma/seed.ts"
// }

import { PrismaClient } from '../node_modules/.prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ============================================================
// PERMISSIONS DEFINITION (resource:action pairs)
// ============================================================

const permissionsData = [
  { resource: 'games', action: 'view', description: 'View games and game data' },
  { resource: 'games', action: 'create', description: 'Create new games' },
  { resource: 'games', action: 'edit', description: 'Edit game details and settings' },
  { resource: 'games', action: 'delete', description: 'Delete games' },
  { resource: 'games', action: 'configure', description: 'Configure game parameters and bet settings' },
  { resource: 'players', action: 'view', description: 'View player accounts and profiles' },
  { resource: 'players', action: 'create', description: 'Create player accounts' },
  { resource: 'players', action: 'edit', description: 'Edit player details' },
  { resource: 'wallet', action: 'view', description: 'View wallet balances and transactions' },
  { resource: 'wallet', action: 'edit', description: 'Adjust wallet balances and process transactions' },
  { resource: 'live', action: 'view', description: 'View live rooms and streams' },
  { resource: 'live', action: 'moderate', description: 'Moderate live rooms and take action on streams' },
  { resource: 'chat', action: 'view', description: 'View chat messages' },
  { resource: 'chat', action: 'moderate', description: 'Moderate chat messages and ban users from chat' },
  { resource: 'moderation', action: 'view', description: 'View moderation actions and reports' },
  { resource: 'moderation', action: 'moderate', description: 'Perform moderation actions (warn, mute, ban)' },
  { resource: 'settings', action: 'view', description: 'View system settings and feature flags' },
  { resource: 'settings', action: 'edit', description: 'Edit system settings and feature flags' },
  { resource: 'economy', action: 'view', description: 'View economy data, packages, and pricing' },
  { resource: 'economy', action: 'edit', description: 'Edit economy packages, pricing, and configurations' },
  { resource: 'reports', action: 'view', description: 'View reports and analytics' },
  { resource: 'reports', action: 'create', description: 'Create and schedule reports' },
  { resource: 'reports', action: 'edit', description: 'Edit report configurations' },
  { resource: 'reports', action: 'export', description: 'Export reports to files' },
];

// ============================================================
// ROLES DEFINITION
// ============================================================

const rolesData = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full platform access with all permissions. Cannot be deleted.',
    isSystem: true,
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Platform administrator with broad access. Cannot manage system settings.',
    isSystem: true,
  },
  {
    name: 'game_operator',
    displayName: 'Game Operator',
    description: 'Manages games, game configurations, and monitors live rooms.',
    isSystem: true,
  },
  {
    name: 'finance',
    displayName: 'Finance Manager',
    description: 'Manages wallets, transactions, economy packages, and financial reports.',
    isSystem: true,
  },
  {
    name: 'moderator',
    displayName: 'Moderator',
    description: 'Moderates player behavior, chat messages, and live room activity.',
    isSystem: true,
  },
  {
    name: 'support',
    displayName: 'Support Agent',
    description: 'Handles player support, views player data, and manages reports.',
    isSystem: true,
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to platform data and analytics.',
    isSystem: true,
  },
];

// ============================================================
// ROLE → PERMISSION MAPPINGS
// ============================================================

type RolePermMap = Record<string, string[]>;

const rolePermissionMap: RolePermMap = {
  super_admin: permissionsData.map((p) => `${p.resource}:${p.action}`),

  admin: permissionsData
    .filter((p) => p.resource !== 'settings')
    .map((p) => `${p.resource}:${p.action}`),

  game_operator: [
    'games:view',
    'games:create',
    'games:edit',
    'games:delete',
    'games:configure',
    'live:view',
    'live:moderate',
  ],

  finance: [
    'wallet:view',
    'wallet:edit',
    'economy:view',
    'economy:edit',
  ],

  moderator: [
    'moderation:view',
    'moderation:moderate',
    'chat:view',
    'chat:moderate',
    'live:view',
    'live:moderate',
  ],

  support: [
    'players:view',
    'players:create',
    'players:edit',
    'reports:view',
    'reports:create',
    'reports:edit',
    'reports:export',
  ],

  viewer: [
    'games:view',
    'players:view',
    'wallet:view',
    'live:view',
    'chat:view',
    'moderation:view',
    'settings:view',
    'economy:view',
    'reports:view',
  ],
};

// ============================================================
// GAMES DATA
// ============================================================

const gamesData = [
  {
    internalCode: 'greedy_monkey',
    name: 'Greedy Monkey',
    displayName: 'Greedy Monkey',
    description:
      'A thrilling wheel-spinning game where players bet on where the greedy monkey will land. Watch the monkey chase bananas across the wheel for exciting multipliers.',
    shortDescription: 'Spin the wheel and let the greedy monkey land you big wins!',
    category: 'wheel',
    gameType: 'spinning',
    sortOrder: 1,
    isFeatured: true,
    isHot: true,
  },
  {
    internalCode: 'greedy_lion',
    name: 'Greedy Lion',
    displayName: 'Greedy Lion',
    description:
      'A high-stakes wheel game featuring a mighty lion. Place your bets and spin the wheel to see if the lion brings you fortune with massive multiplier payouts.',
    shortDescription: 'Face the lion and spin for epic rewards!',
    category: 'wheel',
    gameType: 'spinning',
    sortOrder: 2,
    isFeatured: true,
    isHot: false,
  },
  {
    internalCode: 'teen_patti',
    name: 'Teen Patti',
    displayName: 'Teen Patti',
    description:
      'The classic Indian card game reimagined for the digital age. Play against the house in this exciting three-card poker variant with side bets and bonus payouts.',
    shortDescription: 'Classic Indian card game with a digital twist!',
    category: 'card',
    gameType: 'betting',
    sortOrder: 3,
    isFeatured: true,
    isHot: true,
  },
  {
    internalCode: 'food_wheel',
    name: 'Food Wheel',
    displayName: 'Food Wheel',
    description:
      'A colorful and fun wheel game themed around delicious food items. Spin the wheel and bet on your favorite food to win tasty multipliers and bonuses.',
    shortDescription: 'Spin the food wheel for delicious wins!',
    category: 'wheel',
    gameType: 'spinning',
    sortOrder: 4,
    isFeatured: false,
    isHot: false,
  },
  {
    internalCode: 'three_card',
    name: 'Three Card',
    displayName: 'Three Card Poker',
    description:
      'A fast-paced three-card poker game with simple rules and exciting payouts. Bet on your hand or the dealer\'s hand for a chance to win big.',
    shortDescription: 'Quick three-card poker action with big payouts!',
    category: 'card',
    gameType: 'betting',
    sortOrder: 5,
    isFeatured: false,
    isHot: true,
  },
  {
    internalCode: 'slot',
    name: 'Slot',
    displayName: 'Lucky Slots',
    description:
      'A classic slot machine experience with modern graphics and exciting bonus features. Spin the reels and match symbols for jackpot prizes.',
    shortDescription: 'Spin the reels for jackpot excitement!',
    category: 'slot',
    gameType: 'spinning',
    sortOrder: 6,
    isFeatured: true,
    isHot: true,
  },
];

// ============================================================
// GAME THEME + BRANDING (admin-configurable, no hard-coded UI)
// ============================================================

const gameThemeData: Record<string, Record<string, unknown>> = {
  greedy_monkey: {
    centralCharacter: '🐵',
    characterName: 'Greedy Monkey',
    characterAnimation: 'bounce',
    icon: '🐵',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#052e16 0%,#14532d 100%)',
      primary: '#22c55e',
      accent: '#facc15',
      cardBg: '#0b3d20',
      text: '#f0fdf4',
      wheelColors: ['#fde68a', '#ef4444', '#8b5cf6', '#22c55e', '#f97316', '#eab308', '#facc15', '#fbbf24'],
    }),
    colorConfig: JSON.stringify({ button: '#facc15', chip: '#22c55e', hot: '#f97316' }),
    sounds: JSON.stringify({ spin: '/audio/monkey-spin.mp3', win: '/audio/win.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/jungle-loop.mp3', volume: 0.4 }),
    rules: JSON.stringify({
      title: 'How to Play Greedy Monkey',
      steps: [
        'Pick a food item on the wheel and choose your chip amount.',
        'The monkey spins the wheel when the countdown ends.',
        'If the wheel lands on your food, you win bet × multiplier.',
        'Rarer foods pay bigger multipliers. Results are provably fair.',
      ],
    }),
    helpContent: 'The wheel outcome is generated server-side with HMAC-SHA256 from a committed seed. No client can influence the result.',
  },
  greedy_lion: {
    centralCharacter: '🦁',
    characterName: 'Greedy Lion',
    characterAnimation: 'roar',
    icon: '🦁',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#431407 0%,#7c2d12 100%)',
      primary: '#f59e0b',
      accent: '#ef4444',
      cardBg: '#5c1a06',
      text: '#fff7ed',
      wheelColors: ['#fed7aa', '#f97316', '#facc15', '#ef4444', '#dc2626', '#f59e0b'],
    }),
    colorConfig: JSON.stringify({ button: '#ef4444', chip: '#f59e0b', hot: '#facc15' }),
    sounds: JSON.stringify({ spin: '/audio/lion-spin.mp3', win: '/audio/roar-win.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/savanna-loop.mp3', volume: 0.4 }),
    rules: JSON.stringify({
      title: 'How to Play Greedy Lion',
      steps: [
        'Select a meat on the wheel and place your bet.',
        'The lion hunts when the countdown ends.',
        'Landing on your choice pays the displayed multiplier.',
        'HOT items are highlighted by the operator.',
      ],
    }),
    helpContent: 'Provably fair HMAC-SHA256 wheel driven by the server. Every round reveals its seed after settlement.',
  },
  teen_patti: {
    centralCharacter: '🃏',
    characterName: 'Teen Patti Dealer',
    characterAnimation: 'deal',
    icon: '🃏',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#450a0a 0%,#7f1d1d 100%)',
      primary: '#dc2626',
      accent: '#fbbf24',
      cardBg: '#5b1111',
      text: '#fef2f2',
      seats: ['#ef4444', '#3b82f6', '#22c55e'],
    }),
    colorConfig: JSON.stringify({ button: '#dc2626', chip: '#fbbf24', hot: '#f97316' }),
    sounds: JSON.stringify({ deal: '/audio/deal.mp3', win: '/audio/win.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/teenpatti-loop.mp3', volume: 0.35 }),
    rules: JSON.stringify({
      title: 'How to Play Teen Patti',
      steps: [
        'Three seats (A, B, C) are each dealt a 3-card hand.',
        'Bet on the seat you think has the strongest hand.',
        'Hands rank: Trail > Pure Sequence > Sequence > Color > Pair > High Card.',
        'Winning seats pay the seat multiplier.',
      ],
    }),
    helpContent: 'Cards are dealt deterministically from the round seed. Verify any settled round with its revealed server seed.',
  },
  food_wheel: {
    centralCharacter: '🎡',
    characterName: 'Food Wheel',
    characterAnimation: 'spin',
    icon: '🍔',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#500724 0%,#831843 100%)',
      primary: '#ec4899',
      accent: '#f97316',
      cardBg: '#701a3a',
      text: '#fdf2f8',
      wheelColors: ['#f97316', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#84cc16'],
    }),
    colorConfig: JSON.stringify({ button: '#ec4899', chip: '#f97316', hot: '#facc15' }),
    sounds: JSON.stringify({ spin: '/audio/food-spin.mp3', win: '/audio/win.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/food-loop.mp3', volume: 0.4 }),
    rules: JSON.stringify({
      title: 'How to Play Food Wheel',
      steps: [
        'Choose a food on the wheel and a chip size.',
        'The wheel spins when the countdown reaches zero.',
        'Landing on your food pays its multiplier.',
        'Only one food wins each round.',
      ],
    }),
    helpContent: 'Server-authoritative spin. The result is fixed by the committed seed before betting closes.',
  },
  three_card: {
    centralCharacter: '🂱',
    characterName: 'Three Card Dealer',
    characterAnimation: 'flip',
    icon: '🃏',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#0c1a3a 0%,#1e3a8a 100%)',
      primary: '#3b82f6',
      accent: '#06b6d4',
      cardBg: '#12224a',
      text: '#eff6ff',
      seats: ['#ef4444', '#3b82f6', '#22c55e'],
    }),
    colorConfig: JSON.stringify({ button: '#3b82f6', chip: '#06b6d4', hot: '#facc15' }),
    sounds: JSON.stringify({ deal: '/audio/deal.mp3', win: '/audio/win.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/card-loop.mp3', volume: 0.35 }),
    rules: JSON.stringify({
      title: 'How to Play Three Card',
      steps: [
        'Three colored seats are each dealt one card.',
        'Bet on the seat you think gets the highest card.',
        'Aces are high; ties are broken by suit order.',
        'The winning seat pays its multiplier.',
      ],
    }),
    helpContent: 'Cards come from a deterministic seeded deck. Settled rounds disclose the server seed for verification.',
  },
  slot: {
    centralCharacter: '🎰',
    characterName: 'Lucky Slots',
    characterAnimation: 'reel',
    icon: '🎰',
    theme: JSON.stringify({
      bg: 'linear-gradient(180deg,#2e1065 0%,#6d28d9 100%)',
      primary: '#a855f7',
      accent: '#fbbf24',
      cardBg: '#3b0764',
      text: '#faf5ff',
      reelColors: ['#fbbf24', '#f59e0b', '#a855f7'],
    }),
    colorConfig: JSON.stringify({ button: '#a855f7', chip: '#fbbf24', hot: '#f97316' }),
    sounds: JSON.stringify({ spin: '/audio/slot-spin.mp3', win: '/audio/jackpot.mp3', tick: '/audio/tick.mp3' }),
    music: JSON.stringify({ loop: '/audio/casino-loop.mp3', volume: 0.4 }),
    rules: JSON.stringify({
      title: 'How to Play Lucky Slots',
      steps: [
        'Choose your bet and press START to spin the reels.',
        'The payline symbol determines your multiplier.',
        'Use Quick, Auto and Extra Bet for faster play.',
        'The server resolves the spin with a committed fair seed.',
      ],
    }),
    helpContent: 'Spin outcomes use a weighted payline table from admin config, resolved server-side. No client RNG.',
  },
};

// ============================================================
// GAME OPTIONS (wheel faces / card seats / slot spin surface)
// Each entry: [name, label, emoji, multiplier, weight, colorHex, isHot]
// ============================================================

const gameOptionsData: Record<string, Array<[string, string, string, number, number, string, boolean]>> = {
  greedy_monkey: [
    ['Banana', 'Banana', '🍌', 0.6, 35, '#fde68a', false],
    ['Apple', 'Apple', '🍎', 0.7, 24, '#ef4444', false],
    ['Grapes', 'Grapes', '🍇', 0.9, 16, '#8b5cf6', false],
    ['Watermelon', 'Watermelon', '🍉', 1.1, 11, '#22c55e', false],
    ['Mango', 'Mango', '🥭', 1.5, 8, '#f97316', false],
    ['Pineapple', 'Pineapple', '🍍', 2.5, 4, '#eab308', false],
    ['Star Fruit', 'Star Fruit', '⭐', 6.0, 1.5, '#facc15', true],
    ['Golden Banana', 'Golden Banana', '🏆', 12.0, 0.5, '#fbbf24', true],
  ],
  greedy_lion: [
    ['Meat', 'Meat', '🍖', 0.6, 35, '#fca5a5', false],
    ['Drumstick', 'Drumstick', '🍗', 0.7, 24, '#f59e0b', false],
    ['Fish', 'Fish', '🐟', 0.9, 16, '#38bdf8', false],
    ['Steak', 'Steak', '🥩', 1.1, 11, '#dc2626', false],
    ['Bacon', 'Bacon', '🥓', 1.5, 8, '#ef4444', false],
    ['Shrimp', 'Shrimp', '🍤', 2.5, 4, '#fb923c', false],
    ['Bone', 'Bone', '🦴', 6.0, 1.5, '#e5e7eb', true],
    ['Golden Lion', 'Golden Lion', '🦁', 12.0, 0.5, '#fbbf24', true],
  ],
  food_wheel: [
    ['Pizza', 'Pizza', '🍕', 0.6, 20, '#f97316', false],
    ['Burger', 'Burger', '🍔', 0.7, 18, '#22c55e', false],
    ['Hotdog', 'Hotdog', '🌭', 0.8, 14, '#ef4444', false],
    ['Fries', 'Fries', '🍟', 0.9, 12, '#eab308', false],
    ['Popcorn', 'Popcorn', '🍿', 1.0, 10, '#a855f7', false],
    ['Donut', 'Donut', '🍩', 1.2, 8, '#f472b6', false],
    ['Ice Cream', 'Ice Cream', '🍦', 1.5, 7, '#38bdf8', false],
    ['Sushi', 'Sushi', '🍣', 1.8, 5, '#14b8a6', false],
    ['Taco', 'Taco', '🌮', 2.5, 4, '#f59e0b', true],
    ['Chicken', 'Chicken', '🍗', 4.0, 2, '#84cc16', true],
  ],
  teen_patti: [
    ['Player A', 'Player A', '🅰️', 2.9, 1, '#ef4444', true],
    ['Player B', 'Player B', '🅱️', 2.9, 1, '#3b82f6', false],
    ['Player C', 'Player C', '🅾️', 2.9, 1, '#22c55e', false],
  ],
  three_card: [
    ['Red', 'Red', '🃏', 2.9, 1, '#ef4444', false],
    ['Blue', 'Blue', '🃏', 2.9, 1, '#3b82f6', false],
    ['Green', 'Green', '🃏', 2.9, 1, '#22c55e', false],
  ],
  slot: [
    ['SPIN', 'SPIN', '🎰', 1.0, 1, '#a855f7', true],
  ],
};

// Slot payline table stored on the active configuration's configData.
const slotConfigData = JSON.stringify({
  paylines: [
    { symbol: '🍒', weight: 40, multiplier: 0.2, emoji: '🍒' },
    { symbol: '🍋', weight: 25, multiplier: 0.4, emoji: '🍋' },
    { symbol: '🍇', weight: 15, multiplier: 0.8, emoji: '🍇' },
    { symbol: '💎', weight: 9, multiplier: 1.5, emoji: '💎' },
    { symbol: '⭐', weight: 6, multiplier: 2.5, emoji: '⭐' },
    { symbol: '7️⃣', weight: 4, multiplier: 6, emoji: '7️⃣' },
    { symbol: '👑', weight: 1, multiplier: 15, emoji: '👑' },
  ],
  reels: 3,
  rows: 3,
  allowExtraBet: true,
  allowQuick: true,
  allowAuto: true,
});

// ============================================================
// GAME CONFIGURATION DEFAULTS
// ============================================================

function getGameConfigurationDefaults(internalCode: string) {
  const configs: Record<string, object> = {
    greedy_monkey: {
      houseEdge: 4.0,
      maxPayoutPerRound: 50000,
      bettingDurationSeconds: 20,
      roundDurationSeconds: 10,
      maxPlayers: 500,
    },
    greedy_lion: {
      houseEdge: 5.0,
      maxPayoutPerRound: 100000,
      bettingDurationSeconds: 25,
      roundDurationSeconds: 15,
      maxPlayers: 500,
    },
    teen_patti: {
      houseEdge: 3.5,
      maxPayoutPerRound: 200000,
      bettingDurationSeconds: 30,
      roundDurationSeconds: 20,
      maxPlayers: 100,
    },
    food_wheel: {
      houseEdge: 4.5,
      maxPayoutPerRound: 30000,
      bettingDurationSeconds: 20,
      roundDurationSeconds: 10,
      maxPlayers: 500,
    },
    three_card: {
      houseEdge: 3.0,
      maxPayoutPerRound: 150000,
      bettingDurationSeconds: 30,
      roundDurationSeconds: 20,
      maxPlayers: 100,
    },
    slot: {
      houseEdge: 6.0,
      maxPayoutPerRound: 500000,
      bettingDurationSeconds: 5,
      roundDurationSeconds: 3,
      maxPlayers: 1000,
    },
  };
  return configs[internalCode] || {};
}

// ============================================================
// GAME BET CONFIG DEFAULTS
// ============================================================

function getGameBetConfigDefaults(internalCode: string) {
  const configs: Record<string, object> = {
    greedy_monkey: {
      denominations: [100, 500, 1000, 5000, 10000, 50000],
      minBet: 100,
      maxBet: 500000,
      allowCustomBet: false,
      allowAutoBet: true,
      maxAutoBetRounds: 100,
    },
    greedy_lion: {
      denominations: [100, 500, 1000, 5000, 10000, 50000, 100000],
      minBet: 100,
      maxBet: 1000000,
      allowCustomBet: false,
      allowAutoBet: true,
      maxAutoBetRounds: 100,
    },
    teen_patti: {
      denominations: [500, 1000, 5000, 10000, 50000],
      minBet: 500,
      maxBet: 500000,
      allowCustomBet: true,
      allowAutoBet: false,
      maxAutoBetRounds: 0,
    },
    food_wheel: {
      denominations: [100, 500, 1000, 5000, 10000],
      minBet: 100,
      maxBet: 200000,
      allowCustomBet: false,
      allowAutoBet: true,
      maxAutoBetRounds: 50,
    },
    three_card: {
      denominations: [500, 1000, 5000, 10000, 50000],
      minBet: 500,
      maxBet: 500000,
      allowCustomBet: true,
      allowAutoBet: false,
      maxAutoBetRounds: 0,
    },
    slot: {
      denominations: [100, 500, 1000, 5000, 10000],
      minBet: 100,
      maxBet: 100000,
      allowCustomBet: false,
      allowAutoBet: true,
      allowAutoPlay: true,
      maxAutoBetRounds: 200,
    },
  };
  return configs[internalCode] || {};
}

// ============================================================
// COIN PACKAGES
// ============================================================

const coinPackagesData = [
  {
    name: 'Starter',
    description: 'Perfect for newcomers. Get started with a handful of coins!',
    priceUsd: 0.99,
    baseCoins: 1000,
    bonusCoins: 0,
    isSpecialOffer: false,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Standard',
    description: 'Great value pack for regular players.',
    priceUsd: 4.99,
    baseCoins: 5000,
    bonusCoins: 0,
    isSpecialOffer: false,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Premium',
    description: 'Premium coin pack with bonus coins included!',
    priceUsd: 9.99,
    baseCoins: 12000,
    bonusCoins: 500,
    isSpecialOffer: false,
    isPopular: false,
    sortOrder: 3,
  },
  {
    name: 'Mega',
    description: 'Mega pack with massive bonus coins for serious players.',
    priceUsd: 19.99,
    baseCoins: 30000,
    bonusCoins: 2000,
    isSpecialOffer: true,
    isPopular: true,
    sortOrder: 4,
  },
  {
    name: 'Ultimate',
    description: 'The ultimate coin pack with the best value and maximum bonus!',
    priceUsd: 49.99,
    baseCoins: 100000,
    bonusCoins: 10000,
    isSpecialOffer: true,
    isPopular: false,
    sortOrder: 5,
  },
];

// ============================================================
// DIAMOND PACKAGES
// ============================================================

const diamondPackagesData = [
  {
    name: 'Small',
    description: 'A small batch of diamonds for gifting and premium features.',
    priceUsd: 0.99,
    baseDiamonds: 100,
    bonusDiamonds: 0,
    isSpecialOffer: false,
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Medium',
    description: 'Great value diamond pack with bonus diamonds!',
    priceUsd: 4.99,
    baseDiamonds: 500,
    bonusDiamonds: 50,
    isSpecialOffer: false,
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Large',
    description: 'The best diamond value with maximum bonus diamonds.',
    priceUsd: 9.99,
    baseDiamonds: 1200,
    bonusDiamonds: 200,
    isSpecialOffer: true,
    isPopular: false,
    sortOrder: 3,
  },
];

// ============================================================
// SYSTEM SETTINGS
// ============================================================

const systemSettingsData = [
  {
    key: 'platform_name',
    value: 'Uradhura',
    category: 'general',
    description: 'The display name of the platform',
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    category: 'general',
    description: 'Whether the platform is in maintenance mode',
  },
  {
    key: 'min_bet',
    value: '100',
    category: 'economy',
    description: 'Minimum bet amount across all games',
  },
  {
    key: 'max_bet',
    value: '1000000',
    category: 'economy',
    description: 'Maximum bet amount across all games',
  },
];

// ============================================================
// FEATURE FLAGS
// ============================================================

const featureFlagsData = [
  {
    key: 'live_streaming',
    label: 'Live Streaming',
    description: 'Enable live streaming functionality for players',
    enabled: true,
    allowedRoles: 'super_admin',
  },
  {
    key: 'chat',
    label: 'Chat',
    description: 'Enable real-time chat in live rooms and games',
    enabled: true,
    allowedRoles: 'super_admin',
  },
  {
    key: 'agency',
    label: 'Agency System',
    description: 'Enable the agency system for player organizations',
    enabled: true,
    allowedRoles: 'super_admin',
  },
  {
    key: 'family',
    label: 'Family System',
    description: 'Enable the family/group system for social connections',
    enabled: true,
    allowedRoles: 'super_admin',
  },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main() {
  console.log('Seeding database...\n');

  // ----------------------------------------------------------
  // 1. SEED PERMISSIONS
  // ----------------------------------------------------------
  console.log('Seeding permissions...');
  const permissionRecords: Record<string, { id: string }> = {};

  for (const perm of permissionsData) {
    const record = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {
        description: perm.description,
      },
      create: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
    });
    permissionRecords[`${perm.resource}:${perm.action}`] = { id: record.id };
    console.log(`  Permission: ${perm.resource}:${perm.action}`);
  }
  console.log(`  Total permissions seeded: ${permissionsData.length}\n`);

  // ----------------------------------------------------------
  // 2. SEED ROLES
  // ----------------------------------------------------------
  console.log('Seeding roles...');
  const roleRecords: Record<string, { id: string }> = {};

  for (const role of rolesData) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        displayName: role.displayName,
        description: role.description,
      },
      create: {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
      },
    });
    roleRecords[role.name] = { id: record.id };
    console.log(`  Role: ${role.name} (${role.displayName})`);
  }
  console.log(`  Total roles seeded: ${rolesData.length}\n`);

  // ----------------------------------------------------------
  // 3. SEED ROLE-PERMISSION MAPPINGS
  // ----------------------------------------------------------
  console.log('Seeding role-permission mappings...');

  for (const [roleName, permKeys] of Object.entries(rolePermissionMap)) {
    const roleId = roleRecords[roleName]?.id;
    if (!roleId) continue;

    let count = 0;
    for (const permKey of permKeys) {
      const permRecord = permissionRecords[permKey];
      if (!permRecord) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permRecord.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permRecord.id,
        },
      });
      count++;
    }
    console.log(`  ${roleName}: ${count} permissions assigned`);
  }
  console.log('');

  // ----------------------------------------------------------
  // 4. SEED DEFAULT SUPER_ADMIN USER
  // ----------------------------------------------------------
  console.log('Seeding default super_admin user...');
  const hashedPassword = await hash('Pjokjict4@#\$%', SALT_ROUNDS);

  const superAdminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@gaming.com' },
    update: {
      username: 'superadmin',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      username: 'superadmin',
      email: 'admin@gaming.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  });
  console.log(`  User: superadmin (admin@gaming.com) [ID: ${superAdminUser.id}]`);

  // Assign super_admin role to the default admin user
  await prisma.adminUserRole.upsert({
    where: {
      adminId_roleId: {
        adminId: superAdminUser.id,
        roleId: roleRecords['super_admin'].id,
      },
    },
    update: {},
    create: {
      adminId: superAdminUser.id,
      roleId: roleRecords['super_admin'].id,
      grantedBy: superAdminUser.id,
    },
  });
  console.log('  Assigned super_admin role\n');

  // ----------------------------------------------------------
  // 5. SEED GAMES
  // ----------------------------------------------------------
  console.log('Seeding games...');
  const gameRecords: Record<string, { id: string }> = {};

  for (const game of gamesData) {
    const theme = gameThemeData[game.internalCode] ?? {};
    const record = await prisma.game.upsert({
      where: { internalCode: game.internalCode },
      update: {
        name: game.name,
        displayName: game.displayName,
        description: game.description,
        shortDescription: game.shortDescription,
        category: game.category,
        gameType: game.gameType,
        sortOrder: game.sortOrder,
        isFeatured: game.isFeatured,
        isHot: game.isHot,
        ...theme,
      },
      create: {
        internalCode: game.internalCode,
        name: game.name,
        displayName: game.displayName,
        description: game.description,
        shortDescription: game.shortDescription,
        category: game.category,
        gameType: game.gameType,
        status: 'inactive',
        sortOrder: game.sortOrder,
        isFeatured: game.isFeatured,
        isHot: game.isHot,
        ...theme,
      },
    });
    gameRecords[game.internalCode] = { id: record.id };
    console.log(`  Game: ${game.displayName} (${game.internalCode})`);
  }
  console.log(`  Total games seeded: ${gamesData.length}\n`);

  // ----------------------------------------------------------
  // 6. SEED GAME CONFIGURATIONS
  // ----------------------------------------------------------
  console.log('Seeding game configurations...');

  for (const game of gamesData) {
    const gameId = gameRecords[game.internalCode]?.id;
    if (!gameId) continue;

    const configDefaults = getGameConfigurationDefaults(game.internalCode) as Record<string, any>;
    const configData = game.internalCode === 'slot' ? slotConfigData : null;

    await prisma.gameConfiguration.upsert({
      where: {
        gameId_version: {
          gameId,
          version: 1,
        },
      },
      update: {
        houseEdge: configDefaults.houseEdge ?? 5.0,
        maxPayoutPerRound: configDefaults.maxPayoutPerRound ?? 10000,
        bettingDurationSeconds: configDefaults.bettingDurationSeconds ?? 30,
        roundDurationSeconds: configDefaults.roundDurationSeconds ?? 30,
        maxPlayers: configDefaults.maxPlayers ?? 1000,
        configData,
        isActive: true,
      },
      create: {
        gameId,
        version: 1,
        houseEdge: configDefaults.houseEdge ?? 5.0,
        maxPayoutPerRound: configDefaults.maxPayoutPerRound ?? 10000,
        jackpotWeight: 1.0,
        vipAdjustment: 0.0,
        maxDailyLossPerPlayer: 100000,
        bettingDurationSeconds: configDefaults.bettingDurationSeconds ?? 30,
        roundDurationSeconds: configDefaults.roundDurationSeconds ?? 30,
        resultProcessingDelayMs: 5000,
        newRoundDelayMs: 3000,
        minPlayers: 0,
        maxPlayers: configDefaults.maxPlayers ?? 1000,
        configData,
        isActive: true,
        createdBy: superAdminUser.id,
      },
    });
    console.log(`  Configuration for: ${game.internalCode}`);
  }
  console.log('');

  // ----------------------------------------------------------
  // 7. SEED GAME BET CONFIGS
  // ----------------------------------------------------------
  console.log('Seeding game bet configurations...');

  for (const game of gamesData) {
    const gameId = gameRecords[game.internalCode]?.id;
    if (!gameId) continue;

    const betDefaults = getGameBetConfigDefaults(game.internalCode) as Record<string, any>;
    const denomArray = betDefaults.denominations ?? [100, 500, 1000, 5000, 10000];
    const denomStr = JSON.stringify(denomArray);

    await prisma.gameBetConfig.upsert({
      where: { gameId },
      update: {
        denominations: denomStr,
        minBet: betDefaults.minBet ?? 100,
        maxBet: betDefaults.maxBet ?? 1000000,
        allowCustomBet: betDefaults.allowCustomBet ?? false,
        allowAutoBet: betDefaults.allowAutoBet ?? true,
        allowAutoPlay: betDefaults.allowAutoPlay ?? false,
        maxAutoBetRounds: betDefaults.maxAutoBetRounds ?? 100,
      },
      create: {
        gameId,
        denominations: denomStr,
        minBet: betDefaults.minBet ?? 100,
        maxBet: betDefaults.maxBet ?? 1000000,
        allowCustomBet: betDefaults.allowCustomBet ?? false,
        allowMultipleSelections: false,
        allowRepeatBet: true,
        allowAutoBet: betDefaults.allowAutoBet ?? true,
        allowAutoPlay: betDefaults.allowAutoPlay ?? false,
        maxAutoBetRounds: betDefaults.maxAutoBetRounds ?? 100,
      },
    });
    console.log(`  Bet config for: ${game.internalCode}`);
  }
  console.log('');

  // ----------------------------------------------------------
  // 7.5 SEED GAME OPTIONS (wheel faces / card seats / spin surface)
  // ----------------------------------------------------------
  console.log('Seeding game options...');

  for (const game of gamesData) {
    const gameId = gameRecords[game.internalCode]?.id;
    if (!gameId) continue;

    const options = gameOptionsData[game.internalCode] ?? [];
    await prisma.gameOption.deleteMany({ where: { gameId } });

    for (let i = 0; i < options.length; i++) {
      const [name, label, emoji, multiplier, weight, colorHex, isHot] = options[i];
      await prisma.gameOption.create({
        data: {
          gameId,
          name,
          label,
          icon: emoji,
          multiplier,
          weight,
          colorHex,
          isHot,
          isActive: true,
          sortOrder: i + 1,
          metadata: JSON.stringify({ emoji }),
        },
      });
    }
    console.log(`  ${game.internalCode}: ${options.length} options`);
  }
  console.log('');

  // ----------------------------------------------------------
  // 8. SEED COIN PACKAGES
  // ----------------------------------------------------------
  console.log('Seeding coin packages...');

  for (const pkg of coinPackagesData) {
    const record = await prisma.coinPackage.create({
      data: {
        name: pkg.name,
        description: pkg.description,
        priceUsd: pkg.priceUsd,
        currency: 'USD',
        baseCoins: pkg.baseCoins,
        bonusCoins: pkg.bonusCoins,
        isSpecialOffer: pkg.isSpecialOffer,
        isPopular: pkg.isPopular,
        expiryDays: 30,
        sortOrder: pkg.sortOrder,
        isActive: true,
        isVisibleInStore: true,
      },
    });
    console.log(`  Coin package: ${record.name} - ${record.baseCoins} coins ($${record.priceUsd})`);
  }
  console.log(`  Total coin packages seeded: ${coinPackagesData.length}\n`);

  // ----------------------------------------------------------
  // 9. SEED DIAMOND PACKAGES
  // ----------------------------------------------------------
  console.log('Seeding diamond packages...');

  for (const pkg of diamondPackagesData) {
    const record = await prisma.diamondPackage.create({
      data: {
        name: pkg.name,
        description: pkg.description,
        priceUsd: pkg.priceUsd,
        baseDiamonds: pkg.baseDiamonds,
        bonusDiamonds: pkg.bonusDiamonds,
        isSpecialOffer: pkg.isSpecialOffer,
        isPopular: pkg.isPopular,
        sortOrder: pkg.sortOrder,
        isActive: true,
      },
    });
    console.log(`  Diamond package: ${record.name} - ${record.baseDiamonds} diamonds ($${record.priceUsd})`);
  }
  console.log(`  Total diamond packages seeded: ${diamondPackagesData.length}\n`);

  // ----------------------------------------------------------
  // 10. SEED SYSTEM SETTINGS
  // ----------------------------------------------------------
  console.log('Seeding system settings...');

  for (const setting of systemSettingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        category: setting.category,
        description: setting.description,
      },
      create: {
        key: setting.key,
        value: setting.value,
        category: setting.category,
        description: setting.description,
        updatedBy: superAdminUser.id,
      },
    });
    console.log(`  Setting: ${setting.key} = ${JSON.stringify(setting.value)}`);
  }
  console.log('');

  // ----------------------------------------------------------
  // 11. SEED FEATURE FLAGS
  // ----------------------------------------------------------
  console.log('Seeding feature flags...');

  for (const flag of featureFlagsData) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        label: flag.label,
        description: flag.description,
        enabled: flag.enabled,
        allowedRoles: flag.allowedRoles,
      },
      create: {
        key: flag.key,
        label: flag.label,
        description: flag.description,
        enabled: flag.enabled,
        allowedRoles: flag.allowedRoles,
        updatedBy: superAdminUser.id,
      },
    });
    console.log(`  Feature flag: ${flag.key} = ${flag.enabled ? 'enabled' : 'disabled'}`);
  }
  console.log('');

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------
  console.log('========================================');
  console.log('Database seeding completed successfully!');
  console.log('========================================');
  console.log(`  Roles:         ${rolesData.length}`);
  console.log(`  Permissions:   ${permissionsData.length}`);
  console.log(`  Games:         ${gamesData.length}`);
  console.log(`  Coin Packages: ${coinPackagesData.length}`);
  console.log(`  Diamond Pkgs:  ${diamondPackagesData.length}`);
  console.log(`  Settings:      ${systemSettingsData.length}`);
  console.log(`  Feature Flags: ${featureFlagsData.length}`);
  console.log(`  Admin User:    superadmin (admin@gaming.com)`);
  console.log('========================================\n');
}

// ============================================================
// EXECUTE
// ============================================================

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
