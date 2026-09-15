import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { debitWallet, WalletError } from './wallet.service';
import { createAuditLog } from './audit.service';

export class BetError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'BetError';
  }
}

export interface PlaceBetInput {
  roundId: string;
  playerId: string;
  optionId: string;
  amount: number;
  idempotencyKey: string;
}

export async function placeBet(input: PlaceBetInput): Promise<object> {
  const { roundId, playerId, optionId, amount, idempotencyKey } = input;

  // Check idempotency first
  const existingBet = await prisma.gameBet.findUnique({ where: { idempotencyKey } });
  if (existingBet) return existingBet;

  // Validate round
  const round = await prisma.gameRound.findUnique({
    where: { id: roundId },
    include: { game: { include: { configurations: { where: { isActive: true }, take: 1 } } } },
  });
  if (!round) throw new BetError('Round not found', 'ROUND_NOT_FOUND');
  if (round.status !== 'BETTING_OPEN') {
    throw new BetError('Betting is not open for this round', 'BETTING_CLOSED');
  }

  // Server-side betting close check
  if (round.bettingEndsAt && new Date() > round.bettingEndsAt) {
    // Auto-close if past deadline
    await prisma.gameRound.update({ where: { id: roundId }, data: { status: 'BETTING_CLOSED' } });
    throw new BetError('Betting time has expired', 'BETTING_EXPIRED');
  }

  // Validate option
  const option = await prisma.gameOption.findUnique({ where: { id: optionId } });
  if (!option || option.gameId !== round.gameId || !option.isActive) {
    throw new BetError('Invalid betting option', 'INVALID_OPTION');
  }

  // Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BetError('Bet amount must be a finite positive number', 'INVALID_AMOUNT');
  }

  const existingPlayerBet = await prisma.gameBet.findFirst({
    where: { roundId, playerId },
    select: { id: true },
  });
  if (existingPlayerBet) {
    throw new BetError('Only one bet is allowed per round', 'DUPLICATE_ROUND_BET');
  }

  // Check daily loss limit
  const config = round.game.configurations[0];
  if (config) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayLoss = await prisma.gameBet.aggregate({
      where: {
        playerId,
        status: 'LOST',
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true },
    });
    const dailyLost = todayLoss._sum.amount ?? 0;
    if (dailyLost + amount > config.maxDailyLoss) {
      throw new BetError('Daily loss limit would be exceeded', 'DAILY_LOSS_LIMIT');
    }
  }

  // Debit wallet (atomic)
  const walletIdempotencyKey = `bet-debit-${idempotencyKey}`;
  let txRef: string;
  try {
    const { txId } = await debitWallet(
      playerId,
      amount,
      `bet:${idempotencyKey}`,
      `Bet on round ${round.roundNumber}`,
      walletIdempotencyKey
    );
    txRef = txId;
  } catch (err) {
    if (err instanceof WalletError) {
      throw new BetError(err.message, err.code);
    }
    throw err;
  }

  // Create bet record
  const bet = await prisma.gameBet.create({
    data: {
      id: uuidv4(),
      roundId,
      playerId,
      optionId,
      amount,
      idempotencyKey,
      txRef,
      status: 'PENDING',
    },
    include: {
      option: true,
      round: { select: { roundNumber: true, gameId: true } },
    },
  });

  // Update round total
  await prisma.gameRound.update({
    where: { id: roundId },
    data: { totalBetAmount: { increment: amount } },
  });

  await createAuditLog({
    actorId: playerId,
    actorType: 'player',
    action: 'BET_PLACED',
    entityType: 'bet',
    entityId: bet.id,
    after: { roundId, optionId, amount },
  });

  return bet;
}

export async function getPlayerBetHistory(
  playerId: string,
  page = 1,
  limit = 20,
  gameId?: string
): Promise<{ bets: object[]; total: number }> {
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = { playerId };
  if (gameId) {
    where.round = { gameId };
  }

  const [bets, total] = await Promise.all([
    prisma.gameBet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        option: true,
        round: {
          include: { game: { select: { id: true, name: true, slug: true } } },
        },
      },
    }),
    prisma.gameBet.count({ where }),
  ]);

  return { bets, total };
}

export async function getRoundBets(roundId: string): Promise<object[]> {
  return prisma.gameBet.findMany({
    where: { roundId },
    include: { option: true, player: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOptionTotals(roundId: string): Promise<object[]> {
  const bets = await prisma.gameBet.groupBy({
    by: ['optionId'],
    where: { roundId, status: 'PENDING' },
    _sum: { amount: true },
    _count: true,
  });

  const options = await prisma.gameOption.findMany({
    where: { id: { in: bets.map((b) => b.optionId) } },
  });

  return bets.map((b) => {
    const option = options.find((o) => o.id === b.optionId);
    return {
      optionId: b.optionId,
      label: option?.label,
      multiplier: option?.multiplier,
      totalAmount: b._sum.amount ?? 0,
      betCount: b._count,
    };
  });
}
