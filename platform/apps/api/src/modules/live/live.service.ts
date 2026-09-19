// ============================================================
// LIVE SERVICE — Live Rooms & Voice Rooms
// ============================================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, RoomMember } from '@prisma/client';

const HOST_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  levelId: true,
} satisfies Prisma.PlayerSelect;

const MEMBER_SELECT = {
  id: true,
  playerId: true,
  role: true,
  isMuted: true,
  joinedAt: true,
  player: { select: HOST_SELECT },
} satisfies Prisma.RoomMemberSelect;

@Injectable()
export class LiveService {
  constructor(private prisma: PrismaService) {}

  async createRoom(
    hostId: string,
    data: {
      title: string;
      cover?: string;
      description?: string;
      roomType?: string;
      isPrivate?: boolean;
      accessLevel?: string;
      region?: string;
      category?: string;
      tags?: Record<string, unknown>;
      settings?: Record<string, unknown>;
      maxViewers?: number;
    },
  ) {
    const player = await this.prisma.player.findUnique({ where: { id: hostId } });
    if (!player) throw new NotFoundException('Player not found');
    if (player.isBanned) throw new ForbiddenException('Banned players cannot create rooms');

    const activeRoom = await this.prisma.liveRoom.findFirst({
      where: { hostId, status: 'active' },
    });
    if (activeRoom) {
      throw new BadRequestException('You already have an active room');
    }

    const room = await this.prisma.liveRoom.create({
      data: {
        hostId,
        title: data.title,
        cover: data.cover,
        description: data.description,
        roomType: data.roomType || 'live',
        isPrivate: data.isPrivate ?? false,
        accessLevel: data.accessLevel || 'public',
        region: data.region,
        category: data.category,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        settings: data.settings ? JSON.stringify(data.settings) : null,
        maxViewers: data.maxViewers ?? 10000,
      },
      include: {
        host: { select: HOST_SELECT },
        _count: { select: { members: true } },
      },
    });

    await this.prisma.roomMember.create({
      data: { roomId: room.id, playerId: hostId, role: 'host' },
    });

    return room;
  }

  async getRooms(
    page = 1,
    limit = 20,
    filters?: {
      roomType?: string;
      region?: string;
      category?: string;
      search?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.LiveRoomWhereInput = { status: 'active' };

    if (filters?.roomType) where.roomType = filters.roomType;
    if (filters?.region) where.region = filters.region;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [rooms, total] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ viewerCount: 'desc' }, { createdAt: 'desc' }],
        include: {
          host: { select: HOST_SELECT },
          _count: { select: { members: { where: { leftAt: null } } } },
        },
      }),
      this.prisma.liveRoom.count({ where }),
    ]);

    return {
      data: rooms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: {
        host: { select: HOST_SELECT },
        _count: { select: { members: { where: { leftAt: null } } } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async joinRoom(playerId: string, roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'active') throw new ForbiddenException('Room is not active');

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');
    if (player.isBanned) throw new ForbiddenException('Banned players cannot join rooms');

    const existing = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId } },
    });

    if (existing && !existing.leftAt) {
      return existing;
    }

    const currentMemberCount = await this.prisma.roomMember.count({
      where: { roomId, leftAt: null },
    });

    if (currentMemberCount >= room.maxViewers) {
      throw new ForbiddenException('Room is at full capacity');
    }

    if (room.accessLevel === 'private' && room.hostId !== playerId) {
      throw new ForbiddenException('This room is private');
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const m = existing
        ? await tx.roomMember.update({
            where: { roomId_playerId: { roomId, playerId } },
            data: { leftAt: null, role: 'viewer' },
          })
        : await tx.roomMember.create({
            data: { roomId, playerId, role: 'viewer' },
          });

      await tx.liveRoom.update({
        where: { id: roomId },
        data: { viewerCount: { increment: 1 } },
      });

      return m;
    });

    return this.prisma.roomMember.findUnique({
      where: { id: member.id },
      include: { player: { select: HOST_SELECT } },
    });
  }

  async leaveRoom(playerId: string, roomId: string) {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId } },
    });

    if (!member || member.leftAt) {
      throw new BadRequestException('You are not in this room');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roomMember.update({
        where: { roomId_playerId: { roomId, playerId } },
        data: { leftAt: new Date() },
      });

      await tx.liveRoom.update({
        where: { id: roomId },
        data: { viewerCount: { decrement: 1 } },
      });
    });

    return { left: true };
  }

  async endRoom(hostId: string, roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only the host can end this room');
    if (room.status === 'ended') throw new BadRequestException('Room is already ended');

    await this.prisma.$transaction(async (tx) => {
      await tx.roomMember.updateMany({
        where: { roomId, leftAt: null },
        data: { leftAt: new Date() },
      });

      await tx.liveRoom.update({
        where: { id: roomId },
        data: { status: 'ended', endedAt: new Date(), viewerCount: 0 },
      });
    });

    return this.prisma.liveRoom.findUnique({ where: { id: roomId } });
  }

  async getRoomStats() {
    const [total, active, totalViewersAgg, roomsByType, roomsByRegion] = await Promise.all([
      this.prisma.liveRoom.count(),
      this.prisma.liveRoom.count({ where: { status: 'active' } }),
      this.prisma.liveRoom.aggregate({
        _sum: { viewerCount: true },
        where: { status: 'active' },
      }),
      this.prisma.liveRoom.groupBy({
        by: ['roomType'],
        _count: { id: true },
        where: { status: 'active' },
      }),
      this.prisma.liveRoom.groupBy({
        by: ['region'],
        _count: { id: true },
        where: { status: 'active' },
      }),
    ]);

    return {
      totalRooms: total,
      activeRooms: active,
      totalViewers: totalViewersAgg._sum.viewerCount || 0,
      byType: roomsByType.map((r) => ({ type: r.roomType, count: r._count.id })),
      byRegion: roomsByRegion.map((r) => ({ region: r.region, count: r._count.id })),
    };
  }

  async kickMember(hostId: string, roomId: string, playerId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only the host can kick members');

    const callerMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId: hostId } },
    });
    if (!callerMember || callerMember.leftAt) {
      throw new ForbiddenException('You are not in this room');
    }

    if (callerMember.role !== 'host' && callerMember.role !== 'co_host') {
      throw new ForbiddenException('Only host or co-host can kick members');
    }

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId } },
    });
    if (!targetMember || targetMember.leftAt) {
      throw new NotFoundException('Player is not in this room');
    }

    if (targetMember.role === 'host') {
      throw new ForbiddenException('Cannot kick the host');
    }

    if (callerMember.role === 'co_host' && targetMember.role === 'co_host') {
      throw new ForbiddenException('Co-hosts cannot kick other co-hosts');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roomMember.update({
        where: { roomId_playerId: { roomId, playerId } },
        data: { leftAt: new Date() },
      });

      await tx.liveRoom.update({
        where: { id: roomId },
        data: { viewerCount: { decrement: 1 } },
      });
    });

    return { kicked: true };
  }

  async muteMember(hostId: string, roomId: string, playerId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only the host can mute members');

    const callerMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId: hostId } },
    });
    if (!callerMember || callerMember.leftAt) {
      throw new ForbiddenException('You are not in this room');
    }

    if (callerMember.role !== 'host' && callerMember.role !== 'co_host') {
      throw new ForbiddenException('Only host or co-host can mute members');
    }

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId } },
    });
    if (!targetMember || targetMember.leftAt) {
      throw new NotFoundException('Player is not in this room');
    }
    if (targetMember.role === 'host') {
      throw new ForbiddenException('Cannot mute the host');
    }

    const updated = await this.prisma.roomMember.update({
      where: { roomId_playerId: { roomId, playerId } },
      data: { isMuted: !targetMember.isMuted },
    });

    return { muted: updated.isMuted };
  }

  async transferHost(hostId: string, roomId: string, newHostId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only the host can transfer host role');

    if (hostId === newHostId) {
      throw new BadRequestException('Cannot transfer host to yourself');
    }

    const newHostMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId: newHostId } },
    });
    if (!newHostMember || newHostMember.leftAt) {
      throw new BadRequestException('New host must be a current member of the room');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roomMember.update({
        where: { roomId_playerId: { roomId, playerId: hostId } },
        data: { role: 'co_host' },
      });

      await tx.roomMember.update({
        where: { roomId_playerId: { roomId, playerId: newHostId } },
        data: { role: 'host', isMuted: false },
      });

      await tx.liveRoom.update({
        where: { id: roomId },
        data: { hostId: newHostId },
      });
    });

    return this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: { host: { select: HOST_SELECT } },
    });
  }

  async setCoHost(hostId: string, roomId: string, playerId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only the host can set co-hosts');

    const targetMember = await this.prisma.roomMember.findUnique({
      where: { roomId_playerId: { roomId, playerId } },
    });
    if (!targetMember || targetMember.leftAt) {
      throw new BadRequestException('Player must be a current member of the room');
    }
    if (targetMember.role === 'host') {
      throw new BadRequestException('Cannot set the host as co-host');
    }

    const updated = await this.prisma.roomMember.update({
      where: { roomId_playerId: { roomId, playerId } },
      data: { role: 'co_host' },
      include: { player: { select: HOST_SELECT } },
    });

    return updated;
  }

  async getRoomMembers(roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const members = await this.prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      select: MEMBER_SELECT,
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    const roleOrder: Record<string, number> = { host: 0, co_host: 1, moderator: 2, viewer: 3 };
    members.sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));

    return members;
  }
}
