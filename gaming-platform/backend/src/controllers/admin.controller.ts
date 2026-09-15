import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { adminAdjustTokens } from '../services/wallet.service';
import { createAuditLog } from '../services/audit.service';

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    activeGames,
    totalGames,
    liveRounds,
    todayBets,
    yesterdayBets,
    todayProfit,
    yesterdayProfit,
  ] = await Promise.all([
    prisma.game.count({ where: { isActive: true } }),
    prisma.game.count(),
    prisma.gameRound.count({
      where: { status: { in: ['BETTING_OPEN', 'BETTING_CLOSED', 'RESULT_PROCESSING'] } },
    }),
    prisma.gameBet.aggregate({
      where: { createdAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.gameBet.aggregate({
      where: {
        createdAt: {
          gte: new Date(startOfDay.getTime() - 86400000),
          lt: startOfDay,
        },
      },
      _sum: { amount: true },
    }),
    // Profit = total bets - total payouts today
    Promise.all([
      prisma.gameBet.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { amount: true },
      }),
      prisma.gameSettlement.aggregate({
        where: { createdAt: { gte: startOfDay }, status: 'COMPLETED' },
        _sum: { payout: true },
      }),
    ]),
    Promise.all([
      prisma.gameBet.aggregate({
        where: {
          createdAt: {
            gte: new Date(startOfDay.getTime() - 86400000),
            lt: startOfDay,
          },
        },
        _sum: { amount: true },
      }),
      prisma.gameSettlement.aggregate({
        where: {
          createdAt: {
            gte: new Date(startOfDay.getTime() - 86400000),
            lt: startOfDay,
          },
          status: 'COMPLETED',
        },
        _sum: { payout: true },
      }),
    ]),
  ]);

  const todayBetAmount = todayBets._sum.amount ?? 0;
  const yesterdayBetAmount = yesterdayBets._sum.amount ?? 0;
  const todayProfitValue = (todayProfit[0]._sum.amount ?? 0) - (todayProfit[1]._sum.payout ?? 0);
  const yesterdayProfitValue =
    (yesterdayProfit[0]._sum.amount ?? 0) - (yesterdayProfit[1]._sum.payout ?? 0);

  const betChangeVsYesterday =
    yesterdayBetAmount > 0
      ? Math.round(((todayBetAmount - yesterdayBetAmount) / yesterdayBetAmount) * 100)
      : 0;
  const profitChangeVsYesterday =
    yesterdayProfitValue !== 0
      ? Math.round(((todayProfitValue - yesterdayProfitValue) / Math.abs(yesterdayProfitValue)) * 100)
      : 0;

  sendSuccess(res, {
    activeGames,
    totalGames,
    liveRounds,
    todayBets: {
      total: todayBetAmount,
      count: todayBets._count,
      changeVsYesterday: betChangeVsYesterday,
    },
    netProfit: {
      total: todayProfitValue,
      changeVsYesterday: profitChangeVsYesterday,
    },
    systemStatus: 'online',
  });
}

// ─── Profit & Risk Config ─────────────────────────────────────────────────────

export async function getProfitRiskConfig(req: Request, res: Response): Promise<void> {
  const config = await prisma.profitRiskConfig.findFirst({ where: { isActive: true } });
  sendSuccess(res, config);
}

export async function saveProfitRiskConfig(req: Request, res: Response): Promise<void> {
  const { baseHouseEdge, vipAdjustment, maxPayoutPerRound, jackpotWeight, maxDailyLossPerPlayer } =
    req.body;

  const existing = await prisma.profitRiskConfig.findFirst({ where: { isActive: true } });

  const config = existing
    ? await prisma.profitRiskConfig.update({
        where: { id: existing.id },
        data: { baseHouseEdge, vipAdjustment, maxPayoutPerRound, jackpotWeight, maxDailyLossPerPlayer },
      })
    : await prisma.profitRiskConfig.create({
        data: { baseHouseEdge, vipAdjustment, maxPayoutPerRound, jackpotWeight, maxDailyLossPerPlayer },
      });

  await createAuditLog({
    actorId: req.player?.playerId,
    actorType: 'admin',
    action: 'PROFIT_RISK_CONFIG_UPDATED',
    entityType: 'config',
    entityId: config.id,
    before: existing ? existing : undefined,
    after: config,
  });

  sendSuccess(res, config, 'Configuration saved');
}

export async function simulateProfitScenario(req: Request, res: Response): Promise<void> {
  const config = await prisma.profitRiskConfig.findFirst({ where: { isActive: true } });
  const houseEdge = config?.baseHouseEdge ?? 8;
  const maxPayout = config?.maxPayoutPerRound ?? 10000;
  const rounds = 10000;

  // Simulate expected values
  const expectedProfit = (rounds * 100 * houseEdge) / 100;
  const roi = houseEdge;
  const maxExposure = maxPayout * Math.sqrt(rounds);
  const riskLevel = houseEdge < 5 ? 'High' : houseEdge < 10 ? 'Medium' : 'Low';

  // Hourly simulation data
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    totalBets: Math.round(Math.random() * 3000 + 1000),
    netProfit: Math.round(Math.random() * 500 + 200),
  }));

  sendSuccess(res, {
    expectedProfit,
    roi,
    maxExposure,
    riskLevel,
    simulatedRounds: rounds,
    hourlyData,
    simulatedAt: new Date().toISOString(),
  });
}

// ─── Players ──────────────────────────────────────────────────────────────────

export async function listPlayers(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
          { id: { contains: search } },
        ],
      }
    : {};

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { walletAccount: true },
    }),
    prisma.player.count({ where }),
  ]);

  const sanitized = players.map((p) => ({
    id: p.id,
    username: p.username,
    email: p.email,
    role: p.role,
    isActive: p.isActive,
    createdAt: p.createdAt,
    balance: p.walletAccount?.balance ?? 0,
    totalWon: p.walletAccount?.totalWon ?? 0,
    totalLost: p.walletAccount?.totalLost ?? 0,
  }));

  sendSuccess(res, { players: sanitized, total, page, limit });
}

export async function getPlayerDetails(req: Request, res: Response): Promise<void> {
  const { playerId } = req.params;
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      walletAccount: {
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
      },
    },
  });

  if (!player) {
    sendError(res, 'Player not found', 'NOT_FOUND', 404);
    return;
  }

  const betStats = await prisma.gameBet.aggregate({
    where: { playerId },
    _sum: { amount: true, payout: true },
    _count: true,
  });

  sendSuccess(res, {
    id: player.id,
    username: player.username,
    email: player.email,
    role: player.role,
    isActive: player.isActive,
    createdAt: player.createdAt,
    balance: player.walletAccount?.balance ?? 0,
    totalWon: player.walletAccount?.totalWon ?? 0,
    totalLost: player.walletAccount?.totalLost ?? 0,
    totalBets: betStats._count,
    totalBetAmount: betStats._sum.amount ?? 0,
    recentTransactions: player.walletAccount?.transactions ?? [],
  });
}

export async function applyPlayerOverride(req: Request, res: Response): Promise<void> {
  const { playerId } = req.params;
  const { houseEdge, customLossLimit, tokenAdjustment, adjustmentType, notes } = req.body;
  const adminId = req.player!.playerId;

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) {
    sendError(res, 'Player not found', 'NOT_FOUND', 404);
    return;
  }

  // Apply token adjustment if specified
  if (tokenAdjustment && tokenAdjustment !== 0) {
    const amount = adjustmentType === 'Remove' ? -Math.abs(tokenAdjustment) : Math.abs(tokenAdjustment);
    await adminAdjustTokens(playerId, amount, adminId, notes || 'Admin override');
  }

  // Upsert player override record
  const override = await prisma.playerOverride.upsert({
    where: { playerId },
    update: { houseEdge, customLossLimit, notes, appliedBy: adminId },
    create: { playerId, houseEdge, customLossLimit, notes, appliedBy: adminId },
  });

  await createAuditLog({
    actorId: adminId,
    actorType: 'admin',
    action: 'PLAYER_OVERRIDE_APPLIED',
    entityType: 'player',
    entityId: playerId,
    after: { houseEdge, customLossLimit, tokenAdjustment, notes },
  });

  sendSuccess(res, override, 'Player override applied');
}

// ─── Token Packages ───────────────────────────────────────────────────────────

export async function listTokenPackages(req: Request, res: Response): Promise<void> {
  const onlyActive = req.query.active === 'true';
  const packages = await prisma.tokenPackage.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: { sortOrder: 'asc' },
  });
  sendSuccess(res, packages);
}

export async function saveTokenPackage(req: Request, res: Response): Promise<void> {
  const { id, name, priceUsd, baseTokens, bonusTokens, isSpecialOffer, isPopular, expiryDays, isActive } =
    req.body;

  const data = { name, priceUsd, baseTokens, bonusTokens, isSpecialOffer, isPopular, expiryDays, isActive };

  const pkg = id
    ? await prisma.tokenPackage.update({ where: { id }, data })
    : await prisma.tokenPackage.create({ data: { ...data } });

  await createAuditLog({
    actorId: req.player?.playerId,
    actorType: 'admin',
    action: id ? 'TOKEN_PACKAGE_UPDATED' : 'TOKEN_PACKAGE_CREATED',
    entityType: 'token_package',
    entityId: pkg.id,
    after: data,
  });

  sendSuccess(res, pkg, id ? 'Package updated' : 'Package created', id ? 200 : 201);
}

export async function deleteTokenPackage(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.tokenPackage.update({ where: { id }, data: { isActive: false } });
  sendSuccess(res, null, 'Package deactivated');
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getBetReport(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const gameId = req.query.gameId as string;
  const playerId = req.query.playerId as string;
  const status = req.query.status as string;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (playerId) where.playerId = playerId;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
  if (gameId) {
    where.round = { gameId };
  }

  const [bets, total] = await Promise.all([
    prisma.gameBet.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        player: { select: { id: true, username: true, email: true } },
        option: true,
        round: {
          include: { game: { select: { id: true, name: true, slug: true } } },
        },
      },
    }),
    prisma.gameBet.count({ where }),
  ]);

  sendSuccess(res, { bets, total, page, limit });
}

export async function getSettlementReport(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [settlements, total] = await Promise.all([
    prisma.gameSettlement.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        round: { include: { game: { select: { id: true, name: true } } } },
        bet: { include: { player: { select: { id: true, username: true } }, option: true } },
      },
    }),
    prisma.gameSettlement.count(),
  ]);

  sendSuccess(res, { settlements, total, page, limit });
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const actorId = req.query.actorId as string;
  const action = req.query.action as string;
  const entityType = req.query.entityType as string;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (actorId) where.actorId = actorId;
  if (action) where.action = { contains: action };
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, { logs, total, page, limit });
}

// ─── Admin Game Management ────────────────────────────────────────────────────

export async function adminListGames(req: Request, res: Response): Promise<void> {
  const games = await prisma.game.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
      _count: { select: { rounds: true } },
    },
  });
  sendSuccess(res, games);
}

export async function updateGameConfig(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const { houseEdge, maxPayoutPerRound, jackpotWeight, maxDailyLoss } = req.body;

  const existing = await prisma.gameConfiguration.findFirst({
    where: { gameId, isActive: true },
  });

  const config = existing
    ? await prisma.gameConfiguration.update({
        where: { id: existing.id },
        data: { houseEdge, maxPayoutPerRound, jackpotWeight, maxDailyLoss },
      })
    : await prisma.gameConfiguration.create({
        data: { gameId, houseEdge, maxPayoutPerRound, jackpotWeight, maxDailyLoss },
      });

  await createAuditLog({
    actorId: req.player?.playerId,
    actorType: 'admin',
    action: 'GAME_CONFIG_UPDATED',
    entityType: 'game_configuration',
    entityId: config.id,
    after: { gameId, houseEdge, maxPayoutPerRound },
  });

  sendSuccess(res, config, 'Game configuration updated');
}
