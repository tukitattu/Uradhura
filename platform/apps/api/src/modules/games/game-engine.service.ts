// ============================================================
// GAME ENGINE SERVICE — Orchestrator
// Entry point for all game interactions. Coordinates round
// lifecycle, wallet operations, and bet management.
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoundLifecycleService } from './round-lifecycle.service';
import { WalletIntegrationService } from './wallet-integration.service';
import { SeedService } from './seed.service';
import { GameDriverRegistry } from './drivers/driver.registry';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  Game,
  GameRound,
  GameBet,
  GameOption,
  GameConfiguration,
  GameBetConfig,
  Prisma,
} from '@prisma/client';

@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);

  constructor(
    private prisma: PrismaService,
    private roundLifecycle: RoundLifecycleService,
    private walletService: WalletIntegrationService,
    private seedService: SeedService,
    private driverRegistry: GameDriverRegistry,
    private auditService: AuditService,
  ) {}

  // ----------------------------------------------------------
  // Public API — Player-facing
  // ----------------------------------------------------------

  /**
   * Main entry point for a player placing a bet.
   *
   * Validates all preconditions atomically, then:
   *   1. Debits the player's wallet
   *   2. Creates the GameBet record
   *   3. Returns a confirmation with the bet details
   *
   * @throws NotFoundException  - Game, round, option, or player not found
   * @throws BadRequestException - Game inactive, round not open, insufficient funds, amount out of range
   * @throws ConflictException  - Duplicate idempotency key (already placed)
   */
  async handleBet(
    playerId: string,
    data: {
      gameId: string;
      optionId: string;
      amount: number | Decimal;
      idempotencyKey: string;
    },
  ): Promise<{
    bet: GameBet;
    round: GameRound;
    balanceAfter: Decimal;
  }> {
    // 1. Validate game exists and is active
    const game = await this.prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        configurations: { where: { isActive: true }, take: 1 },
        betConfigs: { take: 1 },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const config = game.configurations[0];

    if (game.status !== 'active') {
      throw new BadRequestException(
        `Game is not active. Current status: ${game.status}`,
      );
    }

    // 2. Validate round is in betting_open state
    const round = await this.roundLifecycle.getCurrentRound(data.gameId);

    if (!round) {
      throw new BadRequestException('No active round available for betting');
    }

    if (round.status !== 'betting_open') {
      throw new BadRequestException(
        `Betting is not open for this round. Current status: ${round.status}`,
      );
    }

    // 3. Validate the option exists and belongs to this game
    const option = await this.prisma.gameOption.findUnique({
      where: { id: data.optionId },
    });

    if (!option) {
      throw new NotFoundException('Game option not found');
    }

    if (option.gameId !== data.gameId) {
      throw new BadRequestException('Option does not belong to this game');
    }

    if (!option.isActive) {
      throw new BadRequestException('This game option is not active');
    }

    // 4. Validate bet amount against config
    const betConfig = game.betConfigs[0];
    const betAmount = new Decimal(data.amount);

    if (betAmount.lte(0)) {
      throw new BadRequestException('Bet amount must be positive');
    }

    if (betConfig) {
      if (betAmount.lt(betConfig.minBet)) {
        throw new BadRequestException(
          `Bet amount ${betAmount} is below the minimum of ${betConfig.minBet}`,
        );
      }

      if (betAmount.gt(betConfig.maxBet)) {
        throw new BadRequestException(
          `Bet amount ${betAmount} exceeds the maximum of ${betConfig.maxBet}`,
        );
      }

      // Check denomination whitelist when custom bets are not allowed
      if (!betConfig.allowCustomBet) {
        const denominations = JSON.parse(betConfig.denominations || '[]') as number[];
        const isAllowedDenomination = denominations.some(
          (d) => new Decimal(d).equals(betAmount),
        );

        if (!isAllowedDenomination) {
          throw new BadRequestException(
            `Bet amount ${betAmount} is not an allowed denomination. Allowed: ${denominations.join(', ')}`,
          );
        }
      }
    }

    // 5. Check for duplicate idempotency key
    const existingBet = await this.prisma.gameBet.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (existingBet) {
      throw new ConflictException('This bet has already been placed');
    }

    // 6. Validate player exists and is active
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (!player.isActive || player.isBanned) {
      throw new BadRequestException('Player account is inactive or banned');
    }

    // 7. Validate balance
    const balance = await this.walletService.getBalance(playerId);

    if (balance.coinBalance.lt(betAmount)) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.coinBalance}, requested: ${betAmount}`,
      );
    }

    // 7b. Enforce the per-player daily loss cap from the active config.
    const maxDailyLoss = config?.maxDailyLossPerPlayer ? new Decimal(config.maxDailyLossPerPlayer) : null;
    if (maxDailyLoss && maxDailyLoss.gt(0)) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [debits, credits] = await Promise.all([
        this.prisma.walletTransaction.aggregate({
          where: {
            playerId,
            currency: 'coins',
            type: 'bet_debit',
            createdAt: { gte: startOfDay },
          },
          _sum: { amount: true },
        }),
        this.prisma.walletTransaction.aggregate({
          where: {
            playerId,
            currency: 'coins',
            type: 'bet_credit',
            createdAt: { gte: startOfDay },
          },
          _sum: { amount: true },
        }),
      ]);
      const netLossToday = new Decimal(debits._sum.amount ?? 0).sub(new Decimal(credits._sum.amount ?? 0));
      if (netLossToday.add(betAmount).gt(maxDailyLoss)) {
        throw new BadRequestException(
          `Daily loss limit reached. Limit: ${maxDailyLoss}, already lost: ${netLossToday}`,
        );
      }
    }

    // 8. Execute atomic bet placement
    const potentialPayout = betAmount.mul(option.multiplier);

    const result = await this.prisma.$transaction(async (tx) => {
      // Re-lock the round row and confirm betting is still open. This
      // serializes against a concurrently-closing scheduler tick, so a
      // bet can never land on an already-closed round.
      const locked = await tx.$queryRaw<
        { id: string; status: string }[]
      >`SELECT id, status FROM game_rounds WHERE id = ${round.id} FOR UPDATE`;
      if (!locked || locked.length === 0) {
        throw new BadRequestException('Round no longer available');
      }
      if (locked[0].status !== 'betting_open') {
        throw new BadRequestException(
          `Betting closed while placing this bet. Current status: ${locked[0].status}`,
        );
      }

      // Debit wallet atomically within THIS transaction so a failed bet
      // creation rolls back the debit too (no ghost debits).
      const { wallet, transaction: walletTx } = await this.walletService.debit(
        playerId,
        betAmount,
        'game_round',
        round.id,
        `Bet on ${option.label} in round #${round.roundNumber}`,
        data.idempotencyKey,
        { tx },
      );

      // Create bet record
      let bet: GameBet;
      try {
        bet = await tx.gameBet.create({
          data: {
            roundId: round.id,
            playerId,
            optionId: data.optionId,
            amount: betAmount,
            potentialPayout,
            status: 'pending',
            multiplierSnapshot: new Decimal(option.multiplier),
            idempotencyKey: data.idempotencyKey,
            txRef: walletTx.id,
            metadata: JSON.stringify({
              gameId: data.gameId,
              gameCode: game.internalCode,
              roundNumber: round.roundNumber,
              optionName: option.name,
            }),
          },
        });
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('This bet has already been placed');
        }
        throw e;
      }

      // Update round total
      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          totalBetAmount: {
            increment: betAmount,
          },
        },
      });

      return { bet, wallet };
    });

    this.logger.log(
      `Bet placed: player=${playerId} game=${game.internalCode} round=${round.roundNumber} option=${option.name} amount=${betAmount}`,
    );

    await this.auditService.log({
      actorId: playerId,
      actorType: 'player',
      action: 'bet.placed',
      entityType: 'GameBet',
      entityId: result.bet.id,
      after: {
        betId: result.bet.id,
        gameId: data.gameId,
        gameCode: game.internalCode,
        roundNumber: round.roundNumber,
        roundId: round.id,
        optionId: data.optionId,
        amount: betAmount.toString(),
      },
      metadata: { txRef: result.bet.txRef },
    });

    return {
      bet: result.bet,
      round,
      balanceAfter: new Decimal(result.wallet.coinBalance),
    };
  }

  // ----------------------------------------------------------
  // Public API — Bet placement (alternate interface)
  // ----------------------------------------------------------

  /**
   * Simplified bet placement that fetches round internally.
   * Used when the caller has only the gameId (not roundId).
   */
  async placeBet(
    playerId: string,
    gameId: string,
    optionId: string,
    amount: number | Decimal,
    idempotencyKey: string,
  ): Promise<{
    bet: GameBet;
    round: GameRound;
    balanceAfter: Decimal;
  }> {
    return this.handleBet(playerId, {
      gameId,
      optionId,
      amount,
      idempotencyKey,
    });
  }

  // ----------------------------------------------------------
  // Round processing pipeline
  // ----------------------------------------------------------

  /**
   * Full round processing pipeline:
   *   1. Close betting
   *   2. Generate result (via game driver + committed fair seed)
   *   3. Settle all bets (reveals fair seed)
   *   4. Commit seed for the next round
   *
   * Called by the scheduler or admin actions.
   */
  async processRound(
    gameId: string,
    roundId: string,
  ): Promise<{
    round: GameRound;
    result: { optionId: string; winningLabel: string; resultData: any };
    settlement: { totalWinners: number; totalPayout: Decimal };
  }> {
    // Validate the round belongs to the game
    const round = await this.prisma.gameRound.findUnique({ where: { id: roundId } });

    if (!round) throw new NotFoundException(`Round ${roundId} not found`);
    if (round.gameId !== gameId) {
      throw new BadRequestException(`Round ${roundId} does not belong to game ${gameId}`);
    }

    // Step 1: Close betting (only if still open — rounds may arrive here
    // from autoProcessClosedRounds already in betting_closed state).
    if (round.status === 'betting_open') {
      await this.roundLifecycle.closeBetting(roundId);
    } else if (round.status !== 'betting_closed') {
      throw new BadRequestException(
        `Round must be betting_open or betting_closed to process. Current: ${round.status}`,
      );
    }

    // Step 2: Generate result via the game driver + committed seed
    const { payload } = await this.roundLifecycle.processResult(roundId);

    // Step 3: Settle bets (reveals the fair seed)
    const settlement = await this.roundLifecycle.settleRound(roundId);

    return {
      round: settlement.round,
      result: {
        optionId: payload.winnerOptionId ?? '',
        winningLabel: payload.winnerLabel,
        resultData: payload.outcomeData,
      },
      settlement: {
        totalWinners: settlement.totalWinners,
        totalPayout: settlement.totalPayout,
      },
    };
  }

  // ----------------------------------------------------------
  // Game state queries
  // ----------------------------------------------------------

  /**
   * Returns the full current state of a game including the
   * active round, configuration, option list, and provably-fair
   * seed commitment for the current round.
   */
  async getGameState(
    gameId: string,
  ): Promise<{
    game: Game;
    currentRound: GameRound | null;
    config: GameConfiguration | null;
    betConfig: GameBetConfig | null;
    options: GameOption[];
    seedState: { serverSeedHash: string; clientSeed: string; nonce: number } | null;
  }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        configurations: { where: { isActive: true }, take: 1 },
        betConfigs: { take: 1 },
        options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!game) throw new NotFoundException('Game not found');

    const currentRound = await this.roundLifecycle.getCurrentRound(gameId);

    let seedState: { serverSeedHash: string; clientSeed: string; nonce: number } | null = null;
    if (currentRound) {
      const seed = await this.prisma.gameSeed.findUnique({
        where: { roundId: currentRound.id },
      });
      if (seed) {
        seedState = {
          serverSeedHash: seed.serverSeedHash,
          clientSeed: seed.clientSeed,
          nonce: seed.nonce,
        };
      }
    }

    return {
      game,
      currentRound,
      config: game.configurations[0] ?? null,
      betConfig: game.betConfigs[0] ?? null,
      options: game.options,
      seedState,
    };
  }

  /**
   * Returns a player's bet history for a specific game.
   */
  async getPlayerBets(
    playerId: string,
    gameId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    bets: (GameBet & { round: GameRound; option: GameOption })[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const roundWhere: Prisma.GameRoundWhereInput = { gameId };

    const [bets, total] = await Promise.all([
      this.prisma.gameBet.findMany({
        where: {
          playerId,
          round: roundWhere,
        },
        include: { round: true, option: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.gameBet.count({
        where: {
          playerId,
          round: roundWhere,
        },
      }),
    ]);

    return {
      bets,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Returns aggregate stats for a player across all games.
   */
  async getPlayerStats(playerId: string): Promise<{
    totalBets: number;
    totalWagered: Decimal;
    totalWon: Decimal;
    netProfit: Decimal;
    winRate: number;
    biggestWin: Decimal;
  }> {
    const bets = await this.prisma.gameBet.findMany({
      where: { playerId },
      select: { amount: true, payout: true, status: true },
    });

    const totalBets = bets.length;
    const totalWagered = bets.reduce(
      (sum, b) => sum.add(new Decimal(b.amount)),
      new Decimal(0),
    );
    const totalWon = bets
      .filter((b) => b.status === 'won' && b.payout)
      .reduce((sum, b) => sum.add(new Decimal(b.payout!)), new Decimal(0));
    const netProfit = totalWon.sub(totalWagered);
    const winRate = totalBets > 0
      ? (bets.filter((b) => b.status === 'won').length / totalBets) * 100
      : 0;
    const biggestWin = bets
      .filter((b) => b.payout)
      .reduce(
        (max, b) => (new Decimal(b.payout!).gt(max) ? new Decimal(b.payout!) : max),
        new Decimal(0),
      );

    return {
      totalBets,
      totalWagered,
      totalWon,
      netProfit,
      winRate: Math.round(winRate * 100) / 100,
      biggestWin,
    };
  }

  // ----------------------------------------------------------
  // Batch operations — called by cron / admin
  // ----------------------------------------------------------

  /**
   * Auto-closes rounds that have exceeded their betting window.
   * Designed to be called by a scheduler (e.g., every 5 seconds).
   */
  async autoCloseExpiredBetting(): Promise<string[]> {
    const now = new Date();

    const staleRounds = await this.prisma.gameRound.findMany({
      where: {
        status: 'betting_open',
        bettingOpensAt: { not: null },
      },
      include: {
        game: {
          include: {
            configurations: { where: { isActive: true }, take: 1 },
          },
        },
      },
    });

    const closedRoundIds: string[] = [];

    for (const round of staleRounds) {
      const config = round.game.configurations[0];
      const bettingDuration = (config?.bettingDurationSeconds ?? 30) * 1000;

      if (
        round.bettingOpensAt &&
        now.getTime() - round.bettingOpensAt.getTime() >= bettingDuration
      ) {
        try {
          await this.roundLifecycle.closeBetting(round.id);
          closedRoundIds.push(round.id);
          this.logger.log(`Auto-closed betting for round ${round.id}`);
        } catch (err) {
          this.logger.error(`Failed to auto-close round ${round.id}: ${err.message}`);
        }
      }
    }

    return closedRoundIds;
  }

  /**
   * Auto-processes and settles rounds in betting_closed state.
   * Designed to be called by a scheduler after autoCloseExpiredBetting.
   */
  async autoProcessClosedRounds(): Promise<
    { roundId: string; success: boolean; error?: string }[]
  > {
    const closedRounds = await this.prisma.gameRound.findMany({
      where: { status: 'betting_closed' },
    });

    const results: { roundId: string; success: boolean; error?: string }[] = [];

    for (const round of closedRounds) {
      try {
        await this.processRound(round.gameId, round.id);
        results.push({ roundId: round.id, success: true });
        this.logger.log(`Auto-processed round ${round.id}`);
      } catch (err) {
        results.push({ roundId: round.id, success: false, error: err.message });
        this.logger.error(`Failed to auto-process round ${round.id}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Full cleanup pass — handles all stuck rounds across all games.
   */
  async runCleanup(): Promise<{
    closedBetting: number;
    failedResult: number;
    failedSettlement: number;
  }> {
    return this.roundLifecycle.cleanupExpired();
  }
}
