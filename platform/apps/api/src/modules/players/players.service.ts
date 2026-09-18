// ============================================================
// PLAYERS SERVICE
// ============================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto';

@Injectable()
export class PlayersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePlayerDto) {
    // Check if username or email exists
    const existing = await this.prisma.player.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Username, email, or phone already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create player with wallet
    const player = await this.prisma.player.create({
      data: {
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        displayName: dto.displayName,
        country: dto.country,
        language: dto.language || 'en',
        wallet: {
          create: {
            coinBalance: 0,
            diamondBalance: 0,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    return {
      id: player.id,
      username: player.username,
      email: player.email,
      displayName: player.displayName,
      wallet: player.wallet,
    };
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as any } },
            { email: { contains: search, mode: 'insensitive' as any } },
            { displayName: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [players, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          level: true,
          agency: true,
          family: true,
        },
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players.map((p) => ({
        id: p.id,
        username: p.username,
        email: p.email,
        displayName: p.displayName,
        avatar: p.avatar,
        isActive: p.isActive,
        isBanned: p.isBanned,
        country: p.country,
        level: p.level?.level || 1,
        agency: p.agency?.name,
        family: p.family?.name,
        coinBalance: p.wallet?.coinBalance || 0,
        diamondBalance: p.wallet?.diamondBalance || 0,
        createdAt: p.createdAt,
        lastLoginAt: p.lastLoginAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findUnique({
      where: { id },
      include: {
        wallet: true,
        level: true,
        agency: true,
        family: true,
        _count: {
          select: {
            bets: true,
            settlements: true,
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return {
      id: player.id,
      username: player.username,
      email: player.email,
      phone: player.phone,
      displayName: player.displayName,
      avatar: player.avatar,
      avatarFrame: player.avatarFrame,
      badge: player.badge,
      isActive: player.isActive,
      isBanned: player.isBanned,
      banReason: player.banReason,
      country: player.country,
      language: player.language,
      level: player.level,
      agency: player.agency,
      family: player.family,
      wallet: player.wallet,
      stats: {
        totalBets: player._count.bets,
        totalSettlements: player._count.settlements,
        totalPosts: player._count.posts,
        followers: player._count.followers,
        following: player._count.following,
      },
      createdAt: player.createdAt,
      lastLoginAt: player.lastLoginAt,
    };
  }

  async update(id: string, dto: UpdatePlayerDto) {
    const player = await this.prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Check for conflicts
    if (dto.username || dto.email) {
      const existing = await this.prisma.player.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(dto.username ? [{ username: dto.username }] : []),
                ...(dto.email ? [{ email: dto.email }] : []),
              ],
            },
          ],
        },
      });

      if (existing) {
        throw new ConflictException('Username or email already exists');
      }
    }

    const updated = await this.prisma.player.update({
      where: { id },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.avatar && { avatar: dto.avatar }),
        ...(dto.country && { country: dto.country }),
        ...(dto.language && { language: dto.language }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        wallet: true,
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      displayName: updated.displayName,
      wallet: updated.wallet,
    };
  }

  async ban(id: string, reason: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    await this.prisma.player.update({
      where: { id },
      data: {
        isBanned: true,
        banReason: reason,
      },
    });

    return { message: 'Player banned successfully' };
  }

  async unban(id: string) {
    const player = await this.prisma.player.findUnique({ where: { id } });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    await this.prisma.player.update({
      where: { id },
      data: {
        isBanned: false,
        banReason: null,
      },
    });

    return { message: 'Player unbanned successfully' };
  }

  async getStats() {
    const [total, active, banned, online] = await Promise.all([
      this.prisma.player.count(),
      this.prisma.player.count({ where: { isActive: true } }),
      this.prisma.player.count({ where: { isBanned: true } }),
      this.prisma.player.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      total,
      active,
      banned,
      online,
    };
  }
}
