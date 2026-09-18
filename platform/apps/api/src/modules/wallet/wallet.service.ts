// ============================================================
// WALLET SERVICE — Public wallet facade
//
// All balance mutations delegate to WalletIntegrationService (the
// single atomic, immutable ledger implementation). This facade keeps
// the controller-facing signatures stable.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { WalletIntegrationService } from '../games/wallet-integration.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private ledger: WalletIntegrationService,
  ) {}

  async getBalance(playerId: string) {
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for this player');
    }

    return {
      coinBalance: wallet.coinBalance,
      diamondBalance: wallet.diamondBalance,
      totalCoinsEarned: wallet.totalCoinsEarned,
      totalCoinsSpent: wallet.totalCoinsSpent,
      totalDiamondsEarned: wallet.totalDiamondsEarned,
      totalDiamondsSpent: wallet.totalDiamondsSpent,
    };
  }

  async debit(
    playerId: string,
    amount: number | Decimal,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    currency: 'coins' | 'diamonds' = 'coins',
    createdBy?: string,
  ) {
    return this.withKey(idempotencyKey, () =>
      this.ledger.debit(
        playerId,
        amount,
        referenceType,
        referenceId,
        description,
        idempotencyKey,
        { currency, createdBy },
      ).then((r) => r.transaction),
    );
  }

  async credit(
    playerId: string,
    amount: number | Decimal,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    currency: 'coins' | 'diamonds' = 'coins',
    createdBy?: string,
  ) {
    return this.withKey(idempotencyKey, () =>
      this.ledger.credit(
        playerId,
        amount,
        referenceType,
        referenceId,
        description,
        idempotencyKey,
        { currency, createdBy },
      ).then((r) => r.transaction),
    );
  }

  private async withKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!key || key.trim().length === 0) {
      throw new BadRequestException('idempotencyKey is required for wallet mutations');
    }
    return fn();
  }

  async getTransactionHistory(
    playerId: string,
    page = 1,
    limit = 20,
    filters?: {
      currency?: 'coins' | 'diamonds';
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.WalletTransactionWhereInput = { playerId };

    if (filters?.currency) where.currency = filters.currency;
    if (filters?.type) where.type = filters.type;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adjustBalance(
    playerId: string,
    amount: number | Decimal,
    reason: string,
    adminId: string,
    currency: 'coins' | 'diamonds' = 'coins',
  ) {
    return this.ledger
      .adjustBalance(playerId, amount, reason, adminId, { currency })
      .then((r) => r.transaction);
  }

  // ============================================================
  // BACKWARD-COMPATIBLE ALIASES
  // ============================================================

  async creditCoins(
    playerId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    createdBy?: string,
  ) {
    return this.credit(playerId, amount, referenceType, referenceId, description, idempotencyKey, 'coins', createdBy);
  }

  async debitCoins(
    playerId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    createdBy?: string,
  ) {
    return this.debit(playerId, amount, referenceType, referenceId, description, idempotencyKey, 'coins', createdBy);
  }

  async creditDiamonds(
    playerId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    createdBy?: string,
  ) {
    return this.credit(playerId, amount, referenceType, referenceId, description, idempotencyKey, 'diamonds', createdBy);
  }

  async debitDiamonds(
    playerId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    createdBy?: string,
  ) {
    return this.debit(playerId, amount, referenceType, referenceId, description, idempotencyKey, 'diamonds', createdBy);
  }

  async adminAdjustment(
    playerId: string,
    currency: 'coins' | 'diamonds',
    amount: number,
    adminId: string,
    reason: string,
  ) {
    return this.ledger
      .adjustBalance(playerId, amount, reason, adminId, { currency })
      .then((r) => r.transaction);
  }

  async getStats() {
    return this.getWalletStats();
  }

  async getTransactionHistoryForStats(
    playerId: string,
    page = 1,
    limit = 20,
    filters?: {
      currency?: 'coins' | 'diamonds';
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return this.getTransactionHistory(playerId, page, limit, filters);
  }

  // ============================================================
  // WALLET STATS
  // ============================================================

  async getWalletStats() {
    const [
      totalWallets,
      coinAgg,
      diamondAgg,
      coinEarned,
      coinSpent,
      diamondEarned,
      diamondSpent,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.walletAccount.count(),
      this.prisma.walletAccount.aggregate({ _sum: { coinBalance: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { diamondBalance: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { totalCoinsEarned: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { totalCoinsSpent: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { totalDiamondsEarned: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { totalDiamondsSpent: true } }),
      this.prisma.walletTransaction.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    return {
      totalWallets,
      totalCoinBalance: coinAgg._sum.coinBalance || new Decimal(0),
      totalDiamondBalance: diamondAgg._sum.diamondBalance || new Decimal(0),
      totalCoinsEarned: coinEarned._sum.totalCoinsEarned || new Decimal(0),
      totalCoinsSpent: coinSpent._sum.totalCoinsSpent || new Decimal(0),
      totalDiamondsEarned: diamondEarned._sum.totalDiamondsEarned || new Decimal(0),
      totalDiamondsSpent: diamondSpent._sum.totalDiamondsSpent || new Decimal(0),
      transactionsToday: recentTransactions,
      topEarners: await this.prisma.walletAccount.findMany({
        orderBy: { totalCoinsEarned: 'desc' },
        take: 10,
        select: {
          playerId: true,
          totalCoinsEarned: true,
          totalDiamondsEarned: true,
          player: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
    };
  }
}