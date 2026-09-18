// ============================================================
// WITHDRAWAL ENGINE INTEGRATION TESTS
// Dynamic rule enforcement (global/monthly/cooldown/method/auto),
// wallet hold + refund lifecycle, admin review flows with fee +
// partial approval, and super-admin accounting from real ledger rows.
// ============================================================

import { PrismaService } from '../src/prisma/prisma.service';
import { WithdrawalService } from '../src/modules/withdrawals/withdrawal.service';
import { WalletIntegrationService } from '../src/modules/games/wallet-integration.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('Withdrawal engine', () => {
  let prisma: PrismaService;
  let svc: WithdrawalService;
  let ledger: WalletIntegrationService;
  let adminId: string;

  const playerIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    ledger = new WalletIntegrationService(prisma);
    svc = new WithdrawalService(prisma, ledger, new AuditService(prisma), new NotificationsService(prisma));
    await prisma.$connect();
  });

  beforeEach(async () => {
    await clean();
    adminId = (await createAdmin()).id;
    await prisma.withdrawalMethod.createMany({
      data: [
        { methodCode: 'bkash', label: 'bKash', minAccountLength: 1 },
        { methodCode: 'nagad', label: 'Nagad', minAccountLength: 1 },
      ],
    });
    const rule = await svc.getRule();
    await prisma.withdrawalRule.update({
      where: { id: rule.id },
      data: { cooldownHours: 0, timeWindowStart: '00:00', timeWindowEnd: '23:59' },
    });
  });

  afterAll(async () => {
    await clean();
    await prisma.$disconnect();
  });

  const clean = async () => {
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.withdrawalRequest.deleteMany();
    await prisma.playerWithdrawalOverride.deleteMany();
    await prisma.withdrawalMethod.deleteMany();
    await prisma.withdrawalRule.deleteMany();
    await prisma.walletTransfer.deleteMany();
    await prisma.walletTransaction.deleteMany();
    await prisma.walletAccount.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.player.deleteMany();
    playerIds.length = 0;
  };

  const createAdmin = () =>
    prisma.adminUser.create({
      data: { username: `admin_${Math.floor(Math.random() * 1e8)}`, email: `a${Math.floor(Math.random() * 1e8)}@test.local`, passwordHash: 'test' },
    });

  const createPlayer = async (coins = 1000, extra: { kycVerified?: boolean; country?: string; blacklisted?: boolean } = {}) => {
    const player = await prisma.player.create({
      data: {
        username: `w_${Math.floor(Math.random() * 1e8)}`,
        email: `w${Math.floor(Math.random() * 1e8)}@test.local`,
        phone: `${Math.floor(Math.random() * 999999999)}`,
        passwordHash: 'test',
        isActive: true,
        isBanned: false,
        kycVerified: extra.kycVerified ?? false,
        country: extra.country ?? 'BD',
        withdrawalBlacklisted: extra.blacklisted ?? false,
      },
    });
    playerIds.push(player.id);
    await ledger.credit(player.id, new Decimal(coins), 'test', 'setup', 'seed', uniqueKey('setup-credit'), { currency: 'coins' });
    return player;
  };

  const uniqueKey = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

  const balance = async (id: string) => (await ledger.getBalance(id)).coinBalance.toNumber();

  const updateRule = (patch: Record<string, unknown>) => prisma.withdrawalRule.updateMany({ data: patch });

  // ----------------------------------------------------------
  it('requests a withdrawal, holds coins on the wallet, and enforces method/rule limits', async () => {
    await updateRule({ feePercent: 0, autoApproveMaxCoins: 0 });
    const p = await createPlayer();
    const key = uniqueKey('req');

    const res = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXXXXXX', idempotencyKey: key });
    expect(res.request.status).toBe('pending');
    expect(res.alreadyProcessed).toBe(false);
    expect(await balance(p.id)).toBe(700);

    // Replay of the same idempotency key never double-holds.
    const again = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXXXXXX', idempotencyKey: key });
    expect(again.alreadyProcessed).toBe(true);
    expect(again.request.id).toBe(res.request.id);
    expect(await balance(p.id)).toBe(700);

    const hold = await prisma.walletTransaction.findUnique({ where: { id: res.request.holdTxId } });
    expect(hold.type).toBe('withdrawal_hold');
    expect(await prisma.auditLog.count({ where: { entityType: 'WithdrawalRequest', action: 'withdrawal.requested' } })).toBe(1);
    expect(await prisma.notification.count({ where: { playerId: p.id } })).toBe(1);

    // Below the configured minimum: rejected.
    await expect(svc.request(p.id, { amount: 50, methodCode: 'bkash', accountHandle: '01' })).rejects.toThrow(/between/);
    // Disabled method: rejected.
    await prisma.withdrawalMethod.update({ where: { methodCode: 'nagad' }, data: { enabled: false } });
    await expect(svc.request(p.id, { amount: 200, methodCode: 'nagad', accountHandle: '01' })).rejects.toThrow(/disabled/);
    // Globally disabled: rejected.
    await updateRule({ enabled: false });
    await expect(svc.request(p.id, { amount: 200, methodCode: 'bkash', accountHandle: '01' })).rejects.toThrow(/disabled/);
  });

  // ----------------------------------------------------------
  it('enforces the monthly ceiling and honors a per-player override', async () => {
    await updateRule({ maxMonthlyCoins: 500, cooldownHours: 0 });
    const p = await createPlayer();

    await svc.request(p.id, { amount: 400, methodCode: 'bkash', accountHandle: '01XXXXX' });
    await expect(svc.request(p.id, { amount: 200, methodCode: 'bkash', accountHandle: '01XXXXX' })).rejects.toThrow(/Monthly withdrawal limit/);

    // Grant a custom ceiling of 1000 → the 600 total now fits.
    await svc.setOverride(p.id, { maxMonthlyCoins: 1000, note: 'vip' }, adminId);
    await svc.request(p.id, { amount: 200, methodCode: 'bkash', accountHandle: '01XXXXX' });

    const status = await svc.evaluateForPlayer(p.id);
    expect(status.maxMonthlyCoins).toBe(1000);
    expect(status.usedMonthlyCoins).toBe(600);
    expect(status.remainingMonthlyCoins).toBe(400);
  });

  // ----------------------------------------------------------
  it('enforces a cooldown between withdrawals even after a cancel', async () => {
    await updateRule({ cooldownHours: 24, maxMonthlyCoins: 100000 });
    const p = await createPlayer();

    const first = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXX' });
    await svc.cancel(p.id, first.request.id);
    expect(await balance(p.id)).toBe(1000);

    await expect(svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXX' })).rejects.toThrow(/wait/i);

    await updateRule({ cooldownHours: 0 });
    const second = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXX' });
    expect(second.request.status).toBe('pending');
  });

  // ----------------------------------------------------------
  it('auto-approves amounts at or below the threshold', async () => {
    await updateRule({ autoApproveMaxCoins: 200, feePercent: 0 });
    const p = await createPlayer();

    const res = await svc.request(p.id, { amount: 150, methodCode: 'bkash', accountHandle: '01XXXXX' });
    expect(res.autoApproved).toBe(true);
    expect(res.request.status).toBe('auto_approved');
    expect(res.request.reviewedAt).not.toBeNull();
    expect(await balance(p.id)).toBe(850);

    // Above the threshold still queues for review.
    const queued = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXX' });
    expect(queued.autoApproved).toBe(false);
    expect(queued.request.status).toBe('pending');
  });

  // ----------------------------------------------------------
  it('reviews: approve charges the fee, reject refunds everything, partial refunds the difference', async () => {
    await updateRule({ feePercent: 2, autoApproveMaxCoins: 0 });
    const p = await createPlayer(2000);

    // Full approve.
    const a = await svc.request(p.id, { amount: 500, methodCode: 'bkash', accountHandle: '01XXXXX' });
    await svc.review(a.request.id, adminId, { decision: 'approve' });
    const aRow = await prisma.withdrawalRequest.findUnique({ where: { id: a.request.id } });
    expect(aRow.status).toBe('approved');
    expect(aRow.feeCoins).toBe(10);
    expect(aRow.netCoins).toBe(490);
    expect(aRow.amountCurrency.toNumber()).toBe(4.9);
    expect(aRow.reviewedById).toBe(adminId);
    expect(await balance(p.id)).toBe(1500); // still held, nothing refunded
    expect(await prisma.auditLog.count({ where: { action: 'withdrawal.reviewed' } })).toBe(1);

    // Partial approve refunds the un-approved portion.
    const b = await svc.request(p.id, { amount: 500, methodCode: 'bkash', accountHandle: '01XXXXX' });
    const afterB = await balance(p.id);
    expect(afterB).toBe(1000);
    await svc.review(b.request.id, adminId, { decision: 'partial', amount: 300, reason: 'cap' });
    const bRow = await prisma.withdrawalRequest.findUnique({ where: { id: b.request.id } });
    expect(bRow.status).toBe('partially_approved');
    expect(bRow.approvedAmountCoins).toBe(300);
    expect(bRow.feeCoins).toBe(6);
    expect(bRow.netCoins).toBe(294);
    expect(bRow.amountCurrency.toNumber()).toBe(2.94);
    expect(await balance(p.id)).toBe(1200); // 200 of the second hold refunded
    expect(bRow.refundTxId).not.toBeNull();

    // Reject refunds the full hold.
    const c = await svc.request(p.id, { amount: 300, methodCode: 'bkash', accountHandle: '01XXXXX' });
    await svc.review(c.request.id, adminId, { decision: 'reject', reason: 'frozen' });
    const cRow = await prisma.withdrawalRequest.findUnique({ where: { id: c.request.id } });
    expect(cRow.status).toBe('rejected');
    expect(cRow.netCoins).toBe(0);
    expect(await balance(p.id)).toBe(1200); // 300 refunded

    // A player cannot cancel an already-reviewed request.
    await expect(svc.cancel(p.id, a.request.id)).rejects.toThrow(/Cannot cancel/);
    // Refund credits on the ledger match the returned portions.
    const txns = await prisma.walletTransaction.findMany({ where: { playerId: p.id, referenceType: 'withdrawal' } });
    const credit = txns.filter((t) => t.balanceAfter.gt(t.balanceBefore));
    expect(credit.reduce((s, t) => s + t.amount.toNumber(), 0)).toBe(500);
  });

  // ----------------------------------------------------------
  it('super-admin dashboard aggregates real data and flags suspicious pairs; CSV exports', async () => {
    await updateRule({ feePercent: 0, autoApproveMaxCoins: 0 });
    const p1 = await createPlayer(1000);
    const p2 = await createPlayer(1000);

    for (let i = 0; i < 3; i++) {
      const r = await svc.request(p1.id, { amount: 100, methodCode: 'bkash', accountHandle: '01XXXXX' });
      await svc.review(r.request.id, adminId, { decision: 'approve' });
    }
    const r2 = await svc.request(p2.id, { amount: 200, methodCode: 'bkash', accountHandle: '01XXXXX' });
    await svc.review(r2.request.id, adminId, { decision: 'approve', reason: 'ok' });

    const dash = await svc.dashboard({ adminId });

    expect(dash.totals.paid.count).toBe(4);
    expect(dash.totals.paid.coins).toBe(500);
    expect(dash.totals.paid.fiat).toBe(5);
    expect(dash.totals.paid.players).toBe(2);
    expect(dash.totals.rejected.count).toBe(0);
    expect(dash.perAdmin).toHaveLength(1);
    expect(dash.perAdmin[0].approvedCount).toBe(4);
    expect(dash.perAdmin[0].approvedCoins).toBe(500);
    expect(dash.perAdmin[0].playersPaid).toBe(2);

    // Ledger nets: holds (500) - refunds (0) = paid coins.
    expect(dash.ledger.netWithdrawalOut.toNumber()).toBe(500);
    expect(dash.flags.coinsBurnedMatchesPaid).toBeNull();

    // 3 approvals of the same player by the same admin → flagged.
    expect(dash.suspiciousPairs).toHaveLength(1);
    expect(dash.suspiciousPairs[0].count).toBe(3);

    const csv = await svc.exportCsv({});
    const lines = csv.split('\n').filter(Boolean);
    expect(lines.length).toBe(5); // header + 4 rows
    expect(lines[0]).toContain('player_username');
    expect(csv).toContain(',');

    // Month-scoped dashboard links to the current month.
    const current = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const monthDash = await svc.dashboard({ month: current });
    expect(monthDash.totals.paid.count).toBe(4);
  });
});