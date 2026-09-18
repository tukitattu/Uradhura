// ============================================================
// GAME CONFIG SERVICE
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GameConfigService {
  constructor(private prisma: PrismaService) {}

  async getActiveConfig(gameId: string) {
    const config = await this.prisma.gameConfiguration.findFirst({
      where: { gameId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!config) {
      throw new NotFoundException('No active configuration found');
    }

    return config;
  }

  async getConfigHistory(gameId: string, limit = 10) {
    return this.prisma.gameConfiguration.findMany({
      where: { gameId },
      orderBy: { version: 'desc' },
      take: limit,
    });
  }

  async createConfig(gameId: string, data: {
    houseEdge?: number;
    maxPayoutPerRound?: number;
    jackpotWeight?: number;
    vipAdjustment?: number;
    maxDailyLossPerPlayer?: number;
    bettingDurationSeconds?: number;
    roundDurationSeconds?: number;
    resultProcessingDelayMs?: number;
    newRoundDelayMs?: number;
    minPlayers?: number;
    maxPlayers?: number;
    configData?: any;
  }, createdBy?: string) {
    // Get latest version
    const latest = await this.prisma.gameConfiguration.findFirst({
      where: { gameId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latest?.version || 0) + 1;

    // Deactivate current active config
    await this.prisma.gameConfiguration.updateMany({
      where: { gameId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.gameConfiguration.create({
      data: {
        gameId,
        version: newVersion,
        houseEdge: data.houseEdge,
        maxPayoutPerRound: data.maxPayoutPerRound,
        jackpotWeight: data.jackpotWeight,
        vipAdjustment: data.vipAdjustment,
        maxDailyLossPerPlayer: data.maxDailyLossPerPlayer,
        bettingDurationSeconds: data.bettingDurationSeconds,
        roundDurationSeconds: data.roundDurationSeconds,
        resultProcessingDelayMs: data.resultProcessingDelayMs,
        newRoundDelayMs: data.newRoundDelayMs,
        minPlayers: data.minPlayers,
        maxPlayers: data.maxPlayers,
        configData: data.configData,
        createdBy,
        isActive: true,
      },
    });
  }

  async rollbackConfig(gameId: string, targetVersion: number) {
    const targetConfig = await this.prisma.gameConfiguration.findUnique({
      where: { gameId_version: { gameId, version: targetVersion } },
    });

    if (!targetConfig) {
      throw new NotFoundException('Target configuration not found');
    }

    // Deactivate current
    await this.prisma.gameConfiguration.updateMany({
      where: { gameId, isActive: true },
      data: { isActive: false },
    });

    // Activate target
    return this.prisma.gameConfiguration.update({
      where: { id: targetConfig.id },
      data: { isActive: true },
    });
  }

  async publishConfig(configId: string) {
    return this.prisma.gameConfiguration.update({
      where: { id: configId },
      data: { publishedAt: new Date() },
    });
  }

  async getBetConfig(gameId: string) {
    const config = await this.prisma.gameBetConfig.findUnique({
      where: { gameId },
    });

    if (!config) {
      return this.prisma.gameBetConfig.create({
        data: { gameId },
      });
    }

    return config;
  }

  async updateBetConfig(gameId: string, data: {
    denominations?: number[];
    minBet?: number;
    maxBet?: number;
    allowCustomBet?: boolean;
    allowMultipleSelections?: boolean;
    allowRepeatBet?: boolean;
    allowAutoBet?: boolean;
    allowAutoPlay?: boolean;
    maxAutoBetRounds?: number;
  }) {
    return this.prisma.gameBetConfig.upsert({
      where: { gameId },
      update: {
        ...(data.denominations && { denominations: JSON.stringify(data.denominations) }),
        ...(data.minBet !== undefined && { minBet: data.minBet }),
        ...(data.maxBet !== undefined && { maxBet: data.maxBet }),
        ...(data.allowCustomBet !== undefined && { allowCustomBet: data.allowCustomBet }),
        ...(data.allowMultipleSelections !== undefined && { allowMultipleSelections: data.allowMultipleSelections }),
        ...(data.allowRepeatBet !== undefined && { allowRepeatBet: data.allowRepeatBet }),
        ...(data.allowAutoBet !== undefined && { allowAutoBet: data.allowAutoBet }),
        ...(data.allowAutoPlay !== undefined && { allowAutoPlay: data.allowAutoPlay }),
        ...(data.maxAutoBetRounds !== undefined && { maxAutoBetRounds: data.maxAutoBetRounds }),
      },
      create: {
        gameId,
        denominations: JSON.stringify(data.denominations || [100, 500, 1000, 5000, 10000]),
        minBet: data.minBet || 100,
        maxBet: data.maxBet || 1000000,
        allowCustomBet: data.allowCustomBet || false,
        allowMultipleSelections: data.allowMultipleSelections || false,
        allowRepeatBet: data.allowRepeatBet ?? true,
        allowAutoBet: data.allowAutoBet ?? true,
        allowAutoPlay: data.allowAutoPlay || false,
        maxAutoBetRounds: data.maxAutoBetRounds || 100,
      },
    });
  }
}
