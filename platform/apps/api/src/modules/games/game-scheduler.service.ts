// ============================================================
// GAME SCHEDULER SERVICE — drives every active game continuously
// State machine per game:
//   upcoming →(start)→ betting_open →(deadline)→ betting_closed
//   →(result delay)→ result_processing →(settle)→ settled
//   →(newRoundDelay)→ next upcoming round…
// Emits realtime events via GameGateway so the UI animates from
// SERVER state, never from a frontend timeline.
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RoundLifecycleService } from './round-lifecycle.service';
import { GameDriverRegistry } from './drivers/driver.registry';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameRound } from '@prisma/client';

export const GAME_EVENTS = {
  round_started: 'game.round_started',
  round_closed: 'game.round_closed',
  round_result: 'game.round_result',
  round_settled: 'game.round_settled',
  bet_placed: 'game.bet_placed',
};

@Injectable()
export class GameSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(GameSchedulerService.name);
  private readonly ROUND_TICK_MS = 1000;
  private readonly engineVersion = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly roundLifecycle: RoundLifecycleService,
    private readonly driverRegistry: GameDriverRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    // Immediately rehydrate all active games so rounds resume after a restart.
    this.rehydrate().then(() => {
      this.logger.log(`Game engine v${this.engineVersion} rehydrated active games`);
    });
  }

  /**
   * Ensures every active game has exactly one live round in flight.
   * Runs on a 1s interval.
   */
  @Interval('game-engine-tick', 1000)
  async tick(): Promise<void> {
    try {
      const activeGames = await this.prisma.game.findMany({
        where: { status: 'active' },
        select: { id: true, internalCode: true },
      });
      for (const game of activeGames) {
        await this.advanceGame(game.id, game.internalCode);
      }
    } catch (err) {
      this.logger.error(`Engine tick failed: ${err.message}`);
    }
  }

  private async advanceGame(gameId: string, internalCode: string): Promise<void> {
    // Skip games with no registered driver — they can't compute results yet.
    if (!this.driverRegistry.has(internalCode)) return;

    const current = await this.roundLifecycle.getCurrentRound(gameId);

    // No round in flight → create + commit seed + open betting.
    if (!current) {
      await this.createAndOpenRound(gameId);
      return;
    }

    const config = await this.prisma.gameConfiguration.findFirst({
      where: { gameId, isActive: true },
    });
    const bettingMs = (config?.bettingDurationSeconds ?? 30) * 1000;
    const resultDelayMs = config?.resultProcessingDelayMs ?? 3000;
    const newRoundDelayMs = config?.newRoundDelayMs ?? 3000;

    switch (current.status) {
      case 'upcoming': {
        await this.roundLifecycle.startBetting(current.id);
        this.eventEmitter.emit(GAME_EVENTS.round_started, { gameId, round: current });
        break;
      }
      case 'betting_open': {
        const openedAt = current.bettingOpensAt?.getTime() ?? Date.now();
        if (Date.now() - openedAt >= bettingMs) {
          const closed = await this.roundLifecycle.closeBetting(current.id);
          this.eventEmitter.emit(GAME_EVENTS.round_closed, { gameId, round: closed });
        }
        break;
      }
      case 'betting_closed': {
        const closedAt = current.closedAt?.getTime() ?? Date.now();
        if (Date.now() - closedAt >= resultDelayMs) {
          // Generates the driver outcome + stores it (status → result_processing).
          await this.roundLifecycle.processResult(current.id);
        }
        break;
      }
      case 'result_processing': {
        const processedAt = current.updatedAt?.getTime() ?? current.createdAt?.getTime() ?? Date.now();
        if (Date.now() - processedAt >= newRoundDelayMs) {
          await this.settleAndOpenNext(current);
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Settles the round (reveals the fair seed) then commits + opens the
   * NEXT round. Result + settlement are broadcast as ONE authoritative
   * event so the UI animates strictly from server state.
   */
  private async settleAndOpenNext(round: GameRound): Promise<void> {
    const settlement = await this.roundLifecycle.settleRound(round.id);

    const resultData = round.resultData ? JSON.parse(round.resultData) : {};
    const result = await this.prisma.gameResult.findUnique({ where: { roundId: round.id } });

    this.eventEmitter.emit(GAME_EVENTS.round_result, {
      gameId: round.gameId,
      roundId: round.id,
      roundNumber: round.roundNumber,
      winningOptionId: round.winnerId,
      winningLabel: round.winnerLabel,
      resultData,
      roundsByPlayer:
        resultData && typeof resultData === 'object'
          ? (resultData as Record<string, unknown>)
          : {},
      serverSeedHash: settlement.revealedSeed.serverSeedHash,
      clientSeed: settlement.revealedSeed.clientSeed,
      nonce: settlement.revealedSeed.nonce,
      revealedServerSeed: settlement.revealedSeed.serverSeed,
      totalPayout: settlement.totalPayout.toString(),
      totalWinners: settlement.totalWinners,
      formattedResult: result?.resultData ?? null,
    });

    // Commit + open the NEXT round so the game never stops.
    await this.createAndOpenRound(round.gameId);
  }

  private async createAndOpenRound(gameId: string): Promise<void> {
    const { round, seed } = await this.roundLifecycle.createNextRound(gameId);
    const opened = await this.roundLifecycle.startBetting(round.id);
    this.eventEmitter.emit(GAME_EVENTS.round_started, {
      gameId,
      round: opened,
      seedState: {
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce: seed.nonce,
      },
    });
  }

  /**
   * Restarts interrupted rounds on boot: any round stuck in an active
   * (non-terminal) state longer than its config window is force-advanced.
   */
  private async rehydrate(): Promise<void> {
    try {
      await this.roundLifecycle.cleanupExpired();
    } catch (err) {
      this.logger.error(`Rehydrate cleanup failed: ${err.message}`);
    }
  }
}