// ============================================================
// WALLET SERVICE — IMMUTABLE LEDGER
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

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
    if (amount === undefined || amount === null) {
      throw new BadRequestException('Amount is required');
    }

    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.$queryRaw<
          { id: string; coin_balance: Decimal; diamond_balance: Decimal }[]
        >`SELECT id, coin_balance, diamond_balance FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

        if (!wallet || wallet.length === 0) {
          throw new NotFoundException('Wallet not found for this player');
        }

        const walletRow = wallet[0];
        const currentBalance =
          currency === 'coins' ? walletRow.coin_balance : walletRow.diamond_balance;

        if (currentBalance.lessThan(amountDecimal)) {
          throw new BadRequestException(
            `Insufficient ${currency} balance. Available: ${currentBalance}, Requested: ${amountDecimal}`,
          );
        }

        const newBalance = currentBalance.minus(amountDecimal);
        const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
        const totalSpentField =
          currency === 'coins' ? 'totalCoinsSpent' : 'totalDiamondsSpent';

        const updateData: Prisma.WalletAccountUpdateInput = {
          [balanceField]: newBalance,
        };
        updateData[totalSpentField] = { increment: amountDecimal };

        const updatedWallet = await tx.walletAccount.update({
          where: { id: walletRow.id },
          data: updateData,
        });

        const debitTypeMap: Record<string, string> = {
          coins: 'bet_debit',
          diamonds: 'gift_send',
        };

        const transaction = await tx.walletTransaction.create({
          data: {
            walletAccountId: walletRow.id,
            playerId,
            type: debitTypeMap[currency],
            currency,
            amount: amountDecimal,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            referenceType,
            referenceId,
            description,
            idempotencyKey,
            createdBy,
          },
        });

        return transaction;
      },
      { timeout: 10000 },
    );

    return result;
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
    if (amount === undefined || amount === null) {
      throw new BadRequestException('Amount is required');
    }

    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.$queryRaw<
          { id: string; coin_balance: Decimal; diamond_balance: Decimal }[]
        >`SELECT id, coin_balance, diamond_balance FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

        if (!wallet || wallet.length === 0) {
          throw new NotFoundException('Wallet not found for this player');
        }

        const walletRow = wallet[0];
        const currentBalance =
          currency === 'coins' ? walletRow.coin_balance : walletRow.diamond_balance;

        const newBalance = currentBalance.plus(amountDecimal);
        const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
        const totalEarnedField =
          currency === 'coins' ? 'totalCoinsEarned' : 'totalDiamondsEarned';

        const updateData: Prisma.WalletAccountUpdateInput = {
          [balanceField]: newBalance,
        };
        updateData[totalEarnedField] = { increment: amountDecimal };

        await tx.walletAccount.update({
          where: { id: walletRow.id },
          data: updateData,
        });

        const creditTypeMap: Record<string, string> = {
          coins: 'bet_credit',
          diamonds: 'gift_receive',
        };

        const transaction = await tx.walletTransaction.create({
          data: {
            walletAccountId: walletRow.id,
            playerId,
            type: creditTypeMap[currency],
            currency,
            amount: amountDecimal,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            referenceType,
            referenceId,
            description,
            idempotencyKey,
            createdBy,
          },
        });

        return transaction;
      },
      { timeout: 10000 },
    );

    return result;
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
    const amountDecimal = new Decimal(amount);

    if (amountDecimal.eq(0)) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for admin adjustments');
    }

    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    const idempotencyKey = `admin-adjust-${adminId}-${playerId}-${currency}-${randomUUID()}`;

    const wallet = await this.prisma.walletAccount.findUnique({ where: { playerId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (amountDecimal.lt(0)) {
      const currentBalance =
        currency === 'coins' ? wallet.coinBalance : wallet.diamondBalance;
      if (currentBalance.lessThan(amountDecimal.abs())) {
        throw new BadRequestException(
          `Adjustment would result in negative balance. Available: ${currentBalance}, Debit: ${amountDecimal.abs()}`,
        );
      }
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const walletRow = await tx.$queryRaw<
          { id: string; coin_balance: Decimal; diamond_balance: Decimal }[]
        >`SELECT id, coin_balance, diamond_balance FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

        if (!walletRow || walletRow.length === 0) {
          throw new NotFoundException('Wallet not found');
        }

        const walletData = walletRow[0];
        const currentBalance =
          currency === 'coins' ? walletData.coin_balance : walletData.diamond_balance;
        const newBalance = currentBalance.plus(amountDecimal);

        if (newBalance.lessThan(0)) {
          throw new BadRequestException(
            `Adjustment would result in negative balance. Available: ${currentBalance}, Adjustment: ${amountDecimal}`,
          );
        }

        const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
        const totalEarnedField =
          currency === 'coins' ? 'totalCoinsEarned' : 'totalDiamondsEarned';
        const totalSpentField =
          currency === 'coins' ? 'totalCoinsSpent' : 'totalDiamondsSpent';

        const updateData: Prisma.WalletAccountUpdateInput = {
          [balanceField]: newBalance,
        };

        if (amountDecimal.gte(0)) {
          updateData[totalEarnedField] = { increment: amountDecimal };
        } else {
          updateData[totalSpentField] = { increment: amountDecimal.abs() };
        }

        await tx.walletAccount.update({
          where: { id: walletData.id },
          data: updateData,
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            walletAccountId: walletData.id,
            playerId,
            type: 'admin_adjustment',
            currency,
            amount: amountDecimal,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            referenceType: 'admin',
            referenceId: adminId,
            description: `Admin adjustment: ${reason}`,
            idempotencyKey,
            metadata: JSON.stringify({
              adjustmentReason: reason,
              adjustedBy: adminId,
            }),
            createdBy: adminId,
          },
        });

        return transaction;
      },
      { timeout: 10000 },
    );

    return result;
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
    return this.adjustBalance(playerId, amount, reason, adminId, currency);
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
      topEarners,
    ] = await Promise.all([
      this.prisma.walletAccount.count(),
      this.prisma.walletAccount.aggregate({
        _sum: { coinBalance: true },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: { diamondBalance: true },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: { totalCoinsEarned: true },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: { totalCoinsSpent: true },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: { totalDiamondsEarned: true },
      }),
      this.prisma.walletAccount.aggregate({
        _sum: { totalDiamondsSpent: true },
      }),
      this.prisma.walletTransaction.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.walletAccount.findMany({
        orderBy: { totalCoinsEarned: 'desc' },
        take: 10,
        select: {
          playerId: true,
          totalCoinsEarned: true,
          totalDiamondsEarned: true,
          player: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
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
      topEarners,
    };
  }
}
