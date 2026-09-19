// ============================================================
// ROUND LIFECYCLE INVARIANT TESTS
// Full game loop against a real PostgreSQL test database:
//   seed committed → betting opens → bets placed atomically →
//   betting closes → result generated from committed seed →
//   settled → fair seed revealed.
// Money conservation: starting balance + credits - debits must
// always equal the final wallet balance.
// ============================================================

import { PrismaService } from '../src/prisma/prisma.service';
import { SeedService } from '../src/modules/games/seed.service';
import { GameDriverRegistry } from '../src/modules/games/drivers/driver.registry';
import { RoundLifecycleService } from '../src/modules/games/round-lifecycle.service';
import { WalletIntegrationService } from '../src/modules/games/wallet-integration.service';
import { GameEngineService } from '../src/modules/games/game-engine.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Round lifecycle invariants', () => {
  let prisma: PrismaService;
  let seedService: SeedService;
  let driverRegistry: GameDriverRegistry;
  let ledger: WalletIntegrationService;
  let roundLifecycle: RoundLifecycleService;
  let engine: GameEngineService;

  let playerId: string;
  let gameId: string;
  let optionIds: string[];

  beforeAll(async () => {
    prisma = new PrismaService();
    seedService = new SeedService(prisma);
    driverRegistry = new GameDriverRegistry();
    ledger = new WalletIntegrationService(prisma);
    const audit = new AuditService(prisma);
    roundLifecycle = new RoundLifecycleService(prisma, seedService, driverRegistry, audit);
    engine = new GameEngineService(prisma, roundLifecycle, ledger, seedService, driverRegistry, audit);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await clean();
    playerId = (await createPlayer('tp_player')).id;
    await ledger.credit(playerId, new Decimal(1000), 'test', 'setup', 'seed', uniqueKey('setup-credit'), {
      currency: 'coins',
    });
    ({ gameId, optionIds } = await createWheelGame());
  });

  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  const clean = async () => {
    await prisma.auditLog.deleteMany();
    await prisma.gameSettlement.deleteMany();
    await prisma.gameBet.deleteMany();
    await prisma.gameResult.deleteMany();
    await prisma.gameSeed.deleteMany();
    await prisma.gameRound.deleteMany();
    await prisma.gameOption.deleteMany();
    await prisma.gameConfiguration.deleteMany();
    await prisma.gameBetConfig.deleteMany();
    await prisma.adminGame.deleteMany();
    await prisma.game.deleteMany();
    await prisma.walletTransfer.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.walletAccount.deleteMany();
    await prisma.player.deleteMany();
  };

  const uniqueKey = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

  const createPlayer = (username: string) =>
    prisma.player.create({
      data: {
        username,
        email: `${username}@test.local`,
        phone: `1${Math.floor(Math.random() * 1000000000)}`,
        passwordHash: 'test',
        isActive: true,
        isBanned: false,
      },
    });

  const createWheelGame = async () => {
    const game = await prisma.game.create({
      data: {
        internalCode: 'greedy_monkey',
        name: 'Greedy Monkey',
        displayName: 'Greedy Monkey',
        status: 'active',
        category: 'wheel',
        gameType: 'spinning',
        configurations: {
          create: {
            houseEdge: new Decimal(5),
            bettingDurationSeconds: 30,
            roundDurationSeconds: 30,
            resultProcessingDelayMs: 1,
            newRoundDelayMs: 1,
          },
        },
        betConfigs: {
          create: {
            denominations: '[100,200]',
            minBet: new Decimal(100),
            maxBet: new Decimal(1000000),
            allowCustomBet: false,
          },
        },
        options: {
          create: [
            { name: 'Banana', label: '🍌', multiplier: new Decimal(2), weight: new Decimal(1), sortOrder: 1 },
            { name: 'Apple', label: '🍎', multiplier: new Decimal(3), weight: new Decimal(1), sortOrder: 2 },
          ],
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    return { gameId: game.id, optionIds: game.options.map((o) => o.id) };
  };

  const betOnEveryOption = async (amount = 100) => {
    const bets = [];
    for (const optionId of optionIds) {
      bets.push(
        await engine.handleBet(playerId, {
          gameId,
          optionId,
          amount,
          idempotencyKey: uniqueKey(`bet-${optionId}`),
        }),
      );
    }
    return bets;
  };

  const balanceOf = (id = playerId) => ledger.getBalance(id);

  // ----------------------------------------------------------
  it('runs a full round end-to-end with money conservation and seed reveal', async () => {
    const { round, seed } = await roundLifecycle.createNextRound(gameId);

    // Commitment hash is published BEFORE betting opens.
    expect(seed.serverSeedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(seed.serverSeed).toBeTruthy();
    const roundRow = await prisma.gameRound.findUnique({ where: { id: round.id } });
    expect(roundRow.status).toBe('upcoming');
    expect(roundRow.seedId).toBe(seed.seedId);

    await roundLifecycle.startBetting(round.id);
    const opened = await prisma.gameRound.findUnique({ where: { id: round.id } });
    expect(opened.status).toBe('betting_open');
    expect(opened.bettingEndsAt).toBeInstanceOf(Date);

    // Bet on every option (this exercises both the win and loss paths).
    const bets = await betOnEveryOption();

    // Duplicate idempotency keys are rejected (replay of a placed bet).
    await expect(
      engine.handleBet(playerId, { gameId, optionId: optionIds[0], amount: 100, idempotencyKey: bets[0].bet.idempotencyKey }),
    ).rejects.toThrow(/conflict|already/i);

    // Bet after close is rejected.
    await roundLifecycle.closeBetting(round.id);
    await expect(
      engine.handleBet(playerId, { gameId, optionId: optionIds[0], amount: 100, idempotencyKey: uniqueKey('late-bet') }),
    ).rejects.toThrow(/closed|available|no longer/i);

    const totalBets = new Decimal(optionIds.length * 100);

    // Process + settle.
    const processed = await engine.processRound(gameId, round.id);

    // Money conservation: balance = 1000 - all bets + winning payout.
    const finalRound = await prisma.gameRound.findUnique({
      where: { id: round.id },
      include: { bets: true, settlements: true, seed: true },
    });

    expect(finalRound.status).toBe('settled');
    expect(finalRound.totalBetAmount.toNumber()).toBe(totalBets.toNumber());
    expect(finalRound.totalPayout.toNumber()).toBe(processed.settlement.totalPayout.toNumber());
    expect(finalRound.bets.every((b) => b.status === 'won' || b.status === 'lost')).toBe(true);
    expect(processed.result.optionId).toBe(finalRound.winnerId);

    // Only the winning bet got a payout row.
    const winnerBet = finalRound.bets.find((b) => b.optionId === finalRound.winnerId);
    expect(winnerBet.status).toBe('won');
    const winnerSettlement = finalRound.settlements.find((s) => s.betId === winnerBet.id);
    expect(winnerSettlement.status).toBe('completed');
    expect(winnerBet.payout.toNumber()).toBeGreaterThan(0);

    // Balance unchanged by the losers, paid exactly the rounded payout.
    const expected = new Decimal(1000).sub(totalBets).add(winnerBet.payout);
    const balance = await balanceOf();
    expect(balance.coinBalance.toNumber()).toBe(expected.toNumber());

    // Fair seed is revealed ONLY post-settlement.
    const revealed = await seedService.revealRoundSeed(round.id);
    expect(revealed.serverSeed).toBe(finalRound.seed.serverSeed);
    expect(finalRound.seed.revealedAt).not.toBeNull();
    expect(finalRound.seed.usedAt).not.toBeNull();
  });

  // ----------------------------------------------------------
  it('cannot advance the same round twice (double-settle protection)', async () => {
    const { round } = await roundLifecycle.createNextRound(gameId);
    await roundLifecycle.startBetting(round.id);
    await betOnEveryOption();
    await engine.processRound(gameId, round.id);

    const settled = await prisma.gameRound.findUnique({ where: { id: round.id } });
    expect(settled.status).toBe('settled');
    const balanceAfterSettle = (await balanceOf()).coinBalance.toNumber();

    // Re-processing attempts conflict.
    await expect(roundLifecycle.closeBetting(round.id)).rejects.toThrow(/transition|conflict/i);
    await expect(roundLifecycle.processResult(round.id)).rejects.toThrow(/transition|conflict/i);
    await expect(roundLifecycle.settleRound(round.id)).rejects.toThrow(/result_processing/i);

    // Balance is untouched by the failed re-settle.
    const balance = await balanceOf();
    expect(balance.coinBalance.toNumber()).toBe(balanceAfterSettle);
  });

  // ----------------------------------------------------------
  it('refunds all pending bets when a round can never settle', async () => {
    const { round } = await roundLifecycle.createNextRound(gameId);
    await roundLifecycle.startBetting(round.id);
    await betOnEveryOption();

    // Simulate a crash mid-processing: round parked in result_processing
    // with still-pending bets and no result written.
    await prisma.gameRound.update({
      where: { id: round.id },
      data: { status: 'result_processing', updatedAt: new Date() },
    });

    const refunded = await roundLifecycle.refundRoundBets(round.id, 'test: forced close');
    expect(refunded).toBe(optionIds.length);

    const finalRound = await prisma.gameRound.findUnique({
      where: { id: round.id },
      include: { bets: true, seed: true },
    });
    expect(finalRound.status).toBe('closed');
    expect(finalRound.bets.every((b) => b.status === 'refunded')).toBe(true);

    // Full refund: balance back to 1000.
    const balance = await balanceOf();
    expect(balance.coinBalance.toNumber()).toBe(1000);

    // Refunding again is a no-op (idempotent replay).
    const again = await roundLifecycle.refundRoundBets(round.id, 'test: replay');
    expect(again).toBe(0);
  });
});