// ============================================================
// ROUND LIFECYCLE SERVICE — Game Round State Machine
// Manages the full lifecycle: upcoming → betting_open →
//   betting_closed → result_processing → settled
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RngService } from './rng.service';
import { GameRound, GameOption, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
    private rngService: RngService,
  ) {}

  // ----------------------------------------------------------
  // State transitions
  // ----------------------------------------------------------

  /**
   * Opens betting for a round. Sets the bettingOpensAt timestamp.
   */
  async startBetting(roundId: string): Promise<GameRound> {
    const round = await this.prisma.gameRound.findUnique({ where: { id: roundId } });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    this.ensureValidTransition(round.status, 'betting_open');

    const now = new Date();

    return this.prisma.gameRound.update({
      where: { id: roundId },
      data: {
        status: 'betting_open',
        bettingOpensAt: now,
        updatedAt: now,
      },
    });
  }

  /**
   * Closes betting for a round. Sets the bettingEndsAt timestamp.
   */
  async closeBetting(roundId: string): Promise<GameRound> {
    const round = await this.prisma.gameRound.findUnique({ where: { id: roundId } });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    this.ensureValidTransition(round.status, 'betting_closed');

    const now = new Date();

    return this.prisma.gameRound.update({
      where: { id: roundId },
      data: {
        status: 'betting_closed',
        bettingEndsAt: now,
        closedAt: now,
        updatedAt: now,
      },
    });
  }

  /**
   * Processes the result for a round:
   *   1. Fetches active game options and config
   *   2. Generates provably fair result via RngService
   *   3. Creates GameResult record
   *   4. Updates round with winner info
   */
  async processResult(roundId: string): Promise<{
    round: GameRound;
    result: { optionId: string; winningLabel: string; resultData: any; seed: string };
  }> {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
      include: {
        game: {
          include: {
            options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
            configurations: { where: { isActive: true }, take: 1 },
          },
        },
      },
    });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    this.ensureValidTransition(round.status, 'result_processing');

    const options = round.game.options;
    if (options.length === 0) {
      throw new BadRequestException('No active options configured for this game');
    }

    const config = round.game.configurations[0];
    const serverSeed = this.rngService.generateServerSeed();
    const clientSeed = this.rngService.generateSeed();
    const nonce = round.roundNumber;

    const { selectedOption, seedUsed } = this.rngService.generateResult(
      options,
      serverSeed,
      nonce,
    );

    const resultData = this.buildResultData(selectedOption, round);

    const gameResult = await this.prisma.$transaction(async (tx) => {
      const result = await tx.gameResult.create({
        data: {
          roundId: round.id,
          optionId: selectedOption.id,
          winningLabel: selectedOption.label,
          resultData,
          seed: seedUsed,
          processedBy: 'system',
          metadata: JSON.stringify({
            serverSeedHash: this.rngService.hashSeed(serverSeed),
            clientSeed,
            nonce,
            configVersion: config?.version ?? null,
          }),
        },
      });

      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          status: 'result_processing',
          winnerId: selectedOption.id,
          winnerLabel: selectedOption.label,
          resultData,
          houseEdge: config?.houseEdge ?? new Decimal(5),
          configVersion: config?.version ?? null,
          updatedAt: new Date(),
        },
      });

      return result;
    });

    return {
      round,
      result: {
        optionId: selectedOption.id,
        winningLabel: selectedOption.label,
        resultData,
        seed: seedUsed,
      },
    };
  }

  /**
   * Settles all bets for a round:
   *   1. Identifies winning and losing bets
   *   2. Calculates payouts based on multiplier and house edge
   *   3. Creates GameSettlement records
   *   4. Credits winners via wallet transactions
   *   5. Updates round totals and marks as settled
   */
  async settleRound(roundId: string): Promise<{
    round: GameRound;
    totalWinners: number;
    totalPayout: Decimal;
  }> {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
      include: {
        game: {
          include: {
            configurations: { where: { isActive: true }, take: 1 },
          },
        },
        bets: {
          include: { option: true },
        },
        result: true,
      },
    });

    if (!round) {
      throw new NotFoundException(`Round ${roundId} not found`);
    }

    if (round.status !== 'result_processing') {
      throw new BadRequestException(
        `Round must be in result_processing status to settle. Current: ${round.status}`,
      );
    }

    if (!round.result) {
      throw new BadRequestException('Round has no result to settle against');
    }

    const winnerOptionId = round.result.optionId;
    const houseEdge = round.game.configurations[0]?.houseEdge ?? new Decimal(5);
    const houseEdgeMultiplier = new Decimal(1).minus(houseEdge.dividedBy(100));

    const winnerBets = round.bets.filter((b) => b.optionId === winnerOptionId && b.status === 'pending');
    const loserBets = round.bets.filter((b) => b.optionId !== winnerOptionId && b.status === 'pending');

    const settlements = await this.prisma.$transaction(async (tx) => {
      // Mark losing bets
      if (loserBets.length > 0) {
        await tx.gameBet.updateMany({
          where: { id: { in: loserBets.map((b) => b.id) } },
          data: { status: 'lost', settledAt: new Date() },
        });
      }

      // Process winning bets — create settlements and credit wallets
      const settlementRecords: any[] = [];
      let totalPayout = new Decimal(0);

      for (const bet of winnerBets) {
        const multiplier = bet.multiplierSnapshot
          ? new Decimal(bet.multiplierSnapshot)
          : new Decimal(bet.option.multiplier);
        const rawPayout = bet.amount.mul(multiplier);
        const payout = rawPayout.mul(houseEdgeMultiplier);

        // Create settlement
        const settlement = await tx.gameSettlement.create({
          data: {
            roundId: round.id,
            betId: bet.id,
            playerId: bet.playerId,
            payout,
            status: 'pending',
          },
        });

        // Credit wallet
        const wallet = await tx.walletAccount.findUnique({
          where: { playerId: bet.playerId },
        });

        if (wallet) {
          const newBalance = wallet.coinBalance.add(payout);
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
              totalCoinsEarned: wallet.totalCoinsEarned.add(payout),
            },
          });

          await tx.gameSettlement.update({
            where: { id: settlement.id },
            data: {
              status: 'completed',
              txRef,
              settledAt: new Date(),
            },
          });

          await tx.gameBet.update({
            where: { id: bet.id },
            data: {
              status: 'won',
              payout,
              settledAt: new Date(),
            },
          });

          totalPayout = totalPayout.add(payout);
          settlementRecords.push(settlement);
        } else {
          // No wallet found — mark settlement as failed
          await tx.gameSettlement.update({
            where: { id: settlement.id },
            data: { status: 'failed' },
          });

          await tx.gameBet.update({
            where: { id: bet.id },
            data: { status: 'won', settledAt: new Date() },
          });
        }
      }

      // Update round totals
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

      return { settlementRecords, totalPayout, totalWinners: winnerBets.length };
    });

    this.logger.log(
      `Round ${roundId} settled: ${settlements.totalWinners} winners, ${settlements.totalPayout} payout`,
    );

    return {
      round,
      totalWinners: settlements.totalWinners,
      totalPayout: settlements.totalPayout,
    };
  }

  // ----------------------------------------------------------
  // Round queries & creation
  // ----------------------------------------------------------

  /**
   * Gets the current active round for a game.
   * Returns the most recent round that is NOT settled or closed.
   */
  async getCurrentRound(gameId: string): Promise<GameRound | null> {
    return this.prisma.gameRound.findFirst({
      where: {
        gameId,
        status: { notIn: ['settled', 'closed'] },
      },
      orderBy: [{ roundNumber: 'desc' }],
    });
  }

  /**
   * Creates the next round for a game.
   * Determines the round number from the latest round, increments by 1.
   */
  async createNextRound(gameId: string): Promise<GameRound> {
    const latestRound = await this.prisma.gameRound.findFirst({
      where: { gameId },
      orderBy: { roundNumber: 'desc' },
    });

    const nextNumber = (latestRound?.roundNumber ?? 0) + 1;

    return this.prisma.gameRound.create({
      data: {
        gameId,
        roundNumber: nextNumber,
        status: 'upcoming',
      },
    });
  }

  // ----------------------------------------------------------
  // Cleanup & maintenance
  // ----------------------------------------------------------

  /**
   * Finds rounds stuck in non-terminal states beyond their expected
   * duration and handles them gracefully.
   *
   * Stuck criteria:
   *   - betting_open with bettingOpensAt older than config.bettingDurationSeconds + buffer
   *   - betting_closed with no result after config.resultProcessingDelayMs + buffer
   *   - result_processing with no settlement after extended timeout
   */
  async cleanupExpired(): Promise<{
    closedBetting: number;
    failedResult: number;
    failedSettlement: number;
  }> {
    const STALE_BUFFER_MS = 30_000; // 30 second grace period
    const now = new Date();

    // 1. Close rounds stuck in betting_open past their deadline
    const staleBettingOpen = await this.prisma.gameRound.findMany({
      where: {
        status: 'betting_open',
        bettingOpensAt: { not: null, lt: new Date(now.getTime() - 120_000) },
      },
      include: {
        game: {
          include: {
            configurations: { where: { isActive: true }, take: 1 },
          },
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

    // 2. Close rounds stuck in betting_closed (no result generated)
    const staleBettingClosed = await this.prisma.gameRound.findMany({
      where: {
        status: 'betting_closed',
        closedAt: { lt: new Date(now.getTime() - 60_000) },
      },
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

    // 3. Mark rounds stuck in result_processing as closed (manual review needed)
    const staleResultProcessing = await this.prisma.gameRound.findMany({
      where: {
        status: 'result_processing',
        updatedAt: { lt: new Date(now.getTime() - 300_000) }, // 5 min stale
      },
    });

    let failedSettlement = 0;
    for (const round of staleResultProcessing) {
      try {
        await this.settleRound(round.id);
        failedSettlement++;
        this.logger.warn(`Force-settled stale round ${round.id}`);
      } catch (err) {
        // If settlement fails, mark as closed for manual review
        await this.prisma.gameRound.update({
          where: { id: round.id },
          data: { status: 'closed', updatedAt: new Date() },
        });
        failedSettlement++;
        this.logger.error(
          `Failed to settle round ${round.id}, marked as closed: ${err.message}`,
        );
      }
    }

    return { closedBetting, failedResult, failedSettlement };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private ensureValidTransition(currentStatus: string, targetStatus: string): void {
    const allowed = this.VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new ConflictException(
        `Invalid state transition: ${currentStatus} → ${targetStatus}`,
      );
    }
  }

  private buildResultData(winningOption: GameOption, round: GameRound): any {
    return {
      winningOptionId: winningOption.id,
      winningOptionName: winningOption.name,
      winningOptionLabel: winningOption.label,
      multiplier: winningOption.multiplier.toString(),
      roundNumber: round.roundNumber,
      processedAt: new Date().toISOString(),
    };
  }
}
