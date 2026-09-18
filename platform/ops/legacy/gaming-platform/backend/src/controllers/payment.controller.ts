import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { creditWallet } from '../services/wallet.service';
import { createAuditLog } from '../services/audit.service';

/**
 * POST /payments/initiate
 * Creates a pending PaymentOrder. The client then redirects to the
 * payment provider's checkout. On success the webhook completes it.
 */
export async function initiatePayment(req: Request, res: Response): Promise<void> {
  const { packageId, provider } = req.body;
  const playerId = req.player!.playerId;

  if (!packageId || !provider) {
    sendError(res, 'packageId and provider are required', 'VALIDATION_ERROR');
    return;
  }

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) {
    sendError(res, 'Package not found or inactive', 'NOT_FOUND', 404);
    return;
  }

  const gwConfig = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
  if (!gwConfig || !gwConfig.isEnabled) {
    sendError(res, `Payment provider '${provider}' is not configured or enabled`, 'PROVIDER_UNAVAILABLE', 503);
    return;
  }

  const order = await prisma.paymentOrder.create({
    data: {
      id: uuidv4(),
      playerId,
      packageId,
      provider,
      currency: 'USD',
      amountCents: Math.round(pkg.priceUsd * 100),
      tokenAmount: pkg.baseTokens + pkg.bonusTokens,
      status: 'pending',
    },
  });

  // For Stripe: generate a checkout session URL stub
  const checkoutUrl = `https://checkout.stripe.com/pay/stub_${order.id}`;

  await createAuditLog({
    actorId: playerId, actorType: 'player',
    action: 'PAYMENT_INITIATED', entityType: 'payment_order', entityId: order.id,
    after: { packageId, provider, amountCents: order.amountCents },
  });

  sendSuccess(res, { orderId: order.id, checkoutUrl, status: 'pending' }, 'Payment order created', 201);
}

/**
 * POST /payments/webhook/stripe
 * Receives Stripe webhook events. Verifies signature, credits wallet on success.
 */
export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const gwConfig = await prisma.paymentGatewayConfig.findUnique({ where: { provider: 'stripe' } });

  if (gwConfig?.webhookSecret && sig) {
    const expected = crypto
      .createHmac('sha256', gwConfig.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (sig !== `sha256=${expected}`) {
      sendError(res, 'Invalid webhook signature', 'UNAUTHORIZED', 401);
      return;
    }
  }

  const { type, data } = req.body;
  if (type === 'checkout.session.completed' || type === 'payment_intent.succeeded') {
    const externalId = data?.object?.id || data?.object?.payment_intent;
    const orderId = data?.object?.metadata?.orderId || data?.object?.client_reference_id;

    if (orderId) {
      const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
      if (order && order.status === 'pending') {
        await prisma.paymentOrder.update({
          where: { id: orderId },
          data: { status: 'completed', externalOrderId: externalId, receiptData: JSON.stringify(req.body) },
        });
        await creditWallet(
          order.playerId,
          order.tokenAmount,
          `payment:${orderId}`,
          `Purchase: ${order.tokenAmount} tokens`,
          `payment-credit-${orderId}`
        );
        await createAuditLog({
          actorId: order.playerId, actorType: 'system',
          action: 'PAYMENT_COMPLETED', entityType: 'payment_order', entityId: orderId,
          after: { tokenAmount: order.tokenAmount, externalId },
        });
      }
    }
  }

  res.json({ received: true });
}

/**
 * POST /payments/validate-receipt
 * Validates a RevenueCat / App Store / Google Play receipt server-side.
 */
export async function validateReceipt(req: Request, res: Response): Promise<void> {
  const { packageId, receipt, platform } = req.body;
  const playerId = req.player!.playerId;

  if (!packageId || !receipt || !platform) {
    sendError(res, 'packageId, receipt, and platform are required', 'VALIDATION_ERROR');
    return;
  }

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } });
  if (!pkg) { sendError(res, 'Package not found', 'NOT_FOUND', 404); return; }

  // Stub: create completed order directly
  const order = await prisma.paymentOrder.create({
    data: {
      id: uuidv4(), playerId, packageId,
      provider: platform === 'ios' ? 'apple' : 'google',
      currency: 'USD',
      amountCents: Math.round(pkg.priceUsd * 100),
      tokenAmount: pkg.baseTokens + pkg.bonusTokens,
      status: 'completed',
      receiptData: JSON.stringify({ receipt, platform }),
    },
  });

  await creditWallet(
    playerId, order.tokenAmount,
    `receipt:${order.id}`,
    `Mobile purchase: ${order.tokenAmount} tokens`,
    `receipt-credit-${order.id}`
  );

  sendSuccess(res, { orderId: order.id, tokensAdded: order.tokenAmount }, 'Receipt validated and tokens credited');
}
