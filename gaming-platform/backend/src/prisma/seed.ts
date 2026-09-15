import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.player.upsert({
    where: { email: 'admin@gaming.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'Admin',
      email: 'admin@gaming.com',
      passwordHash: adminHash,
      role: 'super_admin',
    },
  });
  await prisma.walletAccount.upsert({
    where: { playerId: admin.id },
    update: {},
    create: { id: uuidv4(), playerId: admin.id, balance: 999999 },
  });

  // Demo player
  const playerHash = await bcrypt.hash('player123', 12);
  const player = await prisma.player.upsert({
    where: { email: 'player@gaming.com' },
    update: {},
    create: {
      id: uuidv4(),
      username: 'DemoPlayer',
      email: 'player@gaming.com',
      passwordHash: playerHash,
      role: 'player',
    },
  });
  await prisma.walletAccount.upsert({
    where: { playerId: player.id },
    update: {},
    create: { id: uuidv4(), playerId: player.id, balance: 50000 },
  });

  // Profit & Risk Config
  await prisma.profitRiskConfig.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      baseHouseEdge: 8.0,
      vipAdjustment: 1.5,
      maxPayoutPerRound: 10000,
      jackpotWeight: 1.0,
      maxDailyLossPerPlayer: 500,
    },
  });

  // Games
  const games = [
    {
      name: 'Greedy',
      slug: 'greedy',
      description: 'Circular food/ingredient betting game with the Greedy character',
      sortOrder: 1,
    },
    {
      name: 'Animal Wheel',
      slug: 'animal-wheel',
      description: 'Circular animal/food betting wheel',
      sortOrder: 2,
    },
    {
      name: 'Teen Patti',
      slug: 'teen-patti',
      description: 'Three-position card table game',
      sortOrder: 3,
    },
    {
      name: 'Food Wheel',
      slug: 'food-wheel',
      description: 'Food package betting wheel with select time feature',
      sortOrder: 4,
    },
    {
      name: 'Three Card',
      slug: 'three-card',
      description: 'Three-player card game',
      sortOrder: 5,
    },
    {
      name: 'Slot Machine',
      slug: 'slot',
      description: 'Reel-based slot with multiplier wheel',
      sortOrder: 6,
    },
  ];

  for (const gameData of games) {
    const game = await prisma.game.upsert({
      where: { slug: gameData.slug },
      update: {},
      create: { id: uuidv4(), ...gameData },
    });

    // Game configuration
    const configExists = await prisma.gameConfiguration.findFirst({ where: { gameId: game.id } });
    if (!configExists) {
      await prisma.gameConfiguration.create({
        data: {
          id: uuidv4(),
          gameId: game.id,
          houseEdge: 8.0,
          maxPayoutPerRound: 10000,
          jackpotWeight: 1.0,
          maxDailyLoss: 100000,
        },
      });
    }

    // Seed options per game
    const optionsMap: Record<string, Array<{ label: string; multiplier: number; colorHex: string; isHot?: boolean }>> = {
      greedy: [
        { label: 'Burger', multiplier: 3, colorHex: '#e74c3c' },
        { label: 'Pizza', multiplier: 5, colorHex: '#e67e22' },
        { label: 'Sushi', multiplier: 7, colorHex: '#f1c40f' },
        { label: 'Donut', multiplier: 9, colorHex: '#2ecc71' },
        { label: 'Cake', multiplier: 10, colorHex: '#1abc9c' },
        { label: 'Ramen', multiplier: 14, colorHex: '#3498db' },
        { label: 'Lobster', multiplier: 24, colorHex: '#9b59b6' },
        { label: 'Diamond', multiplier: 50, colorHex: '#e91e63' },
        { label: 'Taco', multiplier: 4.3, colorHex: '#ff5722' },
        { label: 'Salad', multiplier: 1.27, colorHex: '#8bc34a' },
      ],
      'animal-wheel': [
        { label: 'Rabbit', multiplier: 5, colorHex: '#e74c3c', isHot: true },
        { label: 'Tiger', multiplier: 45, colorHex: '#e67e22', isHot: true },
        { label: 'Bear', multiplier: 25, colorHex: '#f1c40f' },
        { label: 'Fox', multiplier: 15, colorHex: '#2ecc71' },
        { label: 'Wolf', multiplier: 10, colorHex: '#3498db', isHot: true },
        { label: 'Eagle', multiplier: 20, colorHex: '#9b59b6' },
        { label: 'Snake', multiplier: 30, colorHex: '#1abc9c' },
        { label: 'Dragon', multiplier: 100, colorHex: '#e91e63', isHot: true },
      ],
      'teen-patti': [
        { label: 'Player A', multiplier: 2.9, colorHex: '#e74c3c' },
        { label: 'Player B', multiplier: 2.9, colorHex: '#3498db' },
        { label: 'Player C', multiplier: 2.9, colorHex: '#2ecc71' },
      ],
      'food-wheel': [
        { label: 'Noodles', multiplier: 3, colorHex: '#e74c3c' },
        { label: 'Dumpling', multiplier: 5, colorHex: '#e67e22' },
        { label: 'Hot Pot', multiplier: 10, colorHex: '#f1c40f', isHot: true },
        { label: 'BBQ', multiplier: 15, colorHex: '#2ecc71', isHot: true },
        { label: 'Seafood', multiplier: 25, colorHex: '#3498db' },
        { label: 'Premium', multiplier: 50, colorHex: '#9b59b6', isHot: true },
      ],
      'three-card': [
        { label: 'Red', multiplier: 2.9, colorHex: '#e74c3c' },
        { label: 'Blue', multiplier: 2.9, colorHex: '#3498db' },
        { label: 'Green', multiplier: 2.9, colorHex: '#2ecc71' },
      ],
      slot: [
        { label: 'x2', multiplier: 2, colorHex: '#3498db' },
        { label: 'x5', multiplier: 5, colorHex: '#2ecc71' },
        { label: 'x10', multiplier: 10, colorHex: '#f1c40f', isHot: true },
        { label: 'x25', multiplier: 25, colorHex: '#e67e22', isHot: true },
        { label: 'x50', multiplier: 50, colorHex: '#e74c3c', isHot: true },
        { label: 'x100', multiplier: 100, colorHex: '#9b59b6', isHot: true },
        { label: 'JACKPOT', multiplier: 500, colorHex: '#ffd700', isHot: true },
      ],
    };

    const gameOptions = optionsMap[game.slug] || [];
    for (let i = 0; i < gameOptions.length; i++) {
      const opt = gameOptions[i];
      const existingOpt = await prisma.gameOption.findFirst({
        where: { gameId: game.id, label: opt.label },
      });
      if (!existingOpt) {
        await prisma.gameOption.create({
          data: { id: uuidv4(), gameId: game.id, ...opt, sortOrder: i },
        });
      }
    }
  }

  // Token packages
  const packages = [
    { name: 'Starter Pack', priceUsd: 4.99, baseTokens: 500, bonusTokens: 50, isSpecialOffer: true, isPopular: true, expiryDays: 30, sortOrder: 1 },
    { name: 'Bronze Pack', priceUsd: 9.99, baseTokens: 1200, bonusTokens: 100, isSpecialOffer: false, isPopular: false, expiryDays: 30, sortOrder: 2 },
    { name: 'Silver Pack', priceUsd: 24.99, baseTokens: 3000, bonusTokens: 500, isSpecialOffer: false, isPopular: true, expiryDays: 60, sortOrder: 3 },
    { name: 'Gold Pack', priceUsd: 49.99, baseTokens: 7000, bonusTokens: 1500, isSpecialOffer: true, isPopular: false, expiryDays: 90, sortOrder: 4 },
    { name: 'Diamond Pack', priceUsd: 99.99, baseTokens: 15000, bonusTokens: 5000, isSpecialOffer: true, isPopular: false, expiryDays: 90, sortOrder: 5 },
  ];

  for (const pkg of packages) {
    const existingPkg = await prisma.tokenPackage.findFirst({ where: { name: pkg.name } });
    if (!existingPkg) {
      await prisma.tokenPackage.create({ data: { id: uuidv4(), ...pkg } });
    }
  }

  console.log('✅ Seed complete!');
  console.log('   Admin: admin@gaming.com / admin123');
  console.log('   Player: player@gaming.com / player123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
