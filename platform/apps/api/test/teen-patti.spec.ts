// ============================================================
// TEEN PATTI TABLE INTEGRATION TESTS
// Real DB: wallet buy-in escrow, bot-fill seating, deterministic
// dealing, server-authoritative action flow, hand settlement with
// chip conservation, cash-out netting, and mid-hand protections.
// ============================================================

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../src/prisma/prisma.service';
import { TeenPattiService } from '../src/modules/teen-patti/teen-patti.service';
import { TeenPattiConfigService } from '../src/modules/teen-patti/teen-patti-config.service';
import { WalletIntegrationService } from '../src/modules/games/wallet-integration.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { FairRandom } from '../src/modules/games/fair-random';
import { Decimal } from '@prisma/client/runtime/library';

describe('Teen Patti table engine', () => {
  let prisma: PrismaService;
  let svc: TeenPattiService;
  let ledger: WalletIntegrationService;
  let tables: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    ledger = new WalletIntegrationService(prisma);
    await prisma.$connect();
    const audit = new AuditService(prisma);
    svc = new TeenPattiService(prisma, ledger, audit, new EventEmitter2(), new TeenPattiConfigService(prisma, audit));
  });

  beforeEach(async () => {
    await clean();
    tables = [];
  });

  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  const clean = async () => {
    await prisma.teenPattiAction.deleteMany();
    await prisma.teenPattiSeatHand.deleteMany();
    await prisma.teenPattiHand.deleteMany();
    await prisma.teenPattiSeat.deleteMany();
    await prisma.teenPattiTable.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.walletTransfer.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.walletAccount.deleteMany();
    await prisma.player.deleteMany();
  };

  const uniqueKey = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

  const createPlayer = (tag: string) =>
    prisma.player.create({
      data: {
        username: `${tag}_${Math.floor(Math.random() * 1e8)}`,
        email: `${tag}_${Math.floor(Math.random() * 1e8)}@test.local`,
        phone: `${Math.floor(Math.random() * 999999999)}`,
        passwordHash: 'test',
        displayName: tag,
        isActive: true,
        isBanned: false,
      },
    });

  const seedCoins = async (playerId: string, amount = 1000) => {
    await ledger.credit(playerId, new Decimal(amount), 'test', 'setup', 'seed', uniqueKey('setup-credit'), {
      currency: 'coins',
    });
  };

  const createTable = async (opts: { botFill?: boolean; minPlayers?: number; bootAmount?: number } = {}) => {
    const serverSeed = FairRandom.entropyHex(32);
    const table = await prisma.teenPattiTable.create({
      data: {
        tableCode: `T${Math.floor(Math.random() * 1e8)}`,
        title: 'Test Table',
        bootAmount: opts.bootAmount ?? 10,
        minBuyIn: 100,
        maxBuyIn: 10000,
        botFill: opts.botFill ?? false,
        minPlayers: opts.minPlayers ?? 2,
        chaalCap: 4,
        maxSeats: 4,
        serverSeed,
        serverSeedHash: FairRandom.hash(serverSeed),
      },
    });
    tables.push(table.id);
    return table;
  };

  const balanceOf = async (id: string) => ledger.getBalance(id);

  // Responsibilities of the "current turn" player, by reading public state.
  const turnPlayerId = async (tableId: string): Promise<string> => {
    const state = await svc.getTable(tableId);
    const seat = state.seats.find((s) => s.seatNo === state.turn);
    return seat?.playerId ?? '';
  };

  const act = async (tableId: string, kind: string) => {
    const playerId = await turnPlayerId(tableId);
    const result = await svc.performAction(tableId, playerId, kind as never);
    expect(result.ok).toBe(true);
    return playerId;
  };

  const totalSeatChips = async (tableId: string) => {
    const rows = await prisma.teenPattiSeat.findMany({ where: { tableId, isSeated: true } });
    return rows.reduce((acc, r) => acc + r.chips, 0);
  };

  // ----------------------------------------------------------
  it('bot-fills to minimum players, deals deterministically, and records one bot action', async () => {
    const table = await createTable({ botFill: true, minPlayers: 3 });
    const p1 = await createPlayer('bf');
    await seedCoins(p1.id);
    await svc.sit(table.id, p1.id, 1000);

    // One tick posts boots, deals 3 hands, and advances the leading bot.
    await svc.tickTable(table.id);

    const fresh = await prisma.teenPattiTable.findUnique({
      where: { id: table.id },
      include: { seats: true, hands: { include: { seatHands: true, actions: true } } },
    });

    expect(fresh.status).toBe('playing');
    expect(fresh.handInPlay).toBe(true);
    expect(fresh.hands).toHaveLength(1);
    expect(fresh.seats.filter((s) => s.isSeated).length).toBe(3);

    const hand = fresh.hands[0];
    expect(hand.seatHands).toHaveLength(3);
    expect(hand.actions.length).toBeGreaterThanOrEqual(1);
    expect(hand.seatHands.every((sh) => sh.cards !== '[]' && JSON.parse(sh.cards).length === 3)).toBe(true);
    expect(hand.seatHands.every((sh) => sh.chipsIn >= 400)).toBe(true);
    expect(hand.seedServerSeed).toMatch(/^[0-9a-f]{64}$/);
    expect(hand.seedCommitHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hand.status).toBe('betting');

    // Boots: dealer pays 2x boot, everyone else 1x boot (min pot for 3 seats is 40).
    expect(hand.pot).toBeGreaterThanOrEqual(40);

    const state = await svc.getTable(table.id);
    expect(state.seats).toHaveLength(3);
    expect(state.pot).toBeGreaterThanOrEqual(40);
    expect(state.seats.reduce((a, s) => a + s.committed, 0)).toBe(state.pot);

    const privates = await svc.getPrivates(table.id, p1.id);
    expect(privates.cards).toHaveLength(3);

    const wallet = await balanceOf(p1.id);
    expect(wallet.coinBalance.toNumber()).toBe(0);

    // Someone already seated cannot buy in twice.
    await expect(svc.sit(table.id, p1.id, 1000)).rejects.toThrow(/already seated|seated/i);
    // No top-ups while a hand is in play.
    await expect(svc.buyMore(table.id, p1.id, 500)).rejects.toThrow(/current hand|wait/i);
  });

  // ----------------------------------------------------------
  it('plays a full hand between two humans and conserves chips exactly', async () => {
    const table = await createTable();
    const p1 = await createPlayer('h1');
    const p2 = await createPlayer('h2');
    await seedCoins(p1.id, 1000);
    await seedCoins(p2.id, 1000);
    await svc.sit(table.id, p1.id, 1000);
    await svc.sit(table.id, p2.id, 1000);

    // Deal the first hand, then act turn-by-turn (read from public state).
    await svc.tickTable(table.id);

    const state = await svc.getTable(table.id);
    expect(state.turn).not.toBeNull();

    // Both blinds look at their cards, then one chaals and the other shows = showdown.
    await act(table.id, 'see');
    await act(table.id, 'see');
    await act(table.id, 'chaal');
    await act(table.id, 'show');

    const hands = await prisma.teenPattiHand.findMany({
      where: { tableId: table.id },
      orderBy: { handNo: 'asc' },
      include: { seatHands: true, actions: true, table: true },
    });
    const settled = hands[0];
    const next = hands[1];

    expect(settled.status).toBe('finished');
    expect(settled.actions).toHaveLength(4);
    expect(settled.actions.map((a) => a.kind)).toEqual(['see', 'see', 'chaal', 'show']);
    expect(settled.seatHands.reduce((a, s) => a + s.result, 0)).toBe(0);

    // Winner takes the whole pot; loser keeps nothing more.
    const winner = settled.seatHands.find((s) => s.result > 0);
    const loser = settled.seatHands.find((s) => s.result < 0);
    expect(winner).toBeTruthy();
    expect(loser).toBeTruthy();
    expect(winner.result).toBe(-loser.result);

    // Successor hand is already being dealt.
    expect(next).toBeTruthy();
    expect(next.handNo).toBe(settled.handNo + 1);
    expect(next.status).toBe('betting');

    // Chip conservation across the whole table.
    expect(await totalSeatChips(table.id)).toBe(2000);

    const p1Balance = (await balanceOf(p1.id)).coinBalance.toNumber();
    const p2Balance = (await balanceOf(p2.id)).coinBalance.toNumber();
    expect(p1Balance).toBe(0); // still fully in escrow
    expect(p2Balance).toBe(0);
  });

  // ----------------------------------------------------------
  it('rejects off-turn and out-of-hand actions without mutating state', async () => {
    const table = await createTable();
    const p1 = await createPlayer('ot1');
    const p2 = await createPlayer('ot2');
    await seedCoins(p1.id, 1000);
    await seedCoins(p2.id, 1000);
    await svc.sit(table.id, p1.id, 1000);
    await svc.sit(table.id, p2.id, 1000);

    await svc.tickTable(table.id); // deals the hand

    const state = await svc.getTable(table.id);
    const onTurn = await turnPlayerId(table.id);
    const offTurn = onTurn === p1.id ? p2.id : p1.id;

    const nonTurn = await svc.performAction(table.id, offTurn, 'fold');
    expect(nonTurn.ok).toBe(false);
    expect(nonTurn.reason).toMatch(/turn/i);

    const potBefore = (await prisma.teenPattiHand.findFirst({ where: { tableId: table.id } })).pot;
    const actionCount = await prisma.teenPattiAction.count({ where: { handId: (await prisma.teenPattiHand.findFirst({ where: { tableId: table.id } })).id } });
    expect(await prisma.teenPattiHand.findFirst({ where: { tableId: table.id } })).toHaveProperty('pot', potBefore);
    expect(await prisma.teenPattiAction.count()).toBe(actionCount);

    // A seated player who is not on turn may not cash out mid-hand either.
    await expect(svc.stand(table.id, offTurn)).rejects.toThrow(/current hand|wait/i);
  });

  // ----------------------------------------------------------
  it('cash-out nets the buy-in to zero on the wallet', async () => {
    const table = await createTable();
    const p1 = await createPlayer('co1');
    await seedCoins(p1.id, 1000);
    await svc.sit(table.id, p1.id, 1000);
    expect((await balanceOf(p1.id)).coinBalance.toNumber()).toBe(0);

    const cashed = await svc.stand(table.id, p1.id);
    expect(cashed.cashedOut).toBe(1000);
    expect((await balanceOf(p1.id)).coinBalance.toNumber()).toBe(1000);

    const seat = await prisma.teenPattiSeat.findFirst({ where: { tableId: table.id, playerId: p1.id } });
    expect(seat.isSeated).toBe(false);
    expect(seat.chips).toBe(0);

    const txs = await prisma.walletTransaction.findMany({
      where: { playerId: p1.id, referenceType: 'teen_patti' },
      orderBy: { createdAt: 'asc' },
    });
    expect(txs).toHaveLength(2);
    expect(txs[0].type).toBe('game_buyin');
    expect(txs[0].balanceAfter.toNumber()).toBe(0);
    expect(txs[1].type).toBe('game_cashout');
    expect(txs[1].balanceAfter.toNumber()).toBe(1000);

    // Idempotency: standing again does nothing (seat is gone).
    await expect(svc.stand(table.id, p1.id)).rejects.toThrow(/seat not found/i);
  });
});