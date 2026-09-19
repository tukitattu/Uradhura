/**
 * Round Scheduler Service
 *
 * Manages the automatic lifecycle of all game rounds:
 *   BETTING_OPEN -> BETTING_CLOSED -> RESULT_PROCESSING -> SETTLED -> (new round created)
 */

import prisma from '../config/database';
import { closeBetting, setRoundResult, settleRound, createRound } from './round.service';
import { createAuditLog } from './audit.service';
import logger from '../utils/logger';
import { emitRoundCreated, emitBettingClosed, emitResultSet, emitRoundSettled } from './websocket.service';

const RESULT_PROCESSING_DELAY_MS = 5_000;
const NEW_ROUND_DELAY_MS = 3_000;
const DEFAULT_BETTING_DURATION_S = 30;

const inFlight = new Set<string>();

function pickWinner(options: Array<{ id: string; multiplier: number }>, jackpotWeight = 1.0): string {
  const weights = options.map((o) => {
    const base = 1 / o.multiplier;
    const adjusted = o.multiplier > 10 ? base * jackpotWeight : base;
    return Math.max(adjusted, 0.001);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return options[i].id;
  }
  return options[options.length - 1].id;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOpenRounds() {
  const now = new Date();
  const expiredRounds = await prisma.gameRound.findMany({
    where: { status: 'BETTING_OPEN', bettingEndsAt: { lte: now } },
    include: {
      game: {
        include: {
          options: { where: { isActive: true } },
          configurations: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  for (const round of expiredRounds) {
    if (inFlight.has(round.id)) continue;
    inFlight.add(round.id);

    (async () => {
      try {
        logger.info(`[Scheduler] Closing betting: round ${round.roundNumber} (${round.game.slug})`);
        await closeBetting(round.id);
        emitBettingClosed(round.gameId, round.id);

        const options = round.game.options;
        if (!options.length) return;

        const jackpotWeight = round.game.configurations[0]?.jackpotWeight ?? 1.0;
        const winnerId = pickWinner(options, jackpotWeight);
        await setRoundResult(round.id, winnerId, { source: 'scheduler', ts: Date.now() }, 'system');
        logger.info(`[Scheduler] Result set: round ${round.roundNumber}, winner=${winnerId}`);

        // Fetch the winner option label for the WebSocket event
        const winnerOption = options.find((o) => o.id === winnerId);
        emitResultSet(round.gameId, round.id, {
          winnerId,
          winningOptionLabel: winnerOption?.label ?? '',
          resultData: JSON.stringify({ source: 'scheduler', ts: Date.now() }),
        });

        await delay(RESULT_PROCESSING_DELAY_MS);
        const settlement = await settleRound(round.id);
        logger.info(`[Scheduler] Settled: round ${round.roundNumber}, ${settlement.settled} bets, payout=${settlement.totalPayout}`);
        emitRoundSettled(round.gameId, round.id, {
          winnerId,
          totalPayout: settlement.totalPayout,
          settledBets: settlement.settled,
        });

        await delay(NEW_ROUND_DELAY_MS);
        const newRoundConfig = await prisma.gameConfiguration.findFirst({
          where: { gameId: round.gameId, isActive: true },
        });
        const newRoundConfigData = newRoundConfig?.configData ? JSON.parse(newRoundConfig.configData as string) : {};
        const newRoundDuration = newRoundConfigData.bettingDurationSeconds ?? DEFAULT_BETTING_DURATION_S;
        await createRound(round.gameId, newRoundDuration);
        logger.info(`[Scheduler] New round created for ${round.game.slug}`);

        // Emit WebSocket event for the new round
        const newRound = await prisma.gameRound.findFirst({
          where: { gameId: round.gameId, status: 'BETTING_OPEN' },
          orderBy: { createdAt: 'desc' },
        });
        if (newRound) {
          emitRoundCreated(round.gameId, {
            roundId: newRound.id,
            roundNumber: newRound.roundNumber,
            bettingEndsAt: newRound.bettingEndsAt?.toISOString() ?? '',
          });
        }
      } catch (err) {
        logger.error(`[Scheduler] Error on round ${round.id}:`, err);
        await createAuditLog({
          action: 'SCHEDULER_ERROR',
          entityType: 'round',
          entityId: round.id,
          after: { error: (err as Error).message },
        });
      } finally {
        inFlight.delete(round.id);
      }
    })();
  }
}

async function ensureActiveRounds() {
  const games = await prisma.game.findMany({ where: { isActive: true }, select: { id: true, slug: true } });
  for (const game of games) {
    const active = await prisma.gameRound.findFirst({
      where: { gameId: game.id, status: { in: ['BETTING_OPEN', 'BETTING_CLOSED', 'RESULT_PROCESSING'] } },
    });
    if (!active) {
      try {
        const gameConfig = await prisma.gameConfiguration.findFirst({
          where: { gameId: game.id, isActive: true },
        });
        const gameConfigData = gameConfig?.configData ? JSON.parse(gameConfig.configData as string) : {};
        const gameDuration = gameConfigData.bettingDurationSeconds ?? DEFAULT_BETTING_DURATION_S;
        await createRound(game.id, gameDuration);
        logger.info(`[Scheduler] Created initial round for ${game.slug}`);

        // Emit WebSocket event for the new initial round
        const newRound = await prisma.gameRound.findFirst({
          where: { gameId: game.id, status: 'BETTING_OPEN' },
          orderBy: { createdAt: 'desc' },
        });
        if (newRound) {
          emitRoundCreated(game.id, {
            roundId: newRound.id,
            roundNumber: newRound.roundNumber,
            bettingEndsAt: newRound.bettingEndsAt?.toISOString() ?? '',
          });
        }
      } catch (err) {
        logger.error(`[Scheduler] Failed to create round for ${game.slug}:`, err);
      }
    }
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (schedulerInterval) return;
  logger.info('[Scheduler] Starting...');
  ensureActiveRounds().catch((err) => logger.error('[Scheduler] init error:', err));
  schedulerInterval = setInterval(() => {
    processOpenRounds().catch((err) => logger.error('[Scheduler] poll error:', err));
  }, 1_000);
  setInterval(() => {
    ensureActiveRounds().catch((err) => logger.error('[Scheduler] ensure error:', err));
  }, 30_000);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[Scheduler] Stopped.');
  }
}
