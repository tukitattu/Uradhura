// ============================================================
// NOTIFICATIONS SERVICE
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    playerId: string,
    data: {
      type: string;
      title: string;
      content: string;
      data?: Record<string, unknown>;
    },
  ) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    const validTypes = ['system', 'game', 'social', 'reward', 'alert'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestException('Notification title cannot be empty');
    }
    if (data.title.length > 200) {
      throw new BadRequestException('Notification title exceeds 200 character limit');
    }
    if (!data.content || data.content.trim().length === 0) {
      throw new BadRequestException('Notification content cannot be empty');
    }

    const notification = await this.prisma.notification.create({
      data: {
        playerId,
        type: data.type,
        title: data.title.trim(),
        content: data.content.trim(),
        data: data.data ? JSON.stringify(data.data) : undefined,
      },
    });

    return notification;
  }

  async getNotifications(playerId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = { playerId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { playerId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }

  async markAllAsRead(playerId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { playerId, isRead: false },
      data: { isRead: true },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  async deleteNotification(notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { deleted: true };
  }

  async getUnreadCount(playerId: string) {
    const count = await this.prisma.notification.count({
      where: { playerId, isRead: false },
    });

    return { count };
  }

  async bulkCreate(
    playerIds: string[],
    data: {
      type: string;
      title: string;
      content: string;
      data?: Record<string, unknown>;
    },
  ) {
    if (!playerIds || playerIds.length === 0) {
      throw new BadRequestException('playerIds array cannot be empty');
    }

    const validTypes = ['system', 'game', 'social', 'reward', 'alert'];
    if (!validTypes.includes(data.type)) {
      throw new BadRequestException(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new BadRequestException('Notification title cannot be empty');
    }
    if (!data.content || data.content.trim().length === 0) {
      throw new BadRequestException('Notification content cannot be empty');
    }

    const uniquePlayerIds = [...new Set(playerIds)];

    const existingPlayers = await this.prisma.player.findMany({
      where: { id: { in: uniquePlayerIds } },
      select: { id: true },
    });
    const validPlayerIds = existingPlayers.map((p) => p.id);

    if (validPlayerIds.length === 0) {
      throw new NotFoundException('No valid players found');
    }

    const result = await this.prisma.notification.createMany({
      data: validPlayerIds.map((playerId) => ({
        playerId,
        type: data.type,
        title: data.title.trim(),
        content: data.content.trim(),
        data: data.data ? JSON.stringify(data.data) : undefined,
      })),
    });

    return {
      success: true,
      createdCount: result.count,
      invalidPlayerIds: uniquePlayerIds.filter((id) => !validPlayerIds.includes(id)),
    };
  }

  async deleteOlderThan(days: number) {
    if (days < 1) {
      throw new BadRequestException('Days must be at least 1');
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    return {
      deletedCount: result.count,
      cutoffDate,
    };
  }
}
