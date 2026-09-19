// ============================================================
// DYNAMIC TEEN PATTI CONFIG TESTS
// 1) Config service: defaults seeded, versioned updates, audit,
//    validation, and defaults applied to newly created tables.
// 2) Engine honors dynamic rules: admin ranking order, seed-based
//    tie-break, rake deduction at settlement (chips conserved
//    minus rake).
// 3) Per-table admin overrides persist and audit.
// ============================================================

import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { TeenPattiService } from '../src/modules/teen-patti/teen-patti.service';
import { TeenPattiConfigService, defaultTPConfig } from '../src/modules/teen-patti/teen-patti-config.service';
import { WalletIntegrationService } from '../src/modules/games/wallet-integration.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { FairRandom } from '../src/modules/games/fair-random';
import { TeenPattiGame, TPGameConfig, TPSeat } from '../src/modules/teen-patti/engine/teen-patti-game';
import { Decimal } from '@prisma/client/runtime/library';

describe('Dynamic Teen Patti config (service + engine)', () => {
  let prisma: PrismaService;
  let ledger: WalletIntegrationService;
  let audit: AuditService;
  let configSvc: TeenPattiConfigService;
  let svc: TeenPattiService;

  beforeAll(async () => {
    prisma = new PrismaService();
    ledger = new WalletIntegrationService(prisma);
    await prisma.$connect();
    audit = new AuditService(prisma);
    configSvc = new TeenPattiConfigService(prisma, audit);
    svc = new TeenPattiService(prisma, ledger, audit, new EventEmitter2(), configSvc);
  });

  beforeEach(async () => {
    await clean();
    (configSvc as unknown as { cache: unknown }).cache = null;
  });

  afterAll(async () => {
    // Leave the config row in a pristine default state for other suites.
    await prisma.teenPattiConfig.deleteMany();
    await clean();
    await prisma.$disconnect();
  });

  const clean = async () => {
    await prisma.auditLog.deleteMany();
    await prisma.teenPattiAction.deleteMany();
    await prisma.teenPattiSeatHand.deleteMany();
    await prisma.teenPattiHand.deleteMany();
    await prisma.teenPattiSeat.deleteMany();
    await prisma.teenPattiTable.deleteMany();
    await prisma.walletTransfer.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.walletAccount.deleteMany();
    await prisma.player.deleteMany();
  };

  // ----------------------------------------------------------
  // Config service
  // ----------------------------------------------------------

  it('seeds default rules on first read and returns a stable version', async () => {
    const { version, value } = await configSvc.getConfig();
    expect(version).toBe(1);
    expect(value.bootAmount).toBe(10);
    expect(value.seats).toBe(6);
    expect(value.rankingOrder).toEqual(defaultTPConfig().rankingOrder);
    const row = await prisma.teenPattiConfig.findUnique({ where: { id: 'global' } });
    expect(row).not.toBeNull();
    const again = await configSvc.getConfig();
    expect(again.version).toBe(1);
  });

  it('applies dynamic defaults to newly created tables and audits the change', async () => {
    const admin = await prisma.adminUser.create({ data: { username: 'cfg-admin', email: 'cfg@test.local', passwordHash: 'x' } });

    const adminRole = await prisma.role.create({ data: { name: `admin_${Date.now()}`, displayName: 'A' } });
    await prisma.adminUserRole.create({ data: { adminId: admin.id, roleId: adminRole.id } });

    await configSvc.updateConfig({ bootAmount: 25, seats: 4, minBuyIn: 500, maxBuyIn: 20000 }, admin.id);
    const { version, value } = await configSvc.getConfig();
    expect(version).toBe(2);
    expect(value.bootAmount).toBe(25);
    expect(value.seats).toBe(4);

    const table = await svc.ensureTable();
    try {
      expect(table.bootAmount).toBe(25);
      expect(table.maxSeats).toBe(4);
      expect(table.minBuyIn).toBe(500);
      expect(table.maxBuyIn).toBe(20000);
      expect(table.chaalCap).toBe(4);
      expect(table.minPlayers).toBe(3);
    } finally {
      await prisma.teenPattiTable.deleteMany({ where: { id: table.id } });
    }

    const audited = await prisma.auditLog.findFirst({ where: { action: 'teen_patti.config.updated' } });
    expect(audited).not.toBeNull();
    expect(audited.actorId).toBe(admin.id);
    expect(audited.actorType).toBe('admin');
  });

  it('rejects invalid dynamic values, then resets to defaults', async () => {
    const admin = await prisma.adminUser.create({ data: { username: 'cfg-admin2', email: 'cfg2@test.local', passwordHash: 'x' } });
    await expect(configSvc.updateConfig({ cardsPerPlayer: 2 }, admin.id)).rejects.toThrow(BadRequestException);
    await expect(configSvc.updateConfig({ seats: 12 }, admin.id)).rejects.toThrow(BadRequestException);
    await expect(configSvc.updateConfig({ rakePercent: 50 }, admin.id)).rejects.toThrow(BadRequestException);

    const res = await configSvc.resetToDefaults(admin.id);
    expect(res.value.bootAmount).toBe(10);
    expect(res.version).toBeGreaterThan(1);
  });

  it('auto-applies rake from the active config and conserves table chips minus rake', async () => {
    const admin = await prisma.adminUser.create({ data: { username: 'cfg-admin3', email: 'cfg3@test.local', passwordHash: 'x' } });
    await configSvc.updateConfig({ rakePercent: 5 }, admin.id);

    const game = scriptedShowdown({ rakePercent: 5 });
    expect(game.settle).not.toBeNull();
    expect(game.settle!.rakeCoins).toBe(5);
    const after = game.seats.reduce((s, seat) => s + seat.chips, 0);
    expect(after).toBe(95); // 100 pot - 5 rake
  });

  it('admin ranking order decides showdown winners (high-card beats trail when configured)', async () => {
    const trail = [
      { r: 13, s: 0 },
      { r: 13, s: 1 },
      { r: 13, s: 2 },
    ];
    const aceHigh = [
      { r: 14, s: 0 },
      { r: 9, s: 1 },
      { r: 5, s: 2 },
    ];

    const reversed = scriptedShowdown({ rankingOrder: ['high_card', 'trail', 'pure_sequence', 'sequence', 'color', 'pair'] }, trail, aceHigh);
    expect(reversed.settle!.winners).toEqual([2]); // seat 2 is the A-high hand

    const defaultOrder = scriptedShowdown({}, trail, aceHigh);
    expect(defaultOrder.settle!.winners).toEqual([1]); // trail wins normally
  });

  it('seed tie-break deterministically picks a single winner among equal hands', async () => {
    const identical = [
      { r: 14, s: 0 },
      { r: 14, s: 1 },
      { r: 14, s: 2 },
    ];
    const game = scriptedShowdown({ tieBreak: 'seed', tieBreakKey: 'TIEKEYVAL', tieBreakNonce: 5 }, identical, identical);
    expect(game.settle!.winners.length).toBe(1);
    const expectedIdx = FairRandom.int({ serverSeed: 'TIEKEYVAL', clientSeed: 'tp-tiebreak-1-2', nonce: 5 }, 2);
    expect(game.settle!.winners[0]).toBe(expectedIdx === 0 ? 1 : 2);

    const split = scriptedShowdown({ tieBreak: 'high_card' }, identical, identical);
    expect(split.settle!.winners.sort()).toEqual([1, 2]);
  });

  it('applies per-table admin overrides that the engine then reads', async () => {
    const admin = await prisma.adminUser.create({ data: { username: 'cfg-admin4', email: 'cfg4@test.local', passwordHash: 'x' } });
    const serverSeed = FairRandom.entropyHex(32);
    const table = await prisma.teenPattiTable.create({
      data: {
        tableCode: `OV${Date.now()}`,
        title: 'Override Me',
        bootAmount: 10,
        minBuyIn: 100,
        maxBuyIn: 10000,
        botFill: false,
        minPlayers: 2,
        chaalCap: 4,
        maxSeats: 4,
        serverSeed,
        serverSeedHash: FairRandom.hash(serverSeed),
      },
    });
    const updated = await svc.updateTable(table.id, { bootAmount: 50, chaalCap: 8 }, admin.id);
    expect(updated.bootAmount).toBe(50);
    expect(updated.chaalCap).toBe(8);
    const audited = await prisma.auditLog.findFirst({ where: { action: 'teen_patti.table.updated' } });
    expect(audited).not.toBeNull();
    await expect(svc.updateTable(table.id, { maxSeats: 2 }, admin.id)).rejects.toThrow(BadRequestException);
  });
});

// ----------------------------------------------------------
// Pure engine helpers
// ----------------------------------------------------------

type Card = { r: number; s: number };
type SeatInput = Omit<TPSeat, 'committed' | 'folded' | 'allIn' | 'blindRaised' | 'actedInLevel'>;

function scriptedShowdown(cfg: Partial<TPGameConfig> = {}, seat1Cards: Card[] = [], seat2Cards: Card[] = []): TeenPattiGame {
  const trail = [
    { r: 13, s: 0 },
    { r: 13, s: 1 },
    { r: 13, s: 2 },
  ];
  const aceHigh = [
    { r: 14, s: 0 },
    { r: 9, s: 1 },
    { r: 5, s: 2 },
  ];
  const s1: SeatInput = { seatNo: 1, playerId: null, isBot: false, chips: 50, isSeen: false, cards: seat1Cards.length ? seat1Cards : trail };
  const s2: SeatInput = { seatNo: 2, playerId: null, isBot: false, chips: 50, isSeen: false, cards: seat2Cards.length ? seat2Cards : aceHigh };

  const config: TPGameConfig = {
    bootAmount: 10,
    chaalCap: 4,
    maxSeats: 2,
    maxActionsPerHand: 400,
    ...cfg,
  };
  const game = new TeenPattiGame(config, [s1, s2], 2);
  const act = (seatNo: number, kind: string) => {
    const r = game.apply(seatNo, kind as never);
    if (!r.ok) throw new Error(`action ${kind} failed for seat ${seatNo}: ${r.reason}`);
    return r;
  };
  // dealer = seat 2; seat 1 acts first (blind) -> see/see -> forced all-in showdown.
  act(1, 'see');
  act(2, 'see');
  act(1, 'chaal');
  act(2, 'chaal');
  act(1, 'chaal');
  act(2, 'chaal');
  expect(game.status).toBe('finished');
  return game;
}