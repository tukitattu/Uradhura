import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { createAuditLog } from './audit.service';

export type RoundStatus =
  | 'UPCOMING'
  | 'BETTING_OPEN'
  | 'BETTING_CLOSED'
  | 'RESULT_PROCESSING'
  | 'SETTLED'
  | 'CLOSED';

export async function createRound(gameId: string, bettingDurationSeconds = 30): Promise<object> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error('Game not found');

  // Get next round number
  const lastRound = await prisma.gameRound.findFirst({
    where: { gameId },
    orderBy: { roundNumber: 'desc' },
  });

  const roundNumber = (lastRound?.roundNumber ?? 0) + 1;
  const bettingEndsAt = new Date(Date.now() + bettingDurationSeconds * 1000);

  const round = await prisma.gameRound.create({
    data: {
      id: uuidv4(),
      gameId,
      roundNumber,
      status: 'BETTING_OPEN',
      bettingEndsAt,
    },
    include: {
      game: { select: { id: true, name: true, slug: true } },
    },
  });

  await createAuditLog({
    action: 'ROUND_CREATED',
    entityType: 'round',
    entityId: round.id,
    after: { gameId, roundNumber, status: 'BETTING_OPEN' },
  });

  return round;
}

export async function getCurrentRound(gameId: string): Promise<object | null> {
  const round = await prisma.gameRound.findFirst({
    where: {
      gameId,
      status: { in: ['BETTING_OPEN', 'BETTING_CLOSED', 'RESULT_PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      game: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      _count: { select: { bets: true } },
    },
  });

  return round;
}

export async function closeBetting(roundId: string): Promise<object> {
  const round = await prisma.gameRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('Round not found');
  if (round.status !== 'BETTING_OPEN') throw new Error('Round is not in BETTING_OPEN status');

  const updated = await prisma.gameRound.update({
    where: { id: roundId },
    data: { status: 'BETTING_CLOSED' },
  });

  await createAuditLog({
    action: 'ROUND_BETTING_CLOSED',
    entityType: 'round',
    entityId: roundId,
  });

  return updated;
}

export async function setRoundResult(
  roundId: string,
  winningOptionId: string,
  resultData: object,
  processedBy = 'system'
): Promise<object> {
  const round = await prisma.gameRound.findUnique({
    where: { id: roundId },
    include: { game: { include: { options: true } } },
  });
  if (!round) throw new Error('Round not found');

  const option = round.game.options.find((o) => o.id === winningOptionId);
  if (!option) throw new Error('Winning option not found');

  const [updatedRound] = await prisma.$transaction([
    prisma.gameRound.update({
      where: { id: roundId },
      data: {
        status: 'RESULT_PROCESSING',
        winnerId: winningOptionId,
        resultData: JSON.stringify(resultData),
      },
    }),
    prisma.gameResult.create({
      data: {
        id: uuidv4(),
        roundId,
        winningOption: option.label,
        resultData: JSON.stringify(resultData),
        processedBy,
      },
    }),
  ]);

  await createAuditLog({
    action: 'ROUND_RESULT_SET',
    entityType: 'round',
    entityId: roundId,
    after: { winningOptionId, winningOption: option.label, resultData },
  });

  return updatedRound;
}

export async function settleRound(roundId: string): Promise<{ settled: number; totalPayout: number }> {
  const round = await prisma.gameRound.findUnique({
    where: { id: roundId },
    include: {
      bets: {
        include: { option: true, player: true },
      },
      game: { include: { options: true } },
    },
  });

  if (!round) throw new Error('Round not found');
  if (round.status !== 'RESULT_PROCESSING') throw new Error('Round is not ready for settlement');
  if (!round.winnerId) throw new Error('No winner set for this round');

  const { creditWallet } = await import('./wallet.service');

  let totalPayout = 0;
  let settled = 0;

  for (const bet of round.bets) {
    if (bet.status !== 'PENDING') continue;

    const isWinner = bet.optionId === round.winnerId;
    const payout = isWinner ? bet.amount * bet.option.multiplier : 0;

    await prisma.$transaction(async (tx) => {
      // Update bet status
      await tx.gameBet.update({
        where: { id: bet.id },
        data: {
          status: isWinner ? 'WON' : 'LOST',
          payout,
          settledAt: new Date(),
        },
      });

      // Create settlement record
      await tx.gameSettlement.create({
        data: {
          id: uuidv4(),
          roundId,
          betId: bet.id,
          playerId: bet.playerId,
          payout,
          status: 'COMPLETED',
          settledAt: new Date(),
        },
      });
    });

    // Credit winnings (idempotent)
    if (isWinner && payout > 0) {
      await creditWallet(
        bet.playerId,
        payout,
        bet.id,
        `Winnings for round ${round.roundNumber}`,
        `settlement-${bet.id}`
      );
      totalPayout += payout;
    }

    settled++;
  }

  await prisma.gameRound.update({
    where: { id: roundId },
    data: { status: 'SETTLED', settledAt: new Date() },
  });

  await createAuditLog({
    action: 'ROUND_SETTLED',
    entityType: 'round',
    entityId: roundId,
    after: { settled, totalPayout },
  });

  return { settled, totalPayout };
}

export async function getRoundHistory(
  gameId: string,
  page = 1,
  limit = 20
): Promise<{ rounds: object[]; total: number }> {
  const skip = (page - 1) * limit;
  const [rounds, total] = await Promise.all([
    prisma.gameRound.findMany({
      where: { gameId, status: 'SETTLED' },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        result: true,
        _count: { select: { bets: true } },
      },
    }),
    prisma.gameRound.count({ where: { gameId, status: 'SETTLED' } }),
  ]);

  return { rounds, total };
}
