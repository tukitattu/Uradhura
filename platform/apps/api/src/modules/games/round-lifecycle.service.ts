// ============================================================
// ROUND LIFECYCLE SERVICE — Game Round State Machine
// Manages the full lifecycle: upcoming → betting_open →
//   betting_closed → result_processing → settled / closed
// Seeds are committed BEFORE betting opens (provably fair) and
// revealed AFTER settlement. Outcomes are produced by the game
// driver registered for the game's internalCode.
//
// Every state transition locks the round row (SELECT ... FOR UPDATE)
// inside its own transaction so concurrent scheduler ticks, admin
// actions and bet placements serialize and can never double-advance
// or land a bet on a closed round.
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SeedService, SeedBundle } from './seed.service';
import { GameDriverRegistry } from './drivers/driver.registry';
import { AuditService } from '../audit/audit.service';
import { GameRound, GameOption, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface RoundPayload {
  outcomeData: Record<string, unknown>;
  winnerOptionId: string | null;
  winnerLabel: string;
  payoutMultiplier?: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export { RoundPayload };

@Injectable()
export class RoundLifecycleService {
  private readonly logger = new Logger(RoundLifecycleService.name);

  private readonly VALID_TRANSITIONS: Record<string, string[]> = {
    upcoming: ['betting_open'],
    betting_open: ['betting_closed'],
    betting_closed: ['result_processing'],
    result_processing: ['settled', 'closed'],
    settled: [],
    closed: [],
  };

  constructor(
    private prisma: PrismaService,
    private seedService: SeedService,
    private driverRegistry: GameDriverRegistry,
    private auditService: AuditService,
  ) {}

  // ----------------------------------------------------------
  // State transitions
  // ----------------------------------------------------------

  async startBetting(roundId: string): Promise<GameRound> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.lockRound(tx, roundId);
      this.ensureValidTransition(row.status, 'betting_open');

      const config = await tx.gameConfiguration.findFirst({
        where: { gameId: row.gameId, isActive: true },
      });
      const bettingMs = (config?.bettingDurationSeconds ?? 30) * 1000;

      const now = new Date();
      return tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: 'betting_open',
          bettingOpensAt: now,
          bettingEndsAt: new Date(now.getTime() + bettingMs),
          updatedAt: now,
        },
      });
    });
  }

  async closeBetting(roundId: string): Promise<GameRound> {
    return this.prisma.$transaction(async (tx) => {
      const row = await this.lockRound(tx, roundId);
      this.ensureValidTransition(row.status, 'betting_closed');

      const now = new Date();
      return tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: 'betting_closed',
          bettingEndsAt: row.bettingEndsAt ?? now,
          closedAt: now,
          updatedAt: now,
        },
      });
    });
  }

  /**
   * Generates and persists the round result via the game's driver.
   * Uses the seed that was committed when the round was created.
   */
  async processResult(roundId: string): Promise<{ round: GameRound; payload: RoundPayload }> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockRound(tx, roundId);
      this.ensureValidTransition(locked.status, 'result_processing');

      const round = await tx.gameRound.findUnique({
        where: { id: roundId },
        include: {
          game: {
            include: {
              options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
              configurations: { where: { isActive: true }, take: 1 },
            },
          },
          seed: true,
        },
      });

      if (!round) throw new NotFoundException(`Round ${roundId} not found`);
      if (!round.seed) {
        throw new BadRequestException(`Round ${roundId} has no committed fair seed`);
      }

      const driver = this.driverRegistry.resolve(round.game.internalCode);
      const bundle: SeedBundle = {
        seedId: round.seed.id,
        serverSeed: round.seed.serverSeed,
        serverSeedHash: round.seed.serverSeedHash,
        clientSeed: round.seed.clientSeed,
        nonce: round.seed.nonce,
      };

      const outcome = driver.generateOutcome({
        round,
        options: round.game.options,
        config: round.game.configurations[0] ?? null,
        seed: bundle,
      });

      const resultData = JSON.stringify(outcome.resultData);
      const config = round.game.configurations[0];

      await tx.gameResult.create({
        data: {
          roundId: round.id,
          optionId:
            outcome.winningOptionId ??
            (typeof outcome.resultData.winningOptionId === 'string'
              ? outcome.resultData.winningOptionId
              : round.game.options[0]?.id ?? ''),
          winningLabel: outcome.winningLabel,
          resultData,
          seed: outcome.fairPlay.serverSeed ?? outcome.fairPlay.serverSeedHash,
          processedBy: 'system',
          metadata: JSON.stringify({
            serverSeedHash: outcome.fairPlay.serverSeedHash,
            clientSeed: outcome.fairPlay.clientSeed,
            nonce: outcome.fairPlay.nonce,
            configVersion: config?.version ?? null,
          }),
        },
      });

      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: 'result_processing',
          winnerId: outcome.winningOptionId,
          winnerLabel: outcome.winningLabel,
          resultData,
          houseEdge: config?.houseEdge ?? new Decimal(5),
          configVersion: config?.version ?? null,
          updatedAt: new Date(),
        },
      });

      return {
        round,
        payload: {
          outcomeData: outcome.resultData,
          winnerOptionId: outcome.winningOptionId,
          winnerLabel: outcome.winningLabel,
          payoutMultiplier: outcome.payoutMultiplier,
          serverSeedHash: outcome.fairPlay.serverSeedHash,
          clientSeed: outcome.fairPlay.clientSeed,
          nonce: outcome.fairPlay.nonce,
        },
      };
    });
  }

  /**
   * Settles all bets. Winners are bets on the winning option (or ALL bets
   * when winningOptionId is null, e.g. slots). Payout uses the driver's
   * payoutMultiplier override when present, else the option multiplier.
   * Credits winners atomically, then reveals the fair seed.
   */
  async settleRound(roundId: string): Promise<{
    round: GameRound;
    totalWinners: number;
    totalPayout: Decimal;
    revealedSeed: SeedBundle;
  }> {
    const settlements = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockRound(tx, roundId);
      if (locked.status !== 'result_processing') {
        throw new BadRequestException(
          `Round must be in result_processing status to settle. Current: ${locked.status}`,
        );
      }

      const round = await tx.gameRound.findUnique({
        where: { id: roundId },
        include: {
          game: {
            include: {
              configurations: { where: { isActive: true }, take: 1 },
            },
          },
          bets: { include: { option: true } },
          result: true,
        },
      });

      if (!round) throw new NotFoundException(`Round ${roundId} not found`);

      const resultData = round.resultData ? (JSON.parse(round.resultData) as Record<string, unknown>) : null;
      const winnerOptionId = round.winnerId;
      const houseEdge = round.game.configurations[0]?.houseEdge ?? new Decimal(5);
      const houseEdgeFactor = new Decimal(1).minus(houseEdge.dividedBy(100));

      const winnerBets =
        winnerOptionId === null
          ? round.bets.filter((b) => b.status === 'pending')
          : round.bets.filter((b) => b.optionId === winnerOptionId && b.status === 'pending');
      const loserBets =
        winnerOptionId === null
          ? []
          : round.bets.filter((b) => b.optionId !== winnerOptionId && b.status === 'pending');

      if (loserBets.length > 0) {
        await tx.gameBet.updateMany({
          where: { id: { in: loserBets.map((b) => b.id) } },
          data: { status: 'lost', settledAt: new Date() },
        });
      }

      const settlementRecords: unknown[] = [];
      let totalPayout = new Decimal(0);

      for (const bet of winnerBets) {
        const multiplier = this.resolvePayoutMultiplier(bet, resultData);
        const payout = bet.amount.mul(multiplier).mul(houseEdgeFactor);

        const settlement = await tx.gameSettlement.create({
          data: {
            roundId: round.id,
            betId: bet.id,
            playerId: bet.playerId,
            payout,
            status: 'pending',
          },
        });

        const walletRows = await tx.$queryRaw<
          { id: string; coinBalance: Decimal; totalCoinsEarned: Decimal }[]
        >`SELECT id, "coinBalance", "totalCoinsEarned" FROM wallet_accounts WHERE "playerId" = ${bet.playerId} FOR UPDATE`;

        if (!walletRows || walletRows.length === 0) {
          await tx.gameSettlement.update({
            where: { id: settlement.id },
            data: { status: 'failed' },
          });
          await tx.gameBet.update({
            where: { id: bet.id },
            data: { status: 'won', settledAt: new Date() },
          });
          continue;
        }

        const wallet = walletRows[0];
        const newBalance = new Decimal(wallet.coinBalance).add(payout);
        const txRef = `settlement_${settlement.id}`;

        await tx.walletTransaction.create({
          data: {
            walletAccountId: wallet.id,
            playerId: bet.playerId,
            type: 'bet_credit',
            currency: 'coins',
            amount: payout,
            balanceBefore: wallet.coinBalance,
            balanceAfter: newBalance,
            referenceType: 'game_round',
            referenceId: round.id,
            description: `Win on round #${round.roundNumber}`,
            idempotencyKey: txRef,
            metadata: JSON.stringify({
              betId: bet.id,
              settlementId: settlement.id,
              multiplier: multiplier.toString(),
              houseEdge: houseEdge.toString(),
            }),
          },
        });

        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: {
            coinBalance: newBalance,
            totalCoinsEarned: new Decimal(wallet.totalCoinsEarned).add(payout),
          },
        });

        await tx.gameSettlement.update({
          where: { id: settlement.id },
          data: { status: 'completed', txRef, settledAt: new Date() },
        });

        await tx.gameBet.update({
          where: { id: bet.id },
          data: { status: 'won', payout, settledAt: new Date() },
        });

        totalPayout = totalPayout.add(payout);
        settlementRecords.push(settlement);
      }

      const totalBetAmount = round.bets.reduce(
        (sum, b) => sum.add(new Decimal(b.amount)),
        new Decimal(0),
      );

      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: 'settled',
          totalBetAmount,
          totalPayout,
          settledAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        settlementRecords,
        totalPayout,
        totalWinners: winnerBets.length,
        round,
      };
    });

    // Reveal the fair seed AFTER settlement so players can verify.
    const revealedSeed = await this.seedService.revealRoundSeed(roundId);

    this.logger.log(
      `Round ${roundId} settled: ${settlements.totalWinners} winners, ${settlements.totalPayout} payout`,
    );

    await this.auditService.log({
      actorType: 'system',
      action: 'round.settled',
      entityType: 'GameRound',
      entityId: roundId,
      after: {
        winners: settlements.totalWinners,
        totalPayout: settlements.totalPayout.toString(),
        totalBetAmount: settlements.round.totalBetAmount.toString(),
        gameId: settlements.round.gameId,
      },
      metadata: { engine: 'round-lifecycle' },
    });

    // Accrue house-earnings commissions for the admins assigned to this game.
    try {
      await this.accrueHouseCommission(settlements.round.gameId, roundId);
    } catch (err) {
      this.logger.warn(`Commission accrual failed for round ${roundId}: ${err.message}`);
    }

    return {
      round: settlements.round,
      totalWinners: settlements.totalWinners,
      totalPayout: settlements.totalPayout,
      revealedSeed,
    };
  }

  // ----------------------------------------------------------
  // Round queries & creation
  // ----------------------------------------------------------

  async getCurrentRound(gameId: string): Promise<GameRound | null> {
    return this.prisma.gameRound.findFirst({
      where: { gameId, status: { notIn: ['settled', 'closed'] } },
      orderBy: [{ roundNumber: 'desc' }],
    });
  }

  /**
   * Creates the next round AND commits its fair seed before betting opens.
   * Returns the round with its committed seed bundle.
   */
  async createNextRound(
    gameId: string,
    preferredClientSeed?: string,
  ): Promise<{ round: GameRound; seed: SeedBundle }> {
    const latestRound = await this.prisma.gameRound.findFirst({
      where: { gameId },
      orderBy: { roundNumber: 'desc' },
    });
    const nextNumber = (latestRound?.roundNumber ?? 0) + 1;

    const round = await this.prisma.gameRound.create({
      data: { gameId, roundNumber: nextNumber, status: 'upcoming' },
    });

    const seed = await this.seedService.createRoundSeed(gameId, round.id, preferredClientSeed);

    // Bind the committed seed to the round so the commitment can't be swapped.
    await this.prisma.gameRound.update({
      where: { id: round.id },
      data: { seedId: seed.seedId },
    });

    return { round: { ...round, seedId: seed.seedId }, seed };
  }

  // ----------------------------------------------------------
  // Cleanup & maintenance
  // ----------------------------------------------------------

  async cleanupExpired(): Promise<{
    closedBetting: number;
    failedResult: number;
    failedSettlement: number;
  }> {
    const STALE_BUFFER_MS = 30_000;
    const now = new Date();

    const staleBettingOpen = await this.prisma.gameRound.findMany({
      where: {
        status: 'betting_open',
        bettingOpensAt: { not: null, lt: new Date(now.getTime() - 120_000) },
      },
      include: {
        game: {
          include: { configurations: { where: { isActive: true }, take: 1 } },
        },
      },
    });

    let closedBetting = 0;
    for (const round of staleBettingOpen) {
      const config = round.game.configurations[0];
      const bettingDuration = (config?.bettingDurationSeconds ?? 30) * 1000 + STALE_BUFFER_MS;
      if (round.bettingOpensAt && now.getTime() - round.bettingOpensAt.getTime() > bettingDuration) {
        try {
          await this.closeBetting(round.id);
          closedBetting++;
          this.logger.warn(`Force-closed betting for stale round ${round.id}`);
        } catch (err) {
          this.logger.error(`Failed to close betting for round ${round.id}: ${err.message}`);
        }
      }
    }

    const staleBettingClosed = await this.prisma.gameRound.findMany({
      where: { status: 'betting_closed', closedAt: { lt: new Date(now.getTime() - 60_000) } },
    });

    let failedResult = 0;
    for (const round of staleBettingClosed) {
      try {
        await this.processResult(round.id);
        failedResult++;
        this.logger.warn(`Force-processed result for stale round ${round.id}`);
      } catch (err) {
        this.logger.error(`Failed to process result for round ${round.id}: ${err.message}`);
      }
    }

    const staleResultProcessing = await this.prisma.gameRound.findMany({
      where: { status: 'result_processing', updatedAt: { lt: new Date(now.getTime() - 300_000) } },
    });

    let failedSettlement = 0;
    for (const round of staleResultProcessing) {
      try {
        await this.settleRound(round.id);
        failedSettlement++;
        this.logger.warn(`Force-settled stale round ${round.id}`);
      } catch (err) {
        // Never leave money in limbo: refund every pending bet in the round.
        await this.refundRoundBets(round.id, `Forced close after settlement failure: ${err.message}`);
        failedSettlement++;
        this.logger.error(`Failed to settle round ${round.id}, refunded pending bets: ${err.message}`);
      }
    }

    return { closedBetting, failedResult, failedSettlement };
  }

  /**
   * Refunds all pending bets in a round and marks it closed. Used as a
   * safety net for rounds that can never settle (missing seed, crash,
   * repeated driver errors). Runs in one transaction; every refund uses
   * its own idempotent ledger key.
   */
  async refundRoundBets(roundId: string, reason: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await this.lockRound(tx, roundId);
      if (locked.status === 'settled') return 0;

      const round = await tx.gameRound.findUnique({
        where: { id: roundId },
        include: { bets: { where: { status: 'pending' } } },
      });
      if (!round) throw new NotFoundException(`Round ${roundId} not found`);

      let refunded = 0;
      for (const bet of round.bets) {
        const walletRows = await tx.$queryRaw<
          { id: string; coinBalance: Decimal; totalCoinsEarned: Decimal }[]
        >`SELECT id, "coinBalance", "totalCoinsEarned" FROM wallet_accounts WHERE "playerId" = ${bet.playerId} FOR UPDATE`;
        if (!walletRows || walletRows.length === 0) continue;

        const wallet = walletRows[0];
        const newBalance = new Decimal(wallet.coinBalance).add(bet.amount);
        const txRef = `bet_refund_${bet.id}`;

        try {
          await tx.walletTransaction.create({
            data: {
              walletAccountId: wallet.id,
              playerId: bet.playerId,
              type: 'bet_refund',
              currency: 'coins',
              amount: bet.amount,
              balanceBefore: wallet.coinBalance,
              balanceAfter: newBalance,
              referenceType: 'game_round',
              referenceId: round.id,
              description: `Refund: ${reason}`,
              idempotencyKey: txRef,
              metadata: JSON.stringify({ betId: bet.id }),
            },
          });
        } catch (e: unknown) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            continue; // already refunded in a prior retry
          }
          throw e;
        }

        await tx.walletAccount.update({
          where: { id: wallet.id },
          data: {
            coinBalance: newBalance,
            totalCoinsEarned: new Decimal(wallet.totalCoinsEarned).add(bet.amount),
          },
        });

        await tx.gameBet.update({
          where: { id: bet.id },
          data: { status: 'refunded', settledAt: new Date() },
        });
        refunded++;
      }

      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: refunded > 0 ? 'closed' : locked.status === 'result_processing' ? 'closed' : locked.status,
          updatedAt: new Date(),
        },
      });

      if (refunded > 0) {
        this.logger.warn(`Refunded ${refunded} pending bets in round ${roundId}`);
      }
      return refunded;
    });
  }

  // ----------------------------------------------------------
  // Admin lifecycle levers
  // ----------------------------------------------------------

  /**
   * Admin override: force a stuck round to produce its result. Advances
   * the round through start-betting / close-betting as needed, records an
   * audit trail, and reuses the committed fair seed (never re-derives it).
   */
  async forceResultForRound(
    roundId: string,
    gameId: string,
    adminId: string,
  ): Promise<{ round: GameRound; payload: RoundPayload }> {
    const row = await this.prisma.gameRound.findUnique({ where: { id: roundId } });
    if (!row) throw new NotFoundException(`Round ${roundId} not found`);
    if (row.gameId !== gameId) throw new NotFoundException(`Round ${roundId} not found under game ${gameId}`);

    if (row.status === 'upcoming') {
      await this.startBetting(roundId);
    }
    if (row.status === 'betting_open') {
      await this.closeBetting(roundId);
    }

    const current = await this.prisma.gameRound.findUnique({ where: { id: roundId } });
    if (current.status === 'result_processing') {
      throw new ConflictException('Round already has a result');
    }
    if (current.status !== 'betting_closed') {
      throw new BadRequestException(`Cannot force result from status ${current.status}`);
    }

    const result = await this.processResult(roundId);

    await this.auditService.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'round.force_result',
      entityType: 'GameRound',
      entityId: roundId,
      metadata: { gameId: row.gameId },
    });

    return result;
  }

  /**
   * Admin override: force a stuck round to settle (generates the result
   * first if needed, then credits winners atomically).
   */
  async forceSettleRound(
    roundId: string,
    gameId: string,
    adminId: string,
  ): Promise<{ round: GameRound; totalWinners: number; totalPayout: Decimal; revealedSeed: SeedBundle }> {
    const row = await this.prisma.gameRound.findUnique({ where: { id: roundId } });
    if (!row) throw new NotFoundException(`Round ${roundId} not found`);
    if (row.gameId !== gameId) throw new NotFoundException(`Round ${roundId} not found under game ${gameId}`);

    if (row.status === 'upcoming') {
      await this.startBetting(roundId);
    }
    if (row.status === 'betting_open') {
      await this.closeBetting(roundId);
    }

    const current = await this.prisma.gameRound.findUnique({ where: { id: roundId } });
    if (current.status === 'betting_closed') {
      await this.processResult(roundId);
    } else if (current.status !== 'result_processing') {
      throw new BadRequestException(`Cannot force settle from status ${current.status}`);
    }

    const result = await this.settleRound(roundId);

    await this.auditService.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'round.force_settle',
      entityType: 'GameRound',
      entityId: roundId,
      after: {
        totalPayout: result.totalPayout.toString(),
        totalWinners: result.totalWinners,
        gameId: row.gameId,
      },
    });

    return result;
  }

  /**
   * Admin override: refund every pending bet in a round and close it.
   */
  async adminRefundRound(
    roundId: string,
    gameId: string,
    reason: string,
    adminId: string,
  ): Promise<number> {
    const row = await this.prisma.gameRound.findUnique({ where: { id: roundId } });
    if (!row) throw new NotFoundException(`Round ${roundId} not found`);
    if (row.gameId !== gameId) throw new NotFoundException(`Round ${roundId} not found under game ${gameId}`);

    const refunded = await this.refundRoundBets(roundId, reason);

    await this.auditService.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'round.refunded',
      entityType: 'GameRound',
      entityId: roundId,
      metadata: { refunded, reason },
    });

    return refunded;
  }

  // ----------------------------------------------------------
  // Commission producer (house-earnings → assigned admins)
  // ----------------------------------------------------------

  /**
   * Accrues an AdminCommission for every admin with an active subscription
   * assigned to the game, from this round's house earnings
   * (totalBetAmount − totalPayout). Keyed by [adminId, gameId, month] so
   * re-settlement or retries never double-count: increments are idempotent.
   */
  async accrueHouseCommission(gameId: string, roundId: string): Promise<number> {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
      select: { gameId: true, totalBetAmount: true, totalPayout: true, settledAt: true },
    });
    if (!round || !round.settledAt) return 0;

    const houseEarnings = new Decimal(round.totalBetAmount).sub(round.totalPayout);
    if (houseEarnings.lte(0)) return 0;

    const assignments = await this.prisma.adminGame.findMany({
      where: { gameId: round.gameId },
      select: { adminId: true },
    });
    if (assignments.length === 0) return 0;

    const subs = await this.prisma.adminSubscription.findMany({
      where: { adminId: { in: assignments.map((a) => a.adminId) }, status: 'active', accessExpiresAt: { gt: new Date() } },
      include: { plan: { select: { commissionRate: true } } },
    });
    if (subs.length === 0) return 0;

    const settled = round.settledAt;
    const periodStart = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    let accrued = 0;
    for (const sub of subs) {
      const rate = sub.plan.commissionRate ? new Decimal(sub.plan.commissionRate) : new Decimal(0);
      if (rate.lte(0)) continue;
      const commissionAmount = houseEarnings.mul(rate).div(100);

      await this.prisma.adminCommission.upsert({
        where: {
          adminId_gameId_periodStart_periodEnd: {
            adminId: sub.adminId,
            gameId: round.gameId,
            periodStart,
            periodEnd,
          },
        },
        create: {
          adminId: sub.adminId,
          gameId: round.gameId,
          periodStart,
          periodEnd,
          turnover: round.totalBetAmount,
          houseEarnings,
          commissionRate: rate,
          commissionAmount,
          currency: 'coins',
          status: 'pending',
        },
        update: {
          turnover: { increment: round.totalBetAmount },
          houseEarnings: { increment: houseEarnings },
          commissionRate: rate,
          commissionAmount: { increment: commissionAmount },
        },
      });
      accrued++;
    }

    if (accrued > 0) {
      this.logger.log(
        `Accrued commissions for round ${roundId}: house earnings ${houseEarnings} across ${accrued} admin(s)`,
      );
    }
    return accrued;
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private async lockRound(tx: Prisma.TransactionClient, roundId: string): Promise<GameRound> {
    const rows = await tx.$queryRaw<GameRound[]>`SELECT * FROM game_rounds WHERE id = ${roundId} FOR UPDATE`;
    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }
    return rows[0];
  }

  private ensureValidTransition(currentStatus: string, targetStatus: string): void {
    const allowed = this.VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new ConflictException(`Invalid state transition: ${currentStatus} → ${targetStatus}`);
    }
  }

  private resolvePayoutMultiplier(bet: { multiplierSnapshot?: Decimal | null; option: GameOption }, resultData: Record<string, unknown> | null): Decimal {
    // Driver-provided multiplier override (slots) first.
    if (resultData && typeof resultData.multiplier === 'number' && resultData.multiplier > 0) {
      return new Decimal(resultData.multiplier);
    }
    if (bet.multiplierSnapshot) return new Decimal(bet.multiplierSnapshot);
    return new Decimal(bet.option.multiplier);
  }
}