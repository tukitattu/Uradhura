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
