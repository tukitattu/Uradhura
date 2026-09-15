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
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
    },
  });
  sendSuccess(res, games);
}

export async function getGame(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      configurations: { where: { isActive: true }, take: 1 },
    },
  });
  if (!game) {
    sendError(res, 'Game not found', 'NOT_FOUND', 404);
    return;
  }
  sendSuccess(res, game);
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
    // Auto-create a round for convenience
    try {
      const newRound = await createRound(gameId, 30);
      sendSuccess(res, newRound);
      return;
    } catch {
      sendError(res, 'No active round and could not create one', 'NO_ACTIVE_ROUND', 404);
      return;
    }
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
