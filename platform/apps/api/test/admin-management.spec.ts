// ============================================================
// ADMIN MANAGEMENT TESTS — super-admin control plane
// Account CRUD, role grants (super_admin protected), game
// assignments, plans, subscriptions, and the audit trail that
// every mutation must leave behind.
// ============================================================

import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { AdminManagementService } from '../src/modules/admin-management/admin-management.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';

describe('Admin management', () => {
  let prisma: PrismaService;
  let adminMgmt: AdminManagementService;

  let superId: string;
  let targetId: string;
  let roleId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    const audit = new AuditService(prisma);
    adminMgmt = new AdminManagementService(prisma, audit);
    await prisma.$connect();

    const pw = await bcrypt.hash('TestPassword123!', 4);
    const superAdmin = await prisma.adminUser.create({
      data: { username: 'super_t', email: 'super_t@test.local', passwordHash: pw },
    });
    const target = await prisma.adminUser.create({
      data: { username: 'target_t', email: 'target_t@test.local', passwordHash: pw },
    });
    superId = superAdmin.id;
    targetId = target.id;

    const role = await prisma.role.create({
      data: { name: 'viewer', displayName: 'Viewer', isSystem: true },
    });
    roleId = role.id;
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.adminCommission.deleteMany();
    await prisma.adminInvoice.deleteMany();
    await prisma.adminSubscription.deleteMany();
    await prisma.adminPlan.deleteMany();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.adminCommission.deleteMany();
    await prisma.adminInvoice.deleteMany();
    await prisma.adminSubscription.deleteMany();
    await prisma.adminGame.deleteMany();
    await prisma.adminUserRole.deleteMany();
    await prisma.adminPlan.deleteMany();
    await prisma.adminUser.deleteMany();
    await prisma.role.deleteMany();
    await prisma.$disconnect();
  });

  it('updates an admin and records the change in the audit log', async () => {
    await adminMgmt.updateAdmin(targetId, superId, { firstName: 'Target', isActive: false, suspendedReason: 'policy' });

    const admin = await prisma.adminUser.findUnique({ where: { id: targetId } });
    expect(admin.isActive).toBe(false);
    expect(admin.suspendedReason).toBe('policy');
    expect(admin.suspendedAt).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'AdminUser', entityId: targetId, action: 'admin.updated' },
    });
    expect(audit).not.toBeNull();
    expect(audit.actorId).toBe(superId);
    expect(audit.before).toContain('true'); // before.isActive was true
    expect(audit.after).toContain('false');
  });

  it('protects the super_admin role and self-deactivation', async () => {
    // Cannot revoke someone's super_admin role.
    const superRole = await prisma.role.create({
      data: { name: 'super_admin', displayName: 'Super Admin', isSystem: true },
    });
    await prisma.adminUserRole.create({
      data: { adminId: targetId, roleId: superRole.id, grantedBy: superId },
    });

    await expect(adminMgmt.revokeRole(targetId, superRole.id, superId)).rejects.toThrow(/super_admin/i);

    // Cannot deactivate yourself.
    await expect(adminMgmt.updateAdmin(superId, superId, { isActive: false })).rejects.toThrow(/own account/i);
  });

  it('grants roles and assigns games', async () => {
    await adminMgmt.assignRole(targetId, 'viewer', superId);

    const link = await prisma.adminUserRole.findUnique({
      where: { adminId_roleId: { adminId: targetId, roleId } },
    });
    expect(link.grantedBy).toBe(superId);

    const game = await prisma.game.create({
      data: {
        internalCode: `am_${Date.now()}`,
        name: 'Test Game',
        displayName: 'Test Game',
        status: 'active',
      },
    });
    await prisma.adminGame.deleteMany({ where: { adminId: targetId, gameId: game.id } });
    const assigned = await adminMgmt.assignGames(
      targetId,
      [{ gameId: game.id, canView: true, canEdit: true }],
      superId,
    );
    expect(assigned[0].canEdit).toBe(true);

    const detail = await adminMgmt.getAdmin(targetId);
    expect(detail.roles.some((r: any) => r.name === 'viewer')).toBe(true);
    expect(detail.gameAssignments).toHaveLength(1);
  });

  it('creates plans, subscribes admins, and marks invoices paid', async () => {
    const plan = await adminMgmt.createPlan(
      { name: 'Pro', monthlyFeeCents: 4900, commissionRate: 10, features: ['live', 'chat'] },
      superId,
    );

    const { subscription, invoice } = await adminMgmt.subscribeAdmin(targetId, plan.id, superId, {
      notes: 'opening',
    });
    expect(subscription.status).toBe('active');
    expect(subscription.paymentStatus).toBe('unpaid');
    expect(invoice.amountCents).toBe(4900);

    const paid = await adminMgmt.markSubscriptionPaid(subscription.id, superId);
    expect(paid.paymentStatus).toBe('paid');
    expect(paid.lastPaymentAt).not.toBeNull();

    const paidInvoice = await prisma.adminInvoice.findUnique({ where: { id: invoice.id } });
    expect(paidInvoice.status).toBe('paid');

    const subs = await adminMgmt.getSubscription(targetId);
    expect(subs.plan.name).toBe('Pro');
    expect(subs.invoices[0].status).toBe('paid');

    const audits = await prisma.auditLog.count({
      where: { actorId: superId, entityType: { in: ['AdminSubscription', 'AdminPlan', 'AdminInvoice'] } },
    });
    expect(audits).toBeGreaterThanOrEqual(2);
  });

  it('lists admins with a search filter', async () => {
    const result = await adminMgmt.listAdmins({ search: 'target_t' });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].username).toBe('target_t');
    expect(result.meta.total).toBe(1);
  });
});