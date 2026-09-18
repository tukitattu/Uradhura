// ============================================================
// MODERATION SERVICE
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    data: {
      targetType: string;
      targetId: string;
      reason: string;
      category?: string;
      description?: string;
      roomId?: string;
    },
  ) {
    const reporter = await this.prisma.player.findUnique({ where: { id: reporterId } });
    if (!reporter) throw new NotFoundException('Reporter not found');
    if (reporter.isBanned) throw new BadRequestException('Banned players cannot file reports');

    const validTargetTypes = ['player', 'live_room', 'post', 'message', 'game'];
    if (!validTargetTypes.includes(data.targetType)) {
      throw new BadRequestException(`Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`);
    }

    if (reporterId === data.targetId && data.targetType === 'player') {
      throw new BadRequestException('Cannot report yourself');
    }

    const duplicateReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        status: { in: ['pending', 'reviewing'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (duplicateReport) {
      throw new ConflictException('You have already reported this item in the last 24 hours');
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        category: data.category || 'general',
        description: data.description,
        roomId: data.roomId,
      },
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    return report;
  }

  async getReports(
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      category?: string;
      targetType?: string;
      assignedTo?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.ReportWhereInput = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.targetType) where.targetType = filters.targetType;
    if (filters?.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
        room: { select: { id: true, title: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async updateReportStatus(
    reportId: string,
    status: string,
    assignedTo?: string,
    resolution?: string,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (status === 'resolved' && !resolution) {
      throw new BadRequestException('Resolution text is required when resolving a report');
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        ...(assignedTo !== undefined && { assignedTo }),
        ...(resolution && { resolution }),
        ...(status === 'resolved' && { resolvedAt: new Date() }),
      },
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });

    return updated;
  }

  async moderatePlayer(
    adminId: string,
    data: {
      targetType: string;
      targetId: string;
      action: string;
      reason: string;
      duration?: number;
    },
  ) {
    const validActions = ['warn', 'mute', 'ban', 'unban', 'delete', 'restrict'];
    if (!validActions.includes(data.action)) {
      throw new BadRequestException(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    const validTargetTypes = ['player', 'room', 'post', 'message'];
    if (!validTargetTypes.includes(data.targetType)) {
      throw new BadRequestException(`Invalid target type. Must be one of: ${validTargetTypes.join(', ')}`);
    }

    if (!data.reason || data.reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for moderation actions');
    }

    if (data.duration && data.duration < 1) {
      throw new BadRequestException('Duration must be at least 1 hour');
    }

    const expiresAt = data.duration
      ? new Date(Date.now() + data.duration * 60 * 60 * 1000)
      : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      const moderationAction = await tx.moderationAction.create({
        data: {
          adminId,
          targetType: data.targetType,
          targetId: data.targetId,
          action: data.action,
          reason: data.reason,
          duration: data.duration,
          expiresAt,
        },
      });

      if (data.targetType === 'player') {
        const player = await tx.player.findUnique({ where: { id: data.targetId } });
        if (!player) throw new NotFoundException('Target player not found');

        if (data.action === 'ban') {
          await tx.player.update({
            where: { id: data.targetId },
            data: { isBanned: true, banReason: data.reason },
          });
        } else if (data.action === 'unban') {
          await tx.player.update({
            where: { id: data.targetId },
            data: { isBanned: false, banReason: null },
          });
        } else if (data.action === 'mute') {
          const activeMute = await tx.moderationAction.findFirst({
            where: {
              targetId: data.targetId,
              targetType: 'player',
              action: 'mute',
              expiresAt: { gt: new Date() },
            },
          });
          if (activeMute) {
            throw new ConflictException('Player is already muted');
          }
        }
      }

      return moderationAction;
    });

    return result;
  }

  async getModerationStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingReports, totalReports, resolvedToday, bannedPlayers, mutedPlayers, totalActions] =
      await Promise.all([
        this.prisma.report.count({ where: { status: 'pending' } }),
        this.prisma.report.count(),
        this.prisma.report.count({
          where: { status: 'resolved', resolvedAt: { gte: startOfDay } },
        }),
        this.prisma.player.count({ where: { isBanned: true } }),
        this.prisma.moderationAction.count({
          where: { action: 'mute', expiresAt: { gt: now } },
        }),
        this.prisma.moderationAction.count({
          where: { createdAt: { gte: startOfDay } },
        }),
      ]);

    const reportsByCategory = await this.prisma.report.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { status: 'pending' },
    });

    return {
      pendingReports,
      totalReports,
      resolvedToday,
      bannedPlayers,
      mutedPlayers,
      actionsToday: totalActions,
      pendingByCategory: reportsByCategory.map((r) => ({
        category: r.category,
        count: r._count.id,
      })),
    };
  }

  async getModerationHistory(targetType: string, targetId: string) {
    const [actions, reports] = await Promise.all([
      this.prisma.moderationAction.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, username: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prisma.report.findMany({
        where: { targetType, targetId },
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
    ]);

    return { actions, reports };
  }

  async getAdminActions(adminId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [actions, total] = await Promise.all([
      this.prisma.moderationAction.findMany({
        where: { adminId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.moderationAction.count({ where: { adminId } }),
    ]);

    return {
      data: actions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
