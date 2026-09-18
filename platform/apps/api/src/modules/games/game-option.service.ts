// ============================================================
// GAME OPTION SERVICE
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GameOptionService {
  constructor(private prisma: PrismaService) {}

  async findAll(gameId: string) {
    return this.prisma.gameOption.findMany({
      where: { gameId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const option = await this.prisma.gameOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Game option not found');
    return option;
  }

  async create(gameId: string, data: {
    name: string;
    label: string;
    icon?: string;
    image?: string;
    multiplier: number;
    weight?: number;
    colorHex?: string;
    positionX?: number;
    positionY?: number;
    isHot?: boolean;
    isRecommended?: boolean;
    sortOrder?: number;
    metadata?: any;
  }) {
    return this.prisma.gameOption.create({
      data: {
        gameId,
        name: data.name,
        label: data.label,
        icon: data.icon,
        image: data.image,
        multiplier: data.multiplier,
        weight: data.weight || 1,
        colorHex: data.colorHex || '#ffffff',
        positionX: data.positionX,
        positionY: data.positionY,
        isHot: data.isHot || false,
        isRecommended: data.isRecommended || false,
        sortOrder: data.sortOrder || 0,
        metadata: data.metadata,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    label: string;
    icon: string;
    image: string;
    multiplier: number;
    weight: number;
    colorHex: string;
    positionX: number;
    positionY: number;
    isHot: boolean;
    isRecommended: boolean;
    sortOrder: number;
    isActive: boolean;
    metadata: any;
  }>) {
    const option = await this.prisma.gameOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Game option not found');

    return this.prisma.gameOption.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const option = await this.prisma.gameOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Game option not found');

    await this.prisma.gameOption.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(gameId: string, optionIds: string[]) {
    const updates = optionIds.map((id, index) =>
      this.prisma.gameOption.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await this.prisma.$transaction(updates);
    return { reordered: true };
  }
}
