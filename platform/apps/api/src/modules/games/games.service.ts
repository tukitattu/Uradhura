// ============================================================
// GAMES SERVICE
// ============================================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto } from './dto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGameDto) {
    // Check if internal code exists
    const existing = await this.prisma.game.findUnique({
      where: { internalCode: dto.internalCode },
    });

    if (existing) {
      throw new ConflictException('Game with this internal code already exists');
    }

    const game = await this.prisma.game.create({
      data: {
        internalCode: dto.internalCode,
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        shortDescription: dto.shortDescription,
        category: dto.category,
        gameType: dto.gameType,
        sortOrder: dto.sortOrder || 0,
        thumbnail: dto.thumbnail,
        banner: dto.banner,
        icon: dto.icon,
        background: dto.background,
        logo: dto.logo,
        centralCharacter: dto.centralCharacter,
        characterName: dto.characterName,
      },
    });

    // Create default configuration
    await this.prisma.gameConfiguration.create({
      data: {
        gameId: game.id,
        version: 1,
        isActive: true,
      },
    });

    // Create default bet config
    await this.prisma.gameBetConfig.create({
      data: {
        gameId: game.id,
      },
    });

    return game;
  }

  async findAll(includeInactive = false) {
    return this.prisma.game.findMany({
      where: includeInactive ? {} : { status: { not: 'inactive' } },
      orderBy: { sortOrder: 'asc' },
      include: {
        configurations: {
          where: { isActive: true },
          take: 1,
        },
        _count: {
          select: {
            options: true,
            rounds: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        configurations: {
          orderBy: { version: 'desc' },
          take: 5,
        },
        options: {
          orderBy: { sortOrder: 'asc' },
        },
        betConfigs: {
          take: 1,
        },
        assets: true,
        localizations: true,
        _count: {
          select: {
            rounds: true,
            options: true,
          },
        },
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async findByCode(internalCode: string) {
    const game = await this.prisma.game.findUnique({
      where: { internalCode },
      include: {
        configurations: {
          where: { isActive: true },
          take: 1,
        },
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        betConfigs: {
          take: 1,
        },
        assets: true,
      },
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  async update(id: string, dto: UpdateGameDto) {
    const game = await this.prisma.game.findUnique({ where: { id } });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.prisma.game.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.category && { category: dto.category }),
        ...(dto.gameType && { gameType: dto.gameType }),
        ...(dto.status && { status: dto.status }),
        ...(dto.version !== undefined && { version: dto.version }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
        ...(dto.isHot !== undefined && { isHot: dto.isHot }),
        ...(dto.isRecommended !== undefined && { isRecommended: dto.isRecommended }),
        ...(dto.maintenanceMessage !== undefined && { maintenanceMessage: dto.maintenanceMessage }),
        ...(dto.thumbnail && { thumbnail: dto.thumbnail }),
        ...(dto.banner && { banner: dto.banner }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.background && { background: dto.background }),
        ...(dto.logo && { logo: dto.logo }),
        ...(dto.centralCharacter && { centralCharacter: dto.centralCharacter }),
        ...(dto.characterAnimation && { characterAnimation: dto.characterAnimation }),
        ...(dto.characterName && { characterName: dto.characterName }),
        ...(dto.rules && { rules: dto.rules }),
        ...(dto.helpContent && { helpContent: dto.helpContent }),
        ...(dto.sounds && { sounds: dto.sounds }),
        ...(dto.music && { music: dto.music }),
        ...(dto.theme && { theme: dto.theme }),
        ...(dto.colorConfig && { colorConfig: dto.colorConfig }),
      },
    });
  }

  async updateStatus(id: string, status: string) {
    const game = await this.prisma.game.findUnique({ where: { id } });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return this.prisma.game.update({
      where: { id },
      data: { status },
    });
  }

  async getStats() {
    const [total, active, maintenance] = await Promise.all([
      this.prisma.game.count(),
      this.prisma.game.count({ where: { status: 'active' } }),
      this.prisma.game.count({ where: { status: 'maintenance' } }),
    ]);

    return {
      total,
      active,
      maintenance,
    };
  }

  async getActiveGames() {
    return this.prisma.game.findMany({
      where: { status: 'active' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        internalCode: true,
        name: true,
        displayName: true,
        thumbnail: true,
        icon: true,
      },
    });
  }

  async getRounds(gameId: string, page = 1, limit = 20, status?: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }

    const [rounds, total] = await Promise.all([
      this.prisma.gameRound.findMany({
        where: {
          gameId,
          ...(status ? { status } : {}),
        },
        orderBy: { roundNumber: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { bets: true } },
        },
      }),
      this.prisma.gameRound.count({
        where: {
          gameId,
          ...(status ? { status } : {}),
        },
      }),
    ]);

    return {
      data: rounds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
