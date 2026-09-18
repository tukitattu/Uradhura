// ============================================================
// SETTINGS SERVICE
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value;
  }

  async set(key: string, value: any, category?: string, description?: string, updatedBy?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, category, description, updatedBy },
      create: { key, value, category, description, updatedBy },
    });
  }

  async getAll(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.systemSetting.findMany({ where, orderBy: { key: 'asc' } });
  }

  async delete(key: string) {
    await this.prisma.systemSetting.delete({ where: { key } });
    return { deleted: true };
  }

  async getFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async toggleFeatureFlag(key: string, enabled: boolean, updatedBy?: string) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, updatedBy },
      create: { key, label: key, enabled, updatedBy },
    });
  }

  async getDesignTokens(scope?: string) {
    const where = scope ? { scope } : {};
    return this.prisma.designToken.findMany({ where, orderBy: [{ scope: 'asc' }, { key: 'asc' }] });
  }

  async setDesignToken(scope: string, key: string, value: string, label?: string, updatedBy?: string) {
    return this.prisma.designToken.upsert({
      where: { scope_key: { scope, key } },
      update: { value, label, updatedBy },
      create: { scope, key, value, label, updatedBy },
    });
  }

  async getGameBranding(gameSlug: string) {
    return this.prisma.gameBranding.findUnique({ where: { gameSlug } });
  }

  async setGameBranding(gameSlug: string, data: any, updatedBy?: string) {
    return this.prisma.gameBranding.upsert({
      where: { gameSlug },
      update: { ...data, updatedBy },
      create: { gameSlug, ...data, updatedBy },
    });
  }
}
