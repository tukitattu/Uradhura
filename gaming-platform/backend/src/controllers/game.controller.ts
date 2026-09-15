import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import {
  createRound,
  getCurrentRound,
  closeBetting,
  setRoundResult,
  settleRound,
  getRoundHistory,
} from '../services/round.service';
import { placeBet, getPlayerBetHistory, getOptionTotals } from '../services/bet.service';

// ─── Games ────────────────────────────────────────────────────────────────────

export async function listGames(req: Request, res: Response): Promise<void> {
  const [games, brandings] = await Promise.all([
    prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
      rounds: {
        where: { status: { in: ['UPCOMING', 'BETTING_OPEN', 'BETTING_CLOSED', 'RESULT_PROCESSING'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          roundNumber: true,
          status: true,
          bettingEndsAt: true,
          totalBetAmount: true,
        },
      },
    },
    }),
    prisma.gameBranding.findMany(),
  ]);
  sendSuccess(res, games.map(game => ({
    ...game,
    activeRound: game.rounds[0] || null,
    branding: brandings.find(branding => branding.gameSlug === game.slug) || null,
  })));
}

export async function getGame(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const [game, branding] = await Promise.all([
    prisma.game.findUnique({
    where: { slug },
    include: {
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
    },
    }),
    prisma.gameBranding.findUnique({ where: { gameSlug: slug } }),
  ]);
  if (!game) {
    sendError(res, 'Game not found', 'NOT_FOUND', 404);
    return;
  }
  sendSuccess(res, { ...game, branding });
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export async function startRound(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const { bettingDuration } = req.body;
  try {
    const round = await createRound(gameId, bettingDuration || 30);
    sendSuccess(res, round, 'Round created', 201);
  } catch (err) {
    sendError(res, (err as Error).message, 'ROUND_ERROR');
  }
}

export async function getActiveRound(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const round = await getCurrentRound(gameId);
  if (!round) {
    sendError(res, 'No active round', 'NO_ACTIVE_ROUND', 404);
    return;
  }
  sendSuccess(res, round);
}

export async function closeRoundBetting(req: Request, res: Response): Promise<void> {
  const { roundId } = req.params;
  try {
    const round = await closeBetting(roundId);
    sendSuccess(res, round, 'Betting closed');
  } catch (err) {
    sendError(res, (err as Error).message, 'ROUND_ERROR');
  }
}

export async function processRoundResult(req: Request, res: Response): Promise<void> {
  const { roundId } = req.params;
  const { winningOptionId, resultData } = req.body;

  if (!winningOptionId) {
    sendError(res, 'winningOptionId is required', 'VALIDATION_ERROR');
    return;
  }

  try {
    const result = await setRoundResult(roundId, winningOptionId, resultData || {}, req.player?.playerId);
    sendSuccess(res, result, 'Result set');
  } catch (err) {
    sendError(res, (err as Error).message, 'ROUND_ERROR');
  }
}

export async function triggerSettlement(req: Request, res: Response): Promise<void> {
  const { roundId } = req.params;
  try {
    const result = await settleRound(roundId);
    sendSuccess(res, result, 'Settlement complete');
  } catch (err) {
    sendError(res, (err as Error).message, 'SETTLEMENT_ERROR');
  }
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await getRoundHistory(gameId, page, limit);
  sendSuccess(res, result);
}

// ─── Bets ─────────────────────────────────────────────────────────────────────

export async function submitBet(req: Request, res: Response): Promise<void> {
  const { roundId, optionId, amount, idempotencyKey } = req.body;
  const playerId = req.player!.playerId;

  if (!roundId || !optionId || !amount || !idempotencyKey) {
    sendError(res, 'roundId, optionId, amount, and idempotencyKey are required', 'VALIDATION_ERROR');
    return;
  }
  if (typeof amount !== 'number' || amount <= 0) {
    sendError(res, 'Amount must be a positive number', 'VALIDATION_ERROR');
    return;
  }

  try {
    const bet = await placeBet({ roundId, playerId, optionId, amount, idempotencyKey });
    sendSuccess(res, bet, 'Bet placed', 201);
  } catch (err: unknown) {
    const e = err as { code?: string; message: string };
    const statusMap: Record<string, number> = {
      INSUFFICIENT_BALANCE: 402,
      BETTING_CLOSED: 409,
      BETTING_EXPIRED: 409,
      DUPLICATE_ROUND_BET: 409,
      DAILY_LOSS_LIMIT: 422,
    };
    sendError(res, e.message, e.code || 'BET_ERROR', statusMap[e.code || ''] || 400);
  }
}

export async function getMyBets(req: Request, res: Response): Promise<void> {
  const playerId = req.player!.playerId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const gameId = req.query.gameId as string | undefined;

  const result = await getPlayerBetHistory(playerId, page, limit, gameId);
  sendSuccess(res, result);
}

export async function getRoundOptionTotals(req: Request, res: Response): Promise<void> {
  const { roundId } = req.params;
  const totals = await getOptionTotals(roundId);
  sendSuccess(res, totals);
}

// ─── Public Token Packages ────────────────────────────────────────────────────

export async function getPublicPackages(req: Request, res: Response): Promise<void> {
  const packages = await prisma.tokenPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  sendSuccess(res, packages);
}

export async function demoTopUp(req: Request, res: Response): Promise<void> {
  const { packageId } = req.body;
  const playerId = req.player!.playerId;

  if (!packageId) {
    sendError(res, 'packageId is required', 'VALIDATION_ERROR');
    return;
  }

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) {
    sendError(res, 'Package not found', 'NOT_FOUND', 404);
    return;
  }

  const totalTokens = pkg.baseTokens + pkg.bonusTokens;
  const { creditWallet } = await import('../services/wallet.service');
  await creditWallet(
    playerId,
    totalTokens,
    `topup:${packageId}`,
    `Demo top-up: ${pkg.name}`,
    `topup-${playerId}-${Date.now()}`
  );

  const wallet = await prisma.walletAccount.findUnique({ where: { playerId } });
  sendSuccess(res, { balance: wallet?.balance ?? 0, tokensAdded: totalTokens }, 'Top-up successful');
}

// ─── Public Design Tokens ─────────────────────────────────────────────────────

export async function getPublicDesignTokens(req: Request, res: Response): Promise<void> {
  const requestedScope = typeof req.query.scope === 'string' ? req.query.scope : 'global';
  const scope = requestedScope === 'global' ? 'global' : requestedScope;
  const tokens = await prisma.designToken.findMany({
    where: { scope: { in: ['global', scope] } },
    orderBy: { key: 'asc' },
  });
  sendSuccess(res, tokens);
}

// ─── Public Game Branding ─────────────────────────────────────────────────────

export async function getPublicGameBranding(req: Request, res: Response): Promise<void> {
  // Public endpoint — returns branding for all visible games merged with game data
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
    },
  });
  const brandings = await prisma.gameBranding.findMany();
  const result = games.map(g => ({
    ...g,
    branding: brandings.find(b => b.gameSlug === g.slug) || null,
  }));
  sendSuccess(res, result);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getWallet(req: Request, res: Response): Promise<void> {
  const playerId = req.player!.playerId;
  const wallet = await prisma.walletAccount.findUnique({
    where: { playerId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!wallet) {
    sendError(res, 'Wallet not found', 'NOT_FOUND', 404);
    return;
  }
  sendSuccess(res, wallet);
}
