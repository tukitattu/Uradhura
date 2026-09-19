import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { createAuditLog } from './audit.service';

export class WalletError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'WalletError';
  }
}

export async function getBalance(playerId: string): Promise<number> {
  const wallet = await prisma.walletAccount.findUnique({
    where: { playerId },
  });
  if (!wallet) throw new WalletError('Wallet not found', 'WALLET_NOT_FOUND');
  return wallet.balance;
}

export async function debitWallet(
  playerId: string,
  amount: number,
  reference: string,
  description: string,
  idempotencyKey: string
): Promise<{ balance: number; txId: string }> {
  // Check idempotency - if transaction already exists, return it
  const existing = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return { balance: existing.balanceAfter, txId: existing.id };
  }

  // Use a serialized update to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.walletAccount.findUnique({
      where: { playerId },
    });
    if (!wallet) throw new WalletError('Wallet not found', 'WALLET_NOT_FOUND');
    if (wallet.balance < amount) {
      throw new WalletError('Insufficient balance', 'INSUFFICIENT_BALANCE');
    }

    const newBalance = wallet.balance - amount;
    const updated = await tx.walletAccount.update({
      where: { playerId },
      data: {
        balance: newBalance,
        totalLost: wallet.totalLost + amount,
      },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        id: uuidv4(),
        walletAccountId: wallet.id,
        type: 'debit',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        reference,
        description,
        idempotencyKey,
      },
    });

    return { balance: updated.balance, txId: txRecord.id };
  });

  await createAuditLog({
    actorId: playerId,
    actorType: 'player',
    action: 'WALLET_DEBIT',
    entityType: 'wallet',
    entityId: playerId,
    after: { amount, reference },
  });

  return result;
}

export async function creditWallet(
  playerId: string,
  amount: number,
  reference: string,
  description: string,
  idempotencyKey: string
): Promise<{ balance: number; txId: string }> {
  // Idempotency guard
  const existing = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return { balance: existing.balanceAfter, txId: existing.id };
  }

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.walletAccount.findUnique({
      where: { playerId },
    });
    if (!wallet) throw new WalletError('Wallet not found', 'WALLET_NOT_FOUND');

    const newBalance = wallet.balance + amount;
    const updated = await tx.walletAccount.update({
      where: { playerId },
      data: {
        balance: newBalance,
        totalWon: wallet.totalWon + amount,
      },
    });

    const txRecord = await tx.walletTransaction.create({
      data: {
        id: uuidv4(),
        walletAccountId: wallet.id,
        type: 'credit',
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        reference,
        description,
        idempotencyKey,
      },
    });

    return { balance: updated.balance, txId: txRecord.id };
  });

  return result;
}

export async function adminAdjustTokens(
  playerId: string,
  amount: number, // positive = add, negative = remove
  adminId: string,
  description: string
): Promise<{ balance: number }> {
  const idempotencyKey = `admin-adjust-${adminId}-${playerId}-${Date.now()}`;

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await tx.walletAccount.findUnique({ where: { playerId } });
    if (!wallet) throw new WalletError('Wallet not found', 'WALLET_NOT_FOUND');

    const newBalance = Math.max(0, wallet.balance + amount);
    const updated = await tx.walletAccount.update({
      where: { playerId },
      data: { balance: newBalance },
    });

    await tx.walletTransaction.create({
      data: {
        id: uuidv4(),
        walletAccountId: wallet.id,
        type: 'adjustment',
        amount: Math.abs(amount),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        reference: `admin:${adminId}`,
        description,
        idempotencyKey,
      },
    });

    return { balance: updated.balance };
  });

  await createAuditLog({
    actorId: adminId,
    actorType: 'admin',
    action: 'ADMIN_TOKEN_ADJUSTMENT',
    entityType: 'wallet',
    entityId: playerId,
    after: { amount, description },
  });

  return result;
}
