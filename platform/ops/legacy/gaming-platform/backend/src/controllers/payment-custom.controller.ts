import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { creditWallet } from '../services/wallet.service';
import { createAuditLog } from '../services/audit.service';
import { emitBalanceUpdate } from '../services/websocket.service';

/**
 * POST /payments/purchase
 * Custom payment flow: player selects a token package, platform creates
 * an order, and the player completes payment externally (bank transfer, 
 * mobile money, UPI, etc). The order stays pending until confirmed.
 */
export async function initiateCustomPayment(req: Request, res: Response): Promise<void> {
  const { packageId, paymentMethod, reference } = req.body;
  const playerId = req.player!.playerId;

  if (!packageId || !paymentMethod) {
    sendError(res, 'packageId and paymentMethod are required', 'VALIDATION_ERROR');
    return;
  }

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) {
    sendError(res, 'Package not found or inactive', 'NOT_FOUND', 404);
    return;
  }

  const order = await prisma.paymentOrder.create({
    data: {
      id: uuidv4(),
      playerId,
      packageId,
      provider: paymentMethod,
      currency: 'USD',
      amountCents: Math.round(pkg.priceUsd * 100),
      tokenAmount: pkg.baseTokens + pkg.bonusTokens,
      status: 'pending',
      metadata: JSON.stringify({ paymentMethod, reference: reference || null }),
    },
  });

  await createAuditLog({
    actorId: playerId, actorType: 'player',
    action: 'PAYMENT_INITIATED', entityType: 'payment_order', entityId: order.id,
    after: { packageId, paymentMethod, amountCents: order.amountCents, tokenAmount: order.tokenAmount },
  });

  sendSuccess(res, {
    orderId: order.id,
    status: 'pending',
    amountCents: order.amountCents,
    tokenAmount: order.tokenAmount,
    paymentMethod,
    instructions: getPaymentInstructions(paymentMethod, order.amountCents),
  }, 'Payment order created', 201);
}

function getPaymentInstructions(method: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);
  switch (method) {
    case 'bank_transfer': return `Transfer $${amount} to the displayed bank account. Include your order ID in the reference.`;
    case 'mobile_money': return `Send $${amount} via mobile money to the displayed number. Use your order ID as reference.`;
    case 'upi': return `Pay $${amount} via UPI to the displayed VPA. Include your order ID in notes.`;
    case 'crypto': return `Send exactly $${amount} equivalent in USDT/USDC to the displayed wallet address.`;
    default: return `Complete payment of $${amount} using ${method}.`;
  }
}

/**
 * POST /payments/confirm/:orderId
 * Admin confirms a payment order (after verifying external payment).
 */
export async function confirmPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const { notes } = req.body;
  const adminId = req.player!.playerId;

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    sendError(res, 'Order not found', 'NOT_FOUND', 404);
    return;
  }
  if (order.status !== 'pending') {
    sendError(res, `Order is already ${order.status}`, 'INVALID_STATE', 409);
    return;
  }

  // Complete the order and credit wallet atomically
  await prisma.$transaction(async (tx) => {
    await tx.paymentOrder.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        receiptData: JSON.stringify({ confirmedBy: adminId, notes, confirmedAt: new Date().toISOString() }),
      },
    });
  });

  await creditWallet(
    order.playerId,
    order.tokenAmount,
    `payment:${orderId}`,
    `Token purchase: ${order.tokenAmount} tokens`,
    `payment-credit-${orderId}`
  );

  // Emit real-time balance update
  emitBalanceUpdate(order.playerId, 0); // Client will refresh balance

  await createAuditLog({
    actorId: adminId, actorType: 'admin',
    action: 'PAYMENT_CONFIRMED', entityType: 'payment_order', entityId: orderId,
    after: { tokenAmount: order.tokenAmount, confirmedBy: adminId },
  });

  sendSuccess(res, { orderId, status: 'completed', tokenAmount: order.tokenAmount }, 'Payment confirmed');
}

/**
 * POST /payments/cancel/:orderId
 * Cancel a pending payment order.
 */
export async function cancelPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.params;
  const { reason } = req.body;

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    sendError(res, 'Order not found', 'NOT_FOUND', 404);
    return;
  }
  if (order.status !== 'pending') {
    sendError(res, `Order is already ${order.status}`, 'INVALID_STATE', 409);
    return;
  }

  await prisma.paymentOrder.update({
    where: { id: orderId },
    data: {
      status: 'failed',
      receiptData: JSON.stringify({ cancelledAt: new Date().toISOString(), reason }),
    },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'admin',
    action: 'PAYMENT_CANCELLED', entityType: 'payment_order', entityId: orderId,
    after: { reason },
  });

  sendSuccess(res, { orderId, status: 'failed' }, 'Payment cancelled');
}

/**
 * GET /payments/my-orders
 * Player's payment history.
 */
export async function getMyPaymentOrders(req: Request, res: Response): Promise<void> {
  const playerId = req.player!.playerId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: { playerId },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.paymentOrder.count({ where: { playerId } }),
  ]);

  sendSuccess(res, { orders, total, page, limit });
}

/**
 * POST /payments/webhook/custom
 * Webhook endpoint for external payment providers to notify about payment status.
 * This handles UPI, mobile money, bank transfer confirmations.
 */
export async function customPaymentWebhook(req: Request, res: Response): Promise<void> {
  const { orderId, status, transactionId, providerData } = req.body;

  if (!orderId || !status) {
    sendError(res, 'orderId and status are required', 'VALIDATION_ERROR');
    return;
  }

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    sendError(res, 'Order not found', 'NOT_FOUND', 404);
    return;
  }

  if (status === 'completed' && order.status === 'pending') {
    await creditWallet(
      order.playerId,
      order.tokenAmount,
      `payment:${orderId}`,
      `Token purchase via webhook: ${order.tokenAmount} tokens`,
      `payment-credit-${orderId}`
    );

    await prisma.paymentOrder.update({
      where: { id: orderId },
      data: {
        status: 'completed',
        externalOrderId: transactionId || null,
        receiptData: JSON.stringify(providerData || {}),
      },
    });

    emitBalanceUpdate(order.playerId, 0);

    await createAuditLog({
      actorId: 'system', actorType: 'system',
      action: 'PAYMENT_WEBHOOK_CONFIRMED', entityType: 'payment_order', entityId: orderId,
      after: { tokenAmount: order.tokenAmount, transactionId },
    });
  }

  res.json({ received: true });
}
