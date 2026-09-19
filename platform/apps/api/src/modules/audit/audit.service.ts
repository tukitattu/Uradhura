// ============================================================
// AUDIT SERVICE
// ============================================================

import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    actorId?: string;
    actorType?: string;
    action: string;
    entityType: string;
    entityId?: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    if (!data.action || data.action.trim().length === 0) {
      throw new BadRequestException('Action is required');
    }
    if (!data.entityType || data.entityType.trim().length === 0) {
      throw new BadRequestException('Entity type is required');
    }

    const logEntry = await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        actorType: data.actorType || 'system',
        action: data.action.trim(),
        entityType: data.entityType.trim(),
        entityId: data.entityId,
        before: data.before ? JSON.stringify(data.before) : undefined,
        after: data.after ? JSON.stringify(data.after) : undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        requestId: data.requestId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
    });

    return logEntry;
  }

  async getLogs(
    page = 1,
    limit = 50,
    filters?: {
      actorId?: string;
      actorType?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.actorType) where.actorType = filters.actorType;
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLogs, todayLogs, weekLogs, monthLogs, topActions, topEntityTypes] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      todayLogs,
      weekLogs,
      monthLogs,
      topActions: topActions.map((a) => ({ action: a.action, count: a._count.id })),
      topEntityTypes: topEntityTypes.map((e) => ({ entityType: e.entityType, count: e._count.id })),
    };
  }

  async getEntityHistory(entityType: string, entityId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  async getActorHistory(actorId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { actorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { actorId } }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportLogs(filters?: {
    actorId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: Prisma.AuditLogWhereInput = {};
    const maxExport = filters?.limit || 10000;

    if (filters?.actorId) where.actorId = filters.actorId;
    if (filters?.action) where.action = { contains: filters.action };
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: maxExport,
      orderBy: { createdAt: 'asc' },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalRecords: logs.length,
      filters: {
        actorId: filters?.actorId,
        action: filters?.action,
        entityType: filters?.entityType,
        startDate: filters?.startDate?.toISOString(),
        endDate: filters?.endDate?.toISOString(),
      },
      records: logs,
    };

    return exportData;
  }
}
