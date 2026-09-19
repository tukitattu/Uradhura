// ============================================================
// ADMIN AUTHORIZATION SERVICE
// Two-step promotion workflow: a player requests admin access,
// a super_admin reviews + approves/rejects. Every decision is
// written to the immutable AuditLog. Approval provisions an
// AdminUser (mirror of the player account) with the requested
// role and permission allow-overrides.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAuthorizationRequestDto } from './admin-authorization.dto';

const PROMOTABLE_ROLES = [
  'admin',
  'game_operator',
  'finance',
  'moderator',
  'support',
  'viewer',
];

@Injectable()
export class AdminAuthorizationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ----------------------------------------------------------
  // PLAYER SIDE
  // ----------------------------------------------------------

  async submit(dto: CreateAuthorizationRequestDto, playerId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');
    if (!player.isActive || player.isBanned) {
      throw new ForbiddenException('Inactive players cannot request admin access');
    }

    const role = (dto.requestedRole || 'admin').trim().toLowerCase();
    if (!PROMOTABLE_ROLES.includes(role)) {
      throw new BadRequestException(
        `requestedRole must be one of: ${PROMOTABLE_ROLES.join(', ')}`,
      );
    }

    const existing = await this.prisma.adminAuthorizationRequest.findFirst({
      where: { playerId, status: 'pending' },
    });
    if (existing) {
      throw new ConflictException('You already have a pending admin authorization request');
    }

    const permissions = (dto.requestedPermissions || []).filter((p) =>
      typeof p === 'string' && /^[a-z_]+:[a-z_]+$/.test(p),
    );

    const request = await this.prisma.adminAuthorizationRequest.create({
      data: {
        playerId,
        requestedRole: role,
        requestedPermissions: JSON.stringify(permissions),
        notes: dto.notes || null,
        status: 'pending',
      },
      include: {
        player: { select: { id: true, username: true, email: true, phone: true } },
      },
    });

    await this.auditService.log({
      actorId: playerId,
      actorType: 'player',
      action: 'ADMIN_REQUEST_CREATED',
      entityType: 'AdminAuthorizationRequest',
      entityId: request.id,
      after: { requestedRole: role, requestedPermissions: permissions, notes: dto.notes },
      metadata: { source: 'admin-authorization.submit' },
    });

    return this.mapRequest(request);
  }

  async myRequests(playerId: string) {
    const rows = await this.prisma.adminAuthorizationRequest.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => ({
      ...r,
      requestedPermissions: JSON.parse(r.requestedPermissions || '[]'),
    }));
  }

  // ----------------------------------------------------------
  // SUPER ADMIN SIDE
  // ----------------------------------------------------------

  async list(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuthorizationRequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.player = {
        OR: [
          { username: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.adminAuthorizationRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          player: { select: { id: true, username: true, email: true, phone: true, isBanned: true } },
          reviewedBy: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.adminAuthorizationRequest.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        ...this.mapRequest(r),
        player: r.player,
        reviewedBy: r.reviewedBy,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approve(requestId: string, reviewerId: string, notes?: string) {
    const request = await this.prisma.adminAuthorizationRequest.findUnique({
      where: { id: requestId },
      include: { player: true },
    });
    if (!request) throw new NotFoundException('Authorization request not found');
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      const admin = await this.provisionAdmin(tx, request.player, request.requestedRole, request.requestedPermissions, reviewerId);

      const next = await tx.adminAuthorizationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          notes: notes || request.notes,
        },
      });

      return { admin, next };
    });

    await this.auditService.log({
      actorId: reviewerId,
      actorType: 'super_admin',
      action: 'ADMIN_REQUEST_APPROVED',
      entityType: 'AdminAuthorizationRequest',
      entityId: requestId,
      before: { status: 'pending' },
      after: {
        status: 'approved',
        approvedRole: request.requestedRole,
        provisionedAdminId: approved.admin.id,
        notes,
      },
      metadata: { source: 'admin-authorization.approve' },
    });

    return {
      ...approved.next,
      provisionedAdminId: approved.admin.id,
      requestedPermissions: JSON.parse(approved.next.requestedPermissions || '[]'),
    };
  }

  async reject(requestId: string, reviewerId: string, notes?: string) {
    const request = await this.prisma.adminAuthorizationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Authorization request not found');
    if (request.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    const rejected = await this.prisma.adminAuthorizationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        notes: notes || request.notes,
      },
    });

    await this.auditService.log({
      actorId: reviewerId,
      actorType: 'super_admin',
      action: 'ADMIN_REQUEST_REJECTED',
      entityType: 'AdminAuthorizationRequest',
      entityId: requestId,
      before: { status: 'pending' },
      after: { status: 'rejected', notes },
      metadata: { source: 'admin-authorization.reject' },
    });

    return {
      ...rejected,
      requestedPermissions: JSON.parse(rejected.requestedPermissions || '[]'),
    };
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------

  private async provisionAdmin(
    tx: Prisma.TransactionClient,
    player: { id: string; username: string; email: string | null; passwordHash: string },
    roleName: string,
    requestedPermissionsJson: string,
    reviewerId: string,
  ) {
    const role = await tx.role.findUnique({ where: { name: roleName } });
    if (!role) throw new BadRequestException(`Role ${roleName} does not exist`);
    if (!role.isActive) throw new BadRequestException(`Role ${roleName} is inactive`);

    // Reuse an existing AdminUser that mirrors this player (e.g. re-approval),
    // keyed by email first, then by identical username.
    const existing = player.email
      ? await tx.adminUser.findFirst({ where: { OR: [{ email: player.email }, { username: player.username }] } })
      : await tx.adminUser.findUnique({ where: { username: player.username } });

    let admin = existing;
    if (!admin) {
      admin = await tx.adminUser.create({
        data: {
          username: player.username,
          email: player.email || `${player.id}@players.local`,
          passwordHash: player.passwordHash,
          firstName: player.username,
          lastName: 'Player',
          isActive: true,
          createdBy: reviewerId,
        },
      });
    }

    await tx.adminUserRole.upsert({
      where: { adminId_roleId: { adminId: admin.id, roleId: role.id } },
      update: { grantedBy: reviewerId },
      create: { adminId: admin.id, roleId: role.id, grantedBy: reviewerId },
    });

    // Best-effort allow-overrides for any explicitly requested permissions.
    let requested: string[] = [];
    try {
      requested = JSON.parse(requestedPermissionsJson || '[]');
    } catch {
      requested = [];
    }
    for (const permKey of requested) {
      const [resource, action] = permKey.split(':');
      const perm = await tx.permission.findUnique({
        where: { resource_action: { resource, action } },
      });
      if (!perm) continue;
      await tx.adminPermission.upsert({
        where: { adminId_permissionId: { adminId: admin.id, permissionId: perm.id } },
        update: { effect: 'allow', grantedBy: reviewerId },
        create: { adminId: admin.id, permissionId: perm.id, effect: 'allow', grantedBy: reviewerId },
      });
    }

    return admin;
  }

  private mapRequest(row: {
    id: string;
    requestedPermissions: string;
    [key: string]: any;
  }) {
    return {
      ...row,
      requestedPermissions: JSON.parse(row.requestedPermissions || '[]'),
    } as any;
  }
}