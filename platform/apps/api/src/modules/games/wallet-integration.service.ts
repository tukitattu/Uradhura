// ============================================================
// WALLET INTEGRATION SERVICE — ATOMIC IMMUTABLE LEDGER
//
// Every balance mutation:
//   • runs inside a single interactive transaction
//   • locks the wallet row with `SELECT ... FOR UPDATE`
//   • writes an immutable WalletTransaction row (idempotencyKey UNIQUE)
//   • never lets a balance go below zero
//
// Optional `tx` parameter lets callers run a wallet movement and a
// domain write (e.g. GameBet) inside the SAME transaction, so a failed
// domain write rolls back the balance change too (no ghost debits).
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
import { WalletAccount, WalletTransaction, WalletTransfer, Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

export interface WalletMovementOptions {
  tx?: TxClient;
  type?: string;
  currency?: 'coins' | 'diamonds';
  metadata?: Prisma.InputJsonValue;
  createdBy?: string;
}

@Injectable()
export class WalletIntegrationService {
  private readonly logger = new Logger(WalletIntegrationService.name);

  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------------
  // Wallet row helpers
  // ----------------------------------------------------------

  /**
   * Runs `fn` inside a transaction. If the caller already opened one
   * (opts.tx), the callback reuses it so domain writes and balance
   * movements commit atomically. Otherwise a fresh interactive
   * transaction is created.
   */
  private async runInTx<T>(
    db: PrismaService | TxClient,
    fn: (tx: TxClient) => Promise<T>,
  ): Promise<T> {
    const anyDb = db as unknown as { $transaction?: (cb: (tx: TxClient) => Promise<T>) => Promise<T> };
    if (typeof anyDb.$transaction === 'function') {
      return anyDb.$transaction(fn);
    }
    return fn(db as TxClient);
  }

  private async walletRow(tx: TxClient, playerId: string): Promise<WalletAccount> {
    const rows = await tx.$queryRaw<WalletAccount[]>`
      SELECT * FROM wallet_accounts WHERE "playerId" = ${playerId} FOR UPDATE
    `;
    if (rows && rows.length > 0) {
      return rows[0];
    }
    // Auto-create the wallet on first use (e.g. a fresh player's very first
    // credit/purchase). Prisma generates the UUID client-side; upsert is
    // safe under concurrency thanks to the unique playerId.
    await tx.walletAccount.upsert({
      where: { playerId },
      update: {},
      create: { playerId },
    });
    const created = await tx.$queryRaw<WalletAccount[]>`
      SELECT * FROM wallet_accounts WHERE "playerId" = ${playerId} FOR UPDATE
    `;
    if (!created || created.length === 0) {
      throw new NotFoundException('Player wallet not found');
    }
    return created[0];
  }

  private balanceOf(wallet: WalletAccount, currency: 'coins' | 'diamonds'): Decimal {
    return new Decimal(currency === 'coins' ? wallet.coinBalance : wallet.diamondBalance);
  }

  private async writeMovement(
    tx: TxClient,
    playerId: string,
    wallet: WalletAccount,
    currency: 'coins' | 'diamonds',
    type: string,
    amount: Decimal,
    newBalance: Decimal,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    createdBy?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<WalletTransaction> {
    try {
      return await tx.walletTransaction.create({
        data: {
          walletAccountId: wallet.id,
          playerId,
          type,
          currency,
          amount,
          balanceBefore: this.balanceOf(wallet, currency),
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          description,
          idempotencyKey,
          createdBy,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Duplicate idempotency key');
      }
      throw e;
    }
  }

  // ----------------------------------------------------------
  // Core mutations
  // ----------------------------------------------------------

  async debit(
    playerId: string,
    amount: Decimal | number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    opts: { tx?: TxClient; type?: string; currency?: 'coins' | 'diamonds'; createdBy?: string; metadata?: Prisma.InputJsonValue } = {},
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const debitAmount = new Decimal(amount);
    const currency = opts.currency ?? 'coins';
    const type = opts.type ?? (currency === 'coins' ? 'bet_debit' : 'bet_debit');

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('idempotencyKey is required for wallet mutations');
    }
    if (debitAmount.lte(0)) {
      throw new BadRequestException('Debit amount must be positive');
    }

    const db = opts.tx ?? this.prisma;

    return this.runInTx(db, async (tx) => {
      const existing = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { wallet: await this.walletRow(tx, playerId), transaction: existing };
      }

      const walletRow = await this.walletRow(tx, playerId);
      const currentBalance = this.balanceOf(walletRow, currency);

      if (currentBalance.lt(debitAmount)) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${currentBalance}, requested: ${debitAmount}`,
        );
      }

      const newBalance = currentBalance.sub(debitAmount);

      const transaction = await this.writeMovement(
        tx,
        playerId,
        walletRow,
        currency,
        type,
        debitAmount,
        newBalance,
        referenceType,
        referenceId,
        description,
        idempotencyKey,
        opts.createdBy,
        opts.metadata,
      );

      const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
      const spentField = currency === 'coins' ? 'totalCoinsSpent' : 'totalDiamondsSpent';

      const updatedWallet = await tx.walletAccount.update({
        where: { id: walletRow.id },
        data: {
          [balanceField]: newBalance,
          [spentField]: new Decimal(walletRow[spentField]).add(debitAmount),
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  async credit(
    playerId: string,
    amount: Decimal | number,
    referenceType: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
    opts: { tx?: TxClient; type?: string; currency?: 'coins' | 'diamonds'; createdBy?: string; metadata?: Prisma.InputJsonValue } = {},
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const creditAmount = new Decimal(amount);
    const currency = opts.currency ?? 'coins';
    const type = opts.type ?? (currency === 'coins' ? 'bet_credit' : 'bet_credit');

    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestException('idempotencyKey is required for wallet mutations');
    }
    if (creditAmount.lte(0)) {
      throw new BadRequestException('Credit amount must be positive');
    }

    const db = opts.tx ?? this.prisma;

    return this.runInTx(db, async (tx) => {
      const existing = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { wallet: await this.walletRow(tx, playerId), transaction: existing };
      }

      const walletRow = await this.walletRow(tx, playerId);
      const currentBalance = this.balanceOf(walletRow, currency);
      const newBalance = currentBalance.add(creditAmount);

      const transaction = await this.writeMovement(
        tx,
        playerId,
        walletRow,
        currency,
        type,
        creditAmount,
        newBalance,
        referenceType,
        referenceId,
        description,
        idempotencyKey,
        opts.createdBy,
        opts.metadata,
      );

      const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
      const earnedField = currency === 'coins' ? 'totalCoinsEarned' : 'totalDiamondsEarned';

      const updatedWallet = await tx.walletAccount.update({
        where: { id: walletRow.id },
        data: {
          [balanceField]: newBalance,
          [earnedField]: new Decimal(walletRow[earnedField]).add(creditAmount),
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Atomic, idempotent player-to-player transfer.
   * Sender is debited amount+fee, receiver is credited amount, all in ONE
   * transaction keyed by the unique `txRef`. A replay with the same txRef
   * returns the original transfer without moving money twice.
   */
  async transfer(
    senderId: string,
    receiverId: string,
    amount: Decimal | number,
    currency: 'coins' | 'diamonds',
    fee: Decimal | number,
    txRef: string,
    note?: string,
    opts: { tx?: TxClient; createdBy?: string } = {},
  ): Promise<{ transfer: WalletTransfer; senderWallet: WalletAccount; receiverWallet: WalletAccount }> {
    const transferAmount = new Decimal(amount);
    const feeAmount = new Decimal(fee);

    if (!txRef || txRef.trim().length === 0) {
      throw new BadRequestException('txRef is required for transfers');
    }
    if (transferAmount.lte(0)) {
      throw new BadRequestException('Transfer amount must be positive');
    }
    if (feeAmount.lt(0)) {
      throw new BadRequestException('Transfer fee cannot be negative');
    }
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    const db = opts.tx ?? this.prisma;

    return this.runInTx(db, async (tx) => {
      const existing = await tx.walletTransfer.findUnique({ where: { txRef } });
      if (existing) {
        const senderWallet = await this.walletRow(tx, senderId);
        const receiverWallet = await this.walletRow(tx, receiverId);
        return { transfer: existing, senderWallet, receiverWallet };
      }

      // Lock both wallets in a canonical order to avoid deadlocks.
      const [aId, bId] = [senderId, receiverId].sort();
      const rows = await tx.$queryRaw<WalletAccount[]>`
        SELECT * FROM wallet_accounts WHERE "playerId" IN (${aId}, ${bId}) ORDER BY "playerId" FOR UPDATE
      `;
      if (!rows || rows.length !== 2) {
        throw new NotFoundException('One or both wallets not found');
      }
      const senderWallet = rows.find((r) => r.playerId === senderId)!;
      const receiverWallet = rows.find((r) => r.playerId === receiverId)!;

      const senderBalance = this.balanceOf(senderWallet, currency);
      const totalDebit = transferAmount.add(feeAmount);

      if (senderBalance.lt(totalDebit)) {
        throw new BadRequestException(
          `Insufficient balance for transfer. Available: ${senderBalance}, needed: ${totalDebit}`,
        );
      }

      const senderNewBalance = senderBalance.sub(totalDebit);
      const receiverNewBalance = this.balanceOf(receiverWallet, currency).add(transferAmount);
      const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
      const sentField = currency === 'coins' ? 'totalCoinsSpent' : 'totalDiamondsSpent';
      const receivedField = currency === 'coins' ? 'totalCoinsEarned' : 'totalDiamondsEarned';

      await this.writeMovement(
        tx,
        senderId,
        senderWallet,
        currency,
        currency === 'coins' ? 'transfer_send' : 'transfer_send',
        totalDebit,
        senderNewBalance,
        'wallet_transfer',
        txRef,
        note ? `Transfer to ${receiverId}: ${note}` : `Transfer to ${receiverId}`,
        `transfer-send-${txRef}`,
        opts.createdBy,
      );

      if (feeAmount.gt(0)) {
        await tx.walletTransaction.create({
          data: {
            walletAccountId: senderWallet.id,
            playerId: senderId,
            type: 'transfer_fee',
            currency,
            amount: feeAmount,
            balanceBefore: new Decimal(senderBalance),
            balanceAfter: senderNewBalance.add(transferAmount),
            referenceType: 'wallet_transfer',
            referenceId: txRef,
            description: `Transfer fee`,
            idempotencyKey: `transfer-fee-${txRef}`,
            createdBy: opts.createdBy,
          },
        });
      }

      const senderUpdated = await tx.walletAccount.update({
        where: { id: senderWallet.id },
        data: {
          [balanceField]: senderNewBalance,
          [sentField]: new Decimal(senderWallet[sentField]).add(totalDebit),
        },
      });

      // Receiver-side immutable ledger row (balance changes must be
      // traceable on BOTH ends of a transfer).
      await this.writeMovement(
        tx,
        receiverId,
        receiverWallet,
        currency,
        currency === 'coins' ? 'transfer_receive' : 'transfer_receive',
        transferAmount,
        receiverNewBalance,
        'wallet_transfer',
        txRef,
        note ? `Received transfer from ${senderId}: ${note}` : `Received transfer from ${senderId}`,
        `transfer-receive-${txRef}`,
        opts.createdBy,
      );

      const receiverUpdated = await tx.walletAccount.update({
        where: { id: receiverWallet.id },
        data: {
          [balanceField]: receiverNewBalance,
          [receivedField]: new Decimal(receiverWallet[receivedField]).add(transferAmount),
        },
      });

      const transfer = await tx.walletTransfer.create({
        data: {
          senderId,
          receiverId,
          currency,
          amount: transferAmount,
          fee: feeAmount,
          txRef,
          note,
          metadata: undefined,
        },
      });

      return {
        transfer,
        senderWallet: senderUpdated as WalletAccount,
        receiverWallet: receiverUpdated as WalletAccount,
      };
    });
  }

  /**
   * Credit a player's wallet after a verified payment. Idempotent by order id.
   */
  async creditPayment(
    playerId: string,
    amount: Decimal | number,
    currency: 'coins' | 'diamonds',
    paymentOrderId: string,
    description: string,
    createdBy?: string,
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const key = `payment-${currency}-${paymentOrderId}`;
    return this.credit(playerId, amount, 'payment', paymentOrderId, description, key, {
      type: currency === 'coins' ? 'coin_purchase' : 'diamond_purchase',
      currency,
      createdBy,
      metadata: { paymentOrderId },
    });
  }

  // ----------------------------------------------------------
  // Balance queries
  // ----------------------------------------------------------

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

  async getTransactionHistory(
    playerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: WalletTransaction[]; total: number; page: number; totalPages: number }> {
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
      this.prisma.walletTransaction.count({ where: { playerId } }),
    ]);

    return { transactions, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }

  // ----------------------------------------------------------
  // Admin operations
  // ----------------------------------------------------------

  async adjustBalance(
    playerId: string,
    amount: Decimal | number,
    reason: string,
    adminId: string,
    opts: { tx?: TxClient; currency?: 'coins' | 'diamonds'; idempotencyKey?: string } = {},
  ): Promise<{ wallet: WalletAccount; transaction: WalletTransaction }> {
    const adjustmentAmount = new Decimal(amount);
    const currency = opts.currency ?? 'coins';

    if (adjustmentAmount.eq(0)) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reason is required for admin adjustments');
    }
    if (!adminId || adminId.trim().length === 0) {
      throw new BadRequestException('Admin ID is required');
    }

    const key =
      opts.idempotencyKey ??
      `admin_adj_${playerId}_${adminId}_${currency}_${new Date().toISOString()}`;

    const db = opts.tx ?? this.prisma;

    return this.runInTx(db, async (tx) => {
      const existing = await tx.walletTransaction.findUnique({
        where: { idempotencyKey: key },
      });
      if (existing) {
        return { wallet: await this.walletRow(tx, playerId), transaction: existing };
      }

      const walletRow = await this.walletRow(tx, playerId);
      const isCredit = adjustmentAmount.gt(0);
      const currentBalance = this.balanceOf(walletRow, currency);

      if (!isCredit && currentBalance.lt(adjustmentAmount.abs())) {
        throw new BadRequestException(
          `Insufficient balance for debit adjustment. Available: ${currentBalance}, requested: ${adjustmentAmount.abs()}`,
        );
      }

      const newBalance = currentBalance.add(adjustmentAmount);
      const balanceField = currency === 'coins' ? 'coinBalance' : 'diamondBalance';
      const earnedField = currency === 'coins' ? 'totalCoinsEarned' : 'totalDiamondsEarned';
      const spentField = currency === 'coins' ? 'totalCoinsSpent' : 'totalDiamondsSpent';

      const transaction = await tx.walletTransaction.create({
        data: {
          walletAccountId: walletRow.id,
          playerId,
          type: 'admin_adjustment',
          currency,
          amount: adjustmentAmount.abs(),
          balanceBefore: currentBalance,
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
          [balanceField]: newBalance,
          ...(isCredit
            ? { [earnedField]: new Decimal(walletRow[earnedField]).add(adjustmentAmount) }
            : { [spentField]: new Decimal(walletRow[spentField]).add(adjustmentAmount.abs()) }),
        },
      });

      this.logger.log(
        `Admin ${adminId} adjusted player ${playerId} balance by ${adjustmentAmount} (${currency}): ${reason}`,
      );

      return { wallet: updatedWallet, transaction };
    });
  }
}