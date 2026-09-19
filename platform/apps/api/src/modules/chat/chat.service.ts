// ============================================================
// CHAT SERVICE
// ============================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const MESSAGE_SENDER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.PlayerSelect;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(
    senderId: string,
    data: {
      roomId?: string;
      receiverId?: string;
      content: string;
      type?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const sender = await this.prisma.player.findUnique({ where: { id: senderId } });
    if (!sender) throw new NotFoundException('Sender not found');
    if (sender.isBanned) throw new ForbiddenException('Banned players cannot send messages');

    if (!data.content || data.content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }
    if (data.content.length > 2000) {
      throw new BadRequestException('Message content exceeds 2000 character limit');
    }

    if (data.roomId) {
      const room = await this.prisma.liveRoom.findUnique({ where: { id: data.roomId } });
      if (!room) throw new NotFoundException('Room not found');
      if (room.status !== 'active') throw new ForbiddenException('Room is not active');

      const membership = await this.prisma.roomMember.findUnique({
        where: { roomId_playerId: { roomId: data.roomId, playerId: senderId } },
      });
      if (!membership || membership.leftAt) {
        throw new ForbiddenException('You are not a member of this room');
      }
      if (membership.isMuted) {
        throw new ForbiddenException('You are muted in this room');
      }
    }

    if (data.receiverId) {
      const receiver = await this.prisma.player.findUnique({ where: { id: data.receiverId } });
      if (!receiver) throw new NotFoundException('Receiver not found');

      if (senderId === data.receiverId) {
        throw new BadRequestException('Cannot send messages to yourself');
      }

      const blocked = await this.prisma.blockRelation.findFirst({
        where: {
          OR: [
            { blockerId: senderId, blockedId: data.receiverId },
            { blockerId: data.receiverId, blockedId: senderId },
          ],
        },
      });
      if (blocked) {
        throw new ForbiddenException('Cannot send messages to this player');
      }
    }

    if (!data.roomId && !data.receiverId) {
      throw new BadRequestException('Either roomId or receiverId must be provided');
    }

    const messageType = data.roomId ? (data.type || 'chat') : 'dm';

    const message = await this.prisma.message.create({
      data: {
        senderId,
        roomId: data.roomId || null,
        receiverId: data.receiverId || null,
        content: data.content.trim(),
        type: messageType,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });

    return message;
  }

  async getRoomMessages(roomId: string, page = 1, limit = 50) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { roomId, isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: MESSAGE_SENDER_SELECT } },
      }),
      this.prisma.message.count({ where: { roomId, isDeleted: false } }),
    ]);

    return {
      data: messages.reverse(),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDirectMessages(playerId: string, otherPlayerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const otherPlayer = await this.prisma.player.findUnique({ where: { id: otherPlayerId } });
    if (!otherPlayer) throw new NotFoundException('Player not found');

    const blocked = await this.prisma.blockRelation.findFirst({
      where: {
        OR: [
          { blockerId: playerId, blockedId: otherPlayerId },
          { blockerId: otherPlayerId, blockedId: playerId },
        ],
      },
    });

    const where: Prisma.MessageWhereInput = {
      type: 'dm',
      isDeleted: false,
      OR: [
        { senderId: playerId, receiverId: otherPlayerId },
        { senderId: otherPlayerId, receiverId: playerId },
      ],
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: MESSAGE_SENDER_SELECT } },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages.reverse(),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      isBlocked: !!blocked,
    };
  }

  async markAsRead(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    const metadata = JSON.parse(message.metadata || '{}') as Record<string, unknown>;

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: JSON.stringify({
          ...metadata,
          read: true,
          readAt: new Date().toISOString(),
        }),
      },
    });

    return updated;
  }

  async deleteMessage(messageId: string, playerId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId !== playerId) {
      if (message.roomId) {
        const membership = await this.prisma.roomMember.findUnique({
          where: { roomId_playerId: { roomId: message.roomId, playerId } },
        });
        const isMod =
          membership &&
          !membership.leftAt &&
          (membership.role === 'host' || membership.role === 'co_host' || membership.role === 'moderator');
        if (!isMod) {
          throw new ForbiddenException('You can only delete your own messages');
        }
      } else {
        throw new ForbiddenException('You can only delete your own messages');
      }
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    return { deleted: true };
  }

  async getConversations(playerId: string) {
    const dmMessages = await this.prisma.$queryRaw<
      { other_player_id: string; last_message: string; last_message_at: Date; unread_count: bigint }[]
    >`
      SELECT DISTINCT ON (other_player_id)
        other_player_id,
        "content" as last_message,
        "createdAt" as last_message_at,
        0 as unread_count
      FROM (
        SELECT
          CASE WHEN "senderId" = ${playerId} THEN "receiverId" ELSE "senderId" END as other_player_id,
          "content",
          "createdAt",
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN "senderId" = ${playerId} THEN "receiverId" ELSE "senderId" END
            ORDER BY "createdAt" DESC
          ) as rn
        FROM messages
        WHERE "type" = 'dm'
          AND "isDeleted" = false
          AND ("senderId" = ${playerId} OR "receiverId" = ${playerId})
      ) sub
      WHERE rn = 1
      ORDER BY other_player_id, "createdAt" DESC
    `;

    const conversations = await Promise.all(
      dmMessages.map(async (msg) => {
        const otherPlayer = await this.prisma.player.findUnique({
          where: { id: msg.other_player_id },
          select: { id: true, username: true, displayName: true, avatar: true },
        });

        const unreadCount = await this.prisma.message.count({
          where: {
            type: 'dm',
            senderId: msg.other_player_id,
            receiverId: playerId,
            isDeleted: false,
            metadata: { contains: '"read":false' },
          },
        });

        return {
          otherPlayer,
          lastMessage: {
            content: msg.last_message,
            createdAt: msg.last_message_at,
          },
          unreadCount,
        };
      }),
    );

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );

    return conversations;
  }

  async searchMessages(playerId: string, query: string) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const playerRoomIds = (
      await this.prisma.roomMember.findMany({
        where: { playerId, leftAt: null },
        select: { roomId: true },
      })
    ).map((m) => m.roomId);

    const messages = await this.prisma.message.findMany({
      where: {
        isDeleted: false,
        OR: [
          {
            roomId: { in: playerRoomIds },
            content: { contains: query },
          },
          {
            type: 'dm',
            senderId: playerId,
            content: { contains: query },
          },
          {
            type: 'dm',
            receiverId: playerId,
            content: { contains: query },
          },
        ],
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: MESSAGE_SENDER_SELECT },
        room: { select: { id: true, title: true } },
      },
    });

    return messages;
  }
}
