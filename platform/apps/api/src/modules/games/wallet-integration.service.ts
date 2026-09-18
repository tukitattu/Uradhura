// ============================================================
// WALLET INTEGRATION SERVICE — Atomic Wallet Operations
// All balance mutations use Prisma interactive transactions
// to guarantee ACID properties on the ledger.
// ============================================================

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletAccount, WalletTransaction, Prisma } from '@prisma/client';

@Injectable()
export class WalletIntegrationService {
  private readonly logger = new Logger(WalletIntegrationService.name);

  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------------
  // Core mutations
  // ----------------------------------------------------------

  /**
   * Atomically debits coins from a player's wallet.
   *
   * Steps inside a single transaction:
   *   1. Lock and read the wallet account (SELECT ... FOR UPDATE equivalent)
   *   2. Verify sufficient balance
   *   3. Create an immutable WalletTransaction record
   *   4. Update WalletAccount balances
   *
   * @throws NotFoundException if player has no wallet
   * @throws BadRequestException if insufficient balance
   * @throws ConflictException if idempotencyKey already used
   */
  async debit(
    playerId: string,
    amount: Decimal | number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const debitAmount = new Decimal(amount);

    if (debitAmount.lte(0)) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const key = idempotencyKey ?? `debit_${playerId}_${referenceId}_${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      // Lock wallet row
      const wallet = await tx.$queryRaw<
        WalletAccount[]
      >`SELECT * FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

      if (!wallet || wallet.length === 0) {
        throw new NotFoundException('Player wallet not found');
      }

      const walletRow = wallet[0];

      if (new Decimal(walletRow.coinBalance).lt(debitAmount)) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${walletRow.coinBalance}, requested: ${debitAmount}`,
        );
      }

      const newBalance = new Decimal(walletRow.coinBalance).sub(debitAmount);

      const transaction = await tx.walletTransaction.create({
        data: {
          walletAccountId: walletRow.id,
          playerId,
          type: 'bet_debit',
          currency: 'coins',
          amount: debitAmount,
          balanceBefore: new Decimal(walletRow.coinBalance),
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          description,
          idempotencyKey: key,
        },
      });

      const updatedWallet = await tx.walletAccount.update({
        where: { id: walletRow.id },
        data: {
          coinBalance: newBalance,
          totalCoinsSpent: new Decimal(walletRow.totalCoinsSpent).add(debitAmount),
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Atomically credits coins to a player's wallet.
   *
   * Steps inside a single transaction:
   *   1. Lock and read the wallet account
   *   2. Create an immutable WalletTransaction record
   *   3. Update WalletAccount balances
   *
   * @throws NotFoundException if player has no wallet
   * @throws ConflictException if idempotencyKey already used
   */
  async credit(
    playerId: string,
    amount: Decimal | number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const creditAmount = new Decimal(amount);

    if (creditAmount.lte(0)) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const key = idempotencyKey ?? `credit_${playerId}_${referenceId}_${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.$queryRaw<
        WalletAccount[]
      >`SELECT * FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

      if (!wallet || wallet.length === 0) {
        throw new NotFoundException('Player wallet not found');
      }

      const walletRow = wallet[0];
      const newBalance = new Decimal(walletRow.coinBalance).add(creditAmount);

      const transaction = await tx.walletTransaction.create({
        data: {
          walletAccountId: walletRow.id,
          playerId,
          type: 'bet_credit',
          currency: 'coins',
          amount: creditAmount,
          balanceBefore: new Decimal(walletRow.coinBalance),
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          description,
          idempotencyKey: key,
        },
      });

      const updatedWallet = await tx.walletAccount.update({
        where: { id: walletRow.id },
        data: {
          coinBalance: newBalance,
          totalCoinsEarned: new Decimal(walletRow.totalCoinsEarned).add(creditAmount),
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  // ----------------------------------------------------------
  // Balance queries
  // ----------------------------------------------------------

  /**
   * Returns the coin and diamond balances for a player.
   * Creates a wallet on first access if none exists.
   */
  async getBalance(
    playerId: string,
  ): Promise<{ coinBalance: Decimal; diamondBalance: Decimal }> {
    let wallet = await this.prisma.walletAccount.findUnique({
      where: { playerId },
      select: { coinBalance: true, diamondBalance: true },
    });

    if (!wallet) {
      wallet = await this.prisma.walletAccount.create({
        data: { playerId },
        select: { coinBalance: true, diamondBalance: true },
      });
    }

    return {
      coinBalance: new Decimal(wallet.coinBalance),
      diamondBalance: new Decimal(wallet.diamondBalance),
    };
  }

  /**
   * Returns the full wallet record for a player.
   */
  async getWallet(playerId: string): Promise<WalletAccount> {
    let wallet = await this.prisma.walletAccount.findUnique({
      where: { playerId },
    });

    if (!wallet) {
      wallet = await this.prisma.walletAccount.create({
        data: { playerId },
      });
    }

    return wallet;
  }

  // ----------------------------------------------------------
  // Transaction history
  // ----------------------------------------------------------

  /**
   * Returns a paginated list of wallet transactions for a player,
   * ordered by most recent first.
   */
  async getTransactionHistory(
    playerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    transactions: WalletTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.walletTransaction.count({
        where: { playerId },
      }),
    ]);

    return {
      transactions,
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  // ----------------------------------------------------------
  // Admin operations
  // ----------------------------------------------------------

  /**
   * Admin adjustment to a player's balance.
   * Creates an auditable transaction with the admin's ID.
   *
   * @param playerId - The player to adjust
   * @param amount   - Positive to credit, negative to debit
   * @param reason   - Human-readable reason for the audit trail
   * @param adminId  - The admin performing the adjustment
   */
  async adjustBalance(
    playerId: string,
    amount: Decimal | number,
    reason: string,
    adminId: string,
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const adjustmentAmount = new Decimal(amount);

    if (adjustmentAmount.eq(0)) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for admin adjustments');
    }

    if (!adminId || adminId.trim().length === 0) {
      throw new BadRequestException('Admin ID is required');
    }

    const isCredit = adjustmentAmount.gt(0);
    const key = `admin_adj_${playerId}_${adminId}_${Date.now()}`;

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.$queryRaw<
        WalletAccount[]
      >`SELECT * FROM wallet_accounts WHERE player_id = ${playerId} FOR UPDATE`;

      if (!wallet || wallet.length === 0) {
        throw new NotFoundException('Player wallet not found');
      }

      const walletRow = wallet[0];

      if (!isCredit) {
        const absAmount = adjustmentAmount.abs();
        if (new Decimal(walletRow.coinBalance).lt(absAmount)) {
          throw new BadRequestException(
            `Insufficient balance for debit adjustment. Available: ${walletRow.coinBalance}, requested: ${absAmount}`,
          );
        }
      }

      const newBalance = new Decimal(walletRow.coinBalance).add(adjustmentAmount);

      const transaction = await tx.walletTransaction.create({
        data: {
          walletAccountId: walletRow.id,
          playerId,
          type: 'admin_adjustment',
          currency: 'coins',
          amount: adjustmentAmount.abs(),
          balanceBefore: new Decimal(walletRow.coinBalance),
          balanceAfter: newBalance,
          referenceType: 'admin',
          referenceId: adminId,
          description: reason,
          idempotencyKey: key,
          createdBy: adminId,
          metadata: JSON.stringify({
            adjustmentType: isCredit ? 'credit' : 'debit',
            originalAmount: adjustmentAmount.toString(),
          }),
        },
      });

      const updatedWallet = await tx.walletAccount.update({
        where: { id: walletRow.id },
        data: {
          coinBalance: newBalance,
          ...(isCredit
            ? {
                totalCoinsEarned: new Decimal(walletRow.totalCoinsEarned).add(
                  adjustmentAmount,
                ),
              }
            : {
                totalCoinsSpent: new Decimal(walletRow.totalCoinsSpent).add(
                  adjustmentAmount.abs(),
                ),
              }),
        },
      });

      this.logger.log(
        `Admin ${adminId} adjusted player ${playerId} balance by ${adjustmentAmount}: ${reason}`,
      );

      return { wallet: updatedWallet, transaction };
    });
  }
}
