// ============================================================
// ADMIN MANAGEMENT SERVICE — super-admin control plane
// Manage admin accounts, their assignments to games, the plans
// / subscriptions they pay for, and the commission lifecycle.
// Every mutation is written to the audit log.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminManagementService {
  private readonly logger = new Logger(AdminManagementService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ----------------------------------------------------------
  // ADMIN ACCOUNTS
  // ----------------------------------------------------------

  async listAdmins(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AdminUserWhereInput = query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          suspendedAt: true,
          suspendedReason: true,
          createdBy: true,
          lastLoginAt: true,
          createdAt: true,
          roles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
          gameAssignments: {
            include: { game: { select: { id: true, internalCode: true, displayName: true } } },
          },
          subscription: { include: { plan: { select: { id: true, name: true, commissionRate: true } } } },
        },
      }),
      this.prisma.adminUser.count({ where }),
    ]);

    return {
      data: rows.map(({ roles, gameAssignments, ...rest }) => ({
        ...rest,
        roles: roles.map((r) => r.role),
        assignedGames: gameAssignments,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAdmin(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        gameAssignments: { include: { game: true } },
        permissionOverrides: { include: { permission: true } },
        subscription: { include: { plan: true, invoices: { orderBy: { createdAt: 'desc' } } } },
        commissions: { orderBy: { periodEnd: 'desc' }, take: 20 },
      },
    });

    if (!admin) throw new NotFoundException('Admin not found');

    const { passwordHash, ...safe } = admin;
    return {
      ...safe,
      roles: admin.roles.map((ur) => ({
        ...ur.role,
        permissions: ur.role.permissions.map((rp) => rp.permission),
      })),
    };
  }

  async updateAdmin(
    id: string,
    actorId: string,
    data: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
      isActive?: boolean;
      suspendedReason?: string;
    },
  ) {
    if (id === actorId && data.isActive === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Admin not found');

    const before: Record<string, unknown> = {
      isActive: existing.isActive,
      firstName: existing.firstName,
      lastName: existing.lastName,
      avatar: existing.avatar,
    };

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
          suspendedAt: data.isActive ? null : new Date(),
          suspendedReason: data.isActive ? null : data.suspendedReason ?? 'Suspended by super admin',
        }),
      },
    });

    await this.audit('admin.updated', 'AdminUser', id, actorId, before, {
      isActive: updated.isActive,
      suspendedReason: updated.suspendedReason,
    });

    return { id: updated.id, isActive: updated.isActive, suspendedReason: updated.suspendedReason };
  }

  // ----------------------------------------------------------
  // ROLES
  // ----------------------------------------------------------

  async assignRole(adminId: string, roleName: string, actorId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new NotFoundException(`Role ${roleName} not found`);
    if (!role.isActive) throw new BadRequestException('Role is inactive');

    const already = await this.prisma.adminUserRole.findUnique({
      where: { adminId_roleId: { adminId, roleId: role.id } },
    });
    if (!already) {
      await this.prisma.adminUserRole.create({
        data: { adminId, roleId: role.id, grantedBy: actorId },
      });
    }

    await this.audit('admin.role.granted', 'AdminUser', adminId, actorId, undefined, {
      role: role.name,
    });

    return { adminId, role: role.name };
  }

  async revokeRole(adminId: string, roleId: string, actorId: string) {
    if (adminId === actorId) {
      throw new ForbiddenException('You cannot remove your own roles');
    }

    const link = await this.prisma.adminUserRole.findUnique({
      where: { adminId_roleId: { adminId, roleId } },
      include: { role: true },
    });
    if (!link) throw new NotFoundException('Role assignment not found');
    if (link.role.name === 'super_admin') {
      throw new ForbiddenException('super_admin role cannot be revoked');
    }

    await this.prisma.adminUserRole.delete({ where: { id: link.id } });

    await this.audit('admin.role.revoked', 'AdminUser', adminId, actorId, undefined, {
      role: link.role.name,
    });

    return { adminId, role: link.role.name };
  }

  // ----------------------------------------------------------
  // GAME ASSIGNMENTS
  // ----------------------------------------------------------

  async assignGames(
    adminId: string,
    assignments: { gameId: string; canView?: boolean; canEdit?: boolean }[],
    actorId: string,
  ) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const created = [];
    for (const a of assignments) {
      const game = await this.prisma.game.findUnique({ where: { id: a.gameId } });
      if (!game) throw new NotFoundException(`Game ${a.gameId} not found`);

      const row = await this.prisma.adminGame.upsert({
        where: { adminId_gameId: { adminId, gameId: a.gameId } },
        update: {
          canView: a.canView ?? true,
          canEdit: a.canEdit ?? false,
          grantedBy: actorId,
        },
        create: {
          adminId,
          gameId: a.gameId,
          canView: a.canView ?? true,
          canEdit: a.canEdit ?? false,
          grantedBy: actorId,
        },
      });
      created.push(row);
    }

    await this.audit('admin.games.assigned', 'AdminUser', adminId, actorId, undefined, {
      assignments: assignments.map((a) => a.gameId),
    });

    return created;
  }

  async revokeGame(adminId: string, gameId: string, actorId: string) {
    const row = await this.prisma.adminGame.findUnique({
      where: { adminId_gameId: { adminId, gameId } },
    });
    if (!row) throw new NotFoundException('Game assignment not found');

    await this.prisma.adminGame.delete({ where: { id: row.id } });

    await this.audit('admin.games.revoked', 'AdminUser', adminId, actorId, undefined, { gameId });

    return { adminId, gameId };
  }

  // ----------------------------------------------------------
  // PLANS
  // ----------------------------------------------------------

  async createPlan(
    data: {
      name: string;
      description?: string;
      currency?: string;
      monthlyFeeCents?: number;
      commissionRate?: number;
      maxGames?: number;
      features?: string[];
    },
    actorId: string,
  ) {
    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException('Plan name is required');
    }

    const plan = await this.prisma.adminPlan.create({
      data: {
        name: data.name.trim(),
        description: data.description,
        currency: data.currency ?? 'USD',
        monthlyFeeCents: data.monthlyFeeCents ?? 0,
        commissionRate: new Decimal(data.commissionRate ?? 0),
        maxGames: data.maxGames,
        features: data.features ? JSON.stringify(data.features) : undefined,
      },
    });

    await this.audit('admin.plan.created', 'AdminPlan', plan.id, actorId, undefined, {
      name: plan.name,
      monthlyFeeCents: plan.monthlyFeeCents,
      commissionRate: plan.commissionRate.toString(),
    });

    return plan;
  }

  async listPlans() {
    const plans = await this.prisma.adminPlan.findMany({
      orderBy: { monthlyFeeCents: 'asc' },
      include: { subscriptions: { select: { id: true, adminId: true, status: true } } },
    });

    return plans.map(({ subscriptions, ...plan }) => ({
      ...plan,
      commissionRate: plan.commissionRate,
      activeSubscriptions: subscriptions.filter((s) => s.status === 'active').length,
    }));
  }

  async updatePlan(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      currency: string;
      monthlyFeeCents: number;
      commissionRate: number;
      maxGames: number;
      features: string[];
      isActive: boolean;
    }>,
    actorId: string,
  ) {
    const existing = await this.prisma.adminPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.adminPlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.monthlyFeeCents !== undefined && { monthlyFeeCents: data.monthlyFeeCents }),
        ...(data.commissionRate !== undefined && { commissionRate: new Decimal(data.commissionRate) }),
        ...(data.maxGames !== undefined && { maxGames: data.maxGames }),
        ...(data.features !== undefined && { features: JSON.stringify(data.features) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await this.audit('admin.plan.updated', 'AdminPlan', id, actorId, { monthlyFeeCents: existing.monthlyFeeCents }, {
      ...(data.monthlyFeeCents !== undefined && { monthlyFeeCents: data.monthlyFeeCents }),
      ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    return updated;
  }

  // ----------------------------------------------------------
  // SUBSCRIPTIONS & INVOICES
  // ----------------------------------------------------------

  async subscribeAdmin(
    adminId: string,
    planId: string,
    actorId: string,
    opts: { notes?: string } = {},
  ) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin not found');

    const plan = await this.prisma.adminPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('Plan is inactive');

    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await this.prisma.adminSubscription.upsert({
      where: { adminId },
      update: {
        planId,
        status: 'active',
        paymentStatus: 'unpaid',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        accessExpiresAt: periodEnd,
        nextPaymentDueAt: periodEnd,
        notes: opts.notes,
      },
      create: {
        adminId,
        planId,
        status: 'active',
        paymentStatus: 'unpaid',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        accessExpiresAt: periodEnd,
        nextPaymentDueAt: periodEnd,
        notes: opts.notes,
      },
    });

    // Emit the opening invoice for the period.
    const invoice = await this.prisma.adminInvoice.create({
      data: {
        adminId,
        subscriptionId: subscription.id,
        amountCents: plan.monthlyFeeCents,
        periodStart,
        periodEnd,
        dueAt: periodEnd,
        status: plan.monthlyFeeCents > 0 ? 'unpaid' : 'paid',
        paidAt: plan.monthlyFeeCents > 0 ? undefined : new Date(),
      },
    });

    await this.audit('admin.subscribed', 'AdminSubscription', subscription.id, actorId, undefined, {
      adminId,
      planId,
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
    });

    return { subscription, invoice, plan };
  }

  async markSubscriptionPaid(subscriptionId: string, actorId: string) {
    const subscription = await this.prisma.adminSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const now = new Date();

    const updated = await this.prisma.adminSubscription.update({
      where: { id: subscriptionId },
      data: {
        paymentStatus: 'paid',
        lastPaymentAt: now,
        nextPaymentDueAt: subscription.currentPeriodEnd ?? new Date(now.getTime() + 30 * 24 * 3600 * 1000),
      },
    });

    await this.prisma.adminInvoice.updateMany({
      where: { subscriptionId, status: 'unpaid' },
      data: { status: 'paid', paidAt: now },
    });

    await this.audit('admin.invoice.paid', 'AdminSubscription', subscriptionId, actorId, {
      paymentStatus: subscription.paymentStatus,
    }, {
      paymentStatus: updated.paymentStatus,
      lastPaymentAt: updated.lastPaymentAt,
    });

    return updated;
  }

  async getSubscription(adminId: string) {
    const subscription = await this.prisma.adminSubscription.findUnique({
      where: { adminId },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!subscription) throw new NotFoundException('Admin has no subscription');

    return subscription;
  }

  // ----------------------------------------------------------
  // COMMISSIONS
  // ----------------------------------------------------------

  async listCommissions(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AdminCommissionWhereInput = query.status
      ? { status: query.status }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.adminCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodEnd: 'desc' },
        include: {
          admin: { select: { id: true, username: true, email: true } },
          game: { select: { id: true, displayName: true, internalCode: true } },
        },
      }),
      this.prisma.adminCommission.count({ where }),
    ]);

    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approveCommission(id: string, actorId: string) {
    const commission = await this.prisma.adminCommission.findUnique({ where: { id } });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status !== 'pending') throw new BadRequestException('Commission is not pending');

    const updated = await this.prisma.adminCommission.update({
      where: { id },
      data: { status: 'approved', updatedAt: new Date() },
    });

    await this.audit('commission.approved', 'AdminCommission', id, actorId, {
      status: 'pending',
    }, { status: 'approved' });

    return updated;
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------

  private async audit(
    action: string,
    entityType: string,
    entityId: string,
    actorId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ) {
    await this.auditService.log({
      actorId,
      actorType: 'admin',
      action,
      entityType,
      entityId,
      before: before as Prisma.InputJsonValue,
      after: after as Prisma.InputJsonValue,
      metadata: { adminManagement: true },
    });
  }
}