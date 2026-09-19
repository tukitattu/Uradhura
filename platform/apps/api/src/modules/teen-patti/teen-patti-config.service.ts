// ============================================================
// DYNAMIC TEEN PATTI CONFIGURATION
// Singleton row (id='global'); every update bumps `version` so
// table runtimes re-resolve the cache. Backend is authoritative:
// the engine reads these values per hand — no code changes needed
// to change rules at runtime.
// ============================================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TENPATTI_RANK_ORDER_DEFAULT } from './engine/evaluator';

export const TP_CONFIG_ID = 'global';

export type TPTieBreak = 'high_card' | 'seed';
export type TPCardVisibility = 'auto_on_cap' | 'manual';

export interface TPPresentationConfig {
  soundEnabled: boolean;
  musicEnabled: boolean;
  theme: {
    background: string;
    primaryColor: string;
    accentColor: string;
    tableColor: string;
    avatar: string;
    logo: string;
  };
  rulesText: string;
  helpText: string;
  locale: string;
}

export interface TPConfig {
  seats: number;
  minPlayers: number;
  minBuyIn: number;
  maxBuyIn: number;
  bootAmount: number;
  chaalCap: number;
  cardsPerPlayer: number;
  deckCount: number;
  chipDenominations: number[];
  rakePercent: number;
  botReserve: number;
  actionTimeoutSeconds: number;
  maxActionsPerHand: number;
  rankingOrder: string[];
  tieBreak: TPTieBreak;
  cardVisibility: TPCardVisibility;
  presentation: TPPresentationConfig;
}

export type TPConfigPatch = Partial<Omit<TPConfig, 'presentation' | 'chipDenominations' | 'rankingOrder'>> & {
  chipDenominations?: number[];
  rankingOrder?: string[];
  presentation?: Partial<TPPresentationConfig>;
};

const RANK_ORDER_SET = new Set(TENPATTI_RANK_ORDER_DEFAULT);

export function defaultTPConfig(): TPConfig {
  return {
    seats: 6,
    minPlayers: 3,
    minBuyIn: 100,
    maxBuyIn: 10000,
    bootAmount: 10,
    chaalCap: 4,
    cardsPerPlayer: 3,
    deckCount: 1,
    chipDenominations: [20, 100, 500, 1000],
    rakePercent: 0,
    botReserve: 50000,
    actionTimeoutSeconds: 60,
    maxActionsPerHand: 400,
    rankingOrder: [...TENPATTI_RANK_ORDER_DEFAULT],
    tieBreak: 'high_card',
    cardVisibility: 'auto_on_cap',
    presentation: {
      soundEnabled: true,
      musicEnabled: true,
      theme: {
        background: '#0b1f3a',
        primaryColor: '#e11d48',
        accentColor: '#fbbf24',
        tableColor: '#14532d',
        avatar: '',
        logo: '',
      },
      rulesText: '',
      helpText: '',
      locale: 'en',
    },
  };
}

export function validateTPConfigPatch(patch: TPConfigPatch): TPConfig {
  const base = defaultTPConfig();
  const next: TPConfig = { ...base, ...patch } as TPConfig;

  if (patch.presentation) next.presentation = { ...base.presentation, ...patch.presentation };

  if (!Number.isInteger(next.seats) || next.seats < 3 || next.seats > 9) {
    throw new BadRequestException('seats must be an integer between 3 and 9');
  }
  if (!Number.isInteger(next.minPlayers) || next.minPlayers < 2 || next.minPlayers > next.seats) {
    throw new BadRequestException('minPlayers must be an integer between 2 and seats');
  }
  if (!Number.isInteger(next.minBuyIn) || next.minBuyIn < 1) throw new BadRequestException('minBuyIn must be >= 1');
  if (!Number.isInteger(next.maxBuyIn) || next.maxBuyIn < next.minBuyIn) throw new BadRequestException('maxBuyIn must be >= minBuyIn');
  if (!Number.isInteger(next.bootAmount) || next.bootAmount < 1) throw new BadRequestException('bootAmount must be >= 1');
  if (!Number.isInteger(next.chaalCap) || next.chaalCap < 1 || next.chaalCap > 20) {
    throw new BadRequestException('chaalCap must be an integer between 1 and 20');
  }
  if (next.cardsPerPlayer !== 3) {
    throw new BadRequestException('cardsPerPlayer must be 3 (v1 only)');
  }
  if (!Number.isInteger(next.deckCount) || next.deckCount < 1 || next.deckCount > 4) {
    throw new BadRequestException('deckCount must be an integer between 1 and 4');
  }
  if (
    !Array.isArray(next.chipDenominations) ||
    next.chipDenominations.length === 0 ||
    next.chipDenominations.some((d) => !Number.isInteger(d) || d <= 0)
  ) {
    throw new BadRequestException('chipDenominations must be a non-empty array of positive integers');
  }
  if (!Number.isInteger(next.rakePercent) || next.rakePercent < 0 || next.rakePercent > 10) {
    throw new BadRequestException('rakePercent must be an integer between 0 and 10');
  }
  if (next.botReserve === undefined) {
    next.botReserve = base.botReserve;
  } else if (!Number.isInteger(next.botReserve) || next.botReserve < 10000) {
    throw new BadRequestException('botReserve must be an integer >= 10000');
  }
  if (!Number.isInteger(next.actionTimeoutSeconds) || next.actionTimeoutSeconds < 10 || next.actionTimeoutSeconds > 600) {
    throw new BadRequestException('actionTimeoutSeconds must be between 10 and 600');
  }
  if (!Number.isInteger(next.maxActionsPerHand) || next.maxActionsPerHand < 20 || next.maxActionsPerHand > 2000) {
    throw new BadRequestException('maxActionsPerHand must be between 20 and 2000');
  }
  if (
    !Array.isArray(next.rankingOrder) ||
    next.rankingOrder.length !== RANK_ORDER_SET.size ||
    new Set(next.rankingOrder).size !== RANK_ORDER_SET.size ||
    next.rankingOrder.some((c) => !RANK_ORDER_SET.has(c))
  ) {
    throw new BadRequestException('rankingOrder must be a permutation of the standard Teen Patti categories');
  }
  if (next.tieBreak !== 'high_card' && next.tieBreak !== 'seed') {
    throw new BadRequestException("tieBreak must be 'high_card' or 'seed'");
  }
  if (next.cardVisibility !== 'auto_on_cap' && next.cardVisibility !== 'manual') {
    throw new BadRequestException("cardVisibility must be 'auto_on_cap' or 'manual'");
  }

  return next;
}

@Injectable()
export class TeenPattiConfigService {
  private cache: { version: number; value: TPConfig } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getConfig(): Promise<{ version: number; value: TPConfig }> {
    if (this.cache) return this.cache;

    let row = await this.prisma.teenPattiConfig.findUnique({ where: { id: TP_CONFIG_ID } });
    if (!row) {
      row = await this.createDefault();
    }
    const value = this.mergeAndValidate(row.config as Prisma.JsonObject);
    this.cache = { version: row.version, value };
    return this.cache;
  }

  async updateConfig(patch: TPConfigPatch, adminId: string): Promise<{ version: number; value: TPConfig }> {
    const current = await this.getConfig();
    const next = validateTPConfigPatch({ ...(current.value as unknown as TPConfigPatch), ...patch });

    const updated = await this.prisma.teenPattiConfig.update({
      where: { id: TP_CONFIG_ID },
      data: {
        config: next as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        updatedBy: { connect: { id: adminId } },
      },
    });

    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'teen_patti.config.updated',
      entityType: 'TeenPattiConfig',
      entityId: TP_CONFIG_ID,
      metadata: { version: updated.version, patch: patch as unknown as Prisma.InputJsonValue },
    });

    this.cache = { version: updated.version, value: next };
    return this.cache;
  }

  async resetToDefaults(adminId: string): Promise<{ version: number; value: TPConfig }> {
    const next = defaultTPConfig();
    const updated = await this.prisma.teenPattiConfig.update({
      where: { id: TP_CONFIG_ID },
      data: {
        config: next as unknown as Prisma.InputJsonValue,
        version: { increment: 1 },
        updatedBy: { connect: { id: adminId } },
      },
    });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'teen_patti.config.reset',
      entityType: 'TeenPattiConfig',
      entityId: TP_CONFIG_ID,
      metadata: { version: updated.version },
    });
    this.cache = { version: updated.version, value: next };
    return this.cache;
  }

  private async createDefault() {
    const value = defaultTPConfig();
    return this.prisma.teenPattiConfig.create({
      data: {
        id: TP_CONFIG_ID,
        version: 1,
        config: value as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Merges stored config onto defaults so schema evolution stays safe.
  private mergeAndValidate(stored: Prisma.JsonObject): TPConfig {
    try {
      return validateTPConfigPatch(stored as unknown as TPConfigPatch);
    } catch {
      const merged = validateTPConfigPatch({ ...(defaultTPConfig() as unknown as TPConfigPatch), ...(stored as unknown as TPConfigPatch) });
      return merged;
    }
  }

  getCached() {
    return this.cache;
  }
}