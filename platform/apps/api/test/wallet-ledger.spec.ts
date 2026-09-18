// ============================================================
// LEDGER INVARIANT TESTS
// The wallet ledger must never lose or create money:
//   1. Balance never goes negative.
//   2. Every mutation is recorded once (idempotency UNIQUE holds
//      under concurrent replays).
//   3. balance = credits - debits (coins and diamonds separately).
//   4. Player-to-player transfers move net-zero (amount + fee on
//      sender, amount on receiver).
// These tests hit a real PostgreSQL test database.
// ============================================================

import { PrismaService } from '../src/prisma/prisma.service';
import { WalletIntegrationService } from '../src/modules/games/wallet-integration.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Wallet ledger invariants', () => {
  let prisma: PrismaService;
  let ledger: WalletIntegrationService;

  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    ledger = new WalletIntegrationService(prisma);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await clean();
    aliceId = await createPlayer('alice_ledger');
    bobId = await createPlayer('bob_ledger');
  });

  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  const clean = async () => {
    await prisma.walletTransfer.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.walletAccount.deleteMany();
    await prisma.player.deleteMany();
  };

  const createPlayer = async (username: string): Promise<string> => {
    const p = await prisma.player.create({
      data: {
        username,
        email: `${username}@test.local`,
        phone: `1${Math.floor(Math.random() * 1000000000)}`,
        passwordHash: 'test',
        isActive: true,
        isBanned: false,
      },
    });
    await prisma.walletAccount.create({ data: { playerId: p.id } });
    return p.id;
  };

  const ledgerRows = (playerId: string) =>
    prisma.walletTransaction.findMany({
      where: { playerId },
      orderBy: { createdAt: 'asc' },
    });

  const datedKey = (label: string) => `${label}-${Date.now()}-${Math.random()}`;

  // ----------------------------------------------------------
  describe('credit / debit math', () => {
    it('credit then debit keeps balance consistent and never negative', async () => {
      await ledger.credit(aliceId, new Decimal(1000), 'test', 'a', 'seed', datedKey('c1'), { currency: 'coins' });
      await ledger.debit(aliceId, new Decimal(400), 'test', 'b', 'spend', datedKey('d1'), { currency: 'coins' });

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(600);

      const rows = await ledgerRows(aliceId);
      expect(rows).toHaveLength(2);
      expect(rows[0].type).toBe('bet_credit');
      expect(rows[1].type).toBe('bet_debit');
      expect(rows[1].balanceAfter.toNumber()).toBe(600);
    });

    it('rejects a debit exceeding the balance (no negative balances)', async () => {
      await ledger.credit(aliceId, new Decimal(100), 'test', 'a', 'seed', datedKey('c2'), { currency: 'coins' });

      await expect(
        ledger.debit(aliceId, new Decimal(101), 'test', 'b', 'overdraft', datedKey('d2'), { currency: 'coins' }),
      ).rejects.toThrow(/Insufficient balance/i);

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(100);
      const rows = await ledgerRows(aliceId);
      expect(rows).toHaveLength(1);
    });

    it('rejects non-positive amounts', async () => {
      await expect(ledger.debit(aliceId, 0, 'test', 'x', 'zero', datedKey('d3'), { currency: 'coins' })).rejects.toThrow(/positive/i);
      await expect(ledger.credit(aliceId, -5, 'test', 'x', 'neg', datedKey('c3'), { currency: 'coins' })).rejects.toThrow(/positive/i);
    });

    it('tracks coins and diamonds independently', async () => {
      await ledger.credit(aliceId, new Decimal(500), 'test', 'a', 'coins', datedKey('c4'), { currency: 'coins' });
      await ledger.credit(aliceId, new Decimal(700), 'test', 'b', 'diamonds', datedKey('c5'), { currency: 'diamonds' });

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(500);
      expect(w.diamondBalance.toNumber()).toBe(700);
    });
  });

  // ----------------------------------------------------------
  describe('idempotency', () => {
    it('replaying the same idempotency key returns the same row without double-crediting', async () => {
      const key = datedKey('cc1');

      await ledger.credit(aliceId, new Decimal(250), 'test', 'a', 'first', key, { currency: 'coins' });
      const replay = await ledger.credit(aliceId, new Decimal(250), 'test', 'a', 'replay', key, { currency: 'coins' });

      expect(replay.transaction.idempotencyKey).toBe(key);
      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(250);
      expect((await ledgerRows(aliceId)).length).toBe(1);
    });

    it('concurrent replays of the same key credit the balance exactly once', async () => {
      const key = datedKey('cc2');

      await Promise.allSettled([
        ledger.credit(aliceId, new Decimal(300), 'test', 'a', 'p1', key, { currency: 'coins' }),
        ledger.credit(aliceId, new Decimal(300), 'test', 'a', 'p2', key, { currency: 'coins' }),
        ledger.credit(aliceId, new Decimal(300), 'test', 'a', 'p3', key, { currency: 'coins' }),
      ]);

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(300);
      expect((await ledgerRows(aliceId)).length).toBe(1);
    });

    it('concurrent duplicate debits do not double-spend', async () => {
      await ledger.credit(aliceId, new Decimal(500), 'test', 'a', 'seed', datedKey('cc3'), { currency: 'coins' });
      const key = datedKey('dd1');

      await Promise.allSettled([
        ledger.debit(aliceId, new Decimal(500), 'test', 'b', 'spend1', key, { currency: 'coins' }),
        ledger.debit(aliceId, new Decimal(500), 'test', 'b', 'spend2', key, { currency: 'coins' }),
        ledger.debit(aliceId, new Decimal(500), 'test', 'b', 'spend3', key, { currency: 'coins' }),
      ]);

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(0);
      expect((await ledgerRows(aliceId)).length).toBe(2); // 1 credit + 1 debit
    });
  });

  // ----------------------------------------------------------
  describe('transfers', () => {
    it('moves amount to receiver and fee to sender net balance (conservation)', async () => {
      const txRef = datedKey('tx1');
      // Replace generated char `-` making sure it is unique; ledger keys are long anyway.
      await ledger.credit(aliceId, new Decimal(1000), 'test', 'a', 'seed', datedKey('seed1'), { currency: 'coins' });

      await ledger.transfer(aliceId, bobId, new Decimal(400), 'coins', new Decimal(10), txRef, 'gift to bob');

      const a = await ledger.getBalance(aliceId);
      const b = await ledger.getBalance(bobId);
      // alice paid 400 + 10 fee = 410
      expect(a.coinBalance.toNumber()).toBe(1000 - 410);
      // bob received exactly 400
      expect(b.coinBalance.toNumber()).toBe(400);

      const transfer = await prisma.walletTransfer.findUnique({ where: { txRef } });
      expect(transfer).not.toBeNull();
      expect(transfer.amount.toNumber()).toBe(400);
      expect(transfer.fee.toNumber()).toBe(10);

      const rows = await prisma.walletTransaction.findMany({ where: { playerId: aliceId } });
      const types = rows.map((r) => r.type);
      expect(types).toContain('transfer_send');
      expect(types).toContain('transfer_fee');
      expect(types).not.toContain('transfer_receive');
    });

    it('replaying the same txRef does not move money twice', async () => {
      const txRef = datedKey('tx2');
      await ledger.credit(aliceId, new Decimal(2000), 'test', 'a', 'seed', datedKey('seed2'), { currency: 'coins' });

      await ledger.transfer(aliceId, bobId, new Decimal(500), 'coins', new Decimal(0), txRef, 'once');
      await ledger.transfer(aliceId, bobId, new Decimal(500), 'coins', new Decimal(0), txRef, 'replay');

      const a = await ledger.getBalance(aliceId);
      const b = await ledger.getBalance(bobId);
      expect(a.coinBalance.toNumber()).toBe(1500);
      expect(b.coinBalance.toNumber()).toBe(500);
      expect(await prisma.walletTransfer.count({ where: { txRef } })).toBe(1);
    });

    it('rejects transfer with insufficient balance', async () => {
      await expect(
        ledger.transfer(aliceId, bobId, new Decimal(9999), 'coins', new Decimal(0), datedKey('tx3'), 'nope'),
      ).rejects.toThrow(/Insufficient balance/i);
      const b = await ledger.getBalance(bobId);
      expect(b.coinBalance.toNumber()).toBe(0);
    });
  });

  // ----------------------------------------------------------
  describe('admin adjustments', () => {
    it('credits and debits with audit metadata', async () => {
      await ledger.adjustBalance(aliceId, new Decimal(1000), 'promo', 'admin-1', { currency: 'coins' });
      await ledger.adjustBalance(aliceId, new Decimal(-300), 'clawback', 'admin-1', { currency: 'coins' });

      const w = await ledger.getBalance(aliceId);
      expect(w.coinBalance.toNumber()).toBe(700);

      const rows = await ledgerRows(aliceId);
      expect(rows.every((r) => r.type === 'admin_adjustment')).toBe(true);
      expect(rows.every((r) => r.createdBy === 'admin-1')).toBe(true);
      expect(rows[0].metadata).toContain('"credit"');
      expect(rows[1].metadata).toContain('"debit"');
    });

    it('cannot debit below zero via adjustment', async () => {
      await expect(
        ledger.adjustBalance(aliceId, new Decimal(-1), 'clawback', 'admin-1', { currency: 'coins' }),
      ).rejects.toThrow(/Insufficient balance/i);
    });
  });
});