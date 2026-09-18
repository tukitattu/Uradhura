// ============================================================
// ECONOMY SERVICE — Virtual Economy Management
// ============================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletIntegrationService } from '../games/wallet-integration.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EconomyService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private readonly ledger: WalletIntegrationService,
  ) {}

  // ============================================================
  // COIN PACKAGES
  // ============================================================

  async createCoinPackage(data: {
    name: string;
    description?: string;
    priceUsd: number;
    baseCoins: number;
    bonusCoins?: number;
    isSpecialOffer?: boolean;
    isPopular?: boolean;
    expiryDays?: number;
    sortOrder?: number;
    image?: string;
  }) {
    return this.prisma.coinPackage.create({
      data: {
        name: data.name,
        description: data.description,
        priceUsd: new Decimal(data.priceUsd),
        baseCoins: data.baseCoins,
        bonusCoins: data.bonusCoins || 0,
        isSpecialOffer: data.isSpecialOffer || false,
        isPopular: data.isPopular || false,
        expiryDays: data.expiryDays || 30,
        sortOrder: data.sortOrder || 0,
        image: data.image,
      },
    });
  }

  async getCoinPackages() {
    return this.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateCoinPackage(id: string, data: Partial<{
    name: string;
    description: string;
    priceUsd: number;
    baseCoins: number;
    bonusCoins: number;
    isSpecialOffer: boolean;
    isPopular: boolean;
    expiryDays: number;
    sortOrder: number;
    isActive: boolean;
    image: string;
  }>) {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');

    return this.prisma.coinPackage.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priceUsd !== undefined && { priceUsd: new Decimal(data.priceUsd) }),
        ...(data.baseCoins !== undefined && { baseCoins: data.baseCoins }),
        ...(data.bonusCoins !== undefined && { bonusCoins: data.bonusCoins }),
        ...(data.isSpecialOffer !== undefined && { isSpecialOffer: data.isSpecialOffer }),
        ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
        ...(data.expiryDays !== undefined && { expiryDays: data.expiryDays }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.image && { image: data.image }),
      },
    });
  }

  async purchaseCoinPackage(playerId: string, packageId: string, paymentMethod: string) {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Package not found or inactive');
    }

    // Create payment order
    const order = await this.prisma.paymentOrder.create({
      data: {
        playerId,
        packageId,
        packageType: 'coin',
        provider: paymentMethod,
        amountCents: Math.round(Number(pkg.priceUsd) * 100),
        tokenAmount: pkg.baseCoins + pkg.bonusCoins,
        status: 'pending',
      },
    });

    return {
      orderId: order.id,
      status: order.status,
      amount: pkg.priceUsd,
      coins: pkg.baseCoins + pkg.bonusCoins,
    };
  }

  async confirmCoinPurchase(orderId: string, adminId: string) {
    const idempotencyKey = `coin-purchase-${orderId}`;
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.paymentOrder.findUnique({
        where: { id: orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'pending') throw new BadRequestException('Order already processed');

      // Credit coins atomically with the order-status update so the two
      // can never diverge (no paid-but-uncredited or credited-but-pending states).
      const { transaction } = await this.ledger.credit(
        order.playerId,
        order.tokenAmount,
        'coin_purchase',
        orderId,
        `Coin package purchase`,
        idempotencyKey,
        { tx, currency: 'coins', createdBy: adminId },
      );

      const updatedOrder = await tx.paymentOrder.update({
        where: { id: orderId },
        data: { status: 'completed', creditedAt: new Date() },
      });

      return { transaction, updatedOrder };
    });

    return { success: true, coinsAdded: result.transaction.amount, order: result.updatedOrder };
  }

  // ============================================================
  // DIAMOND PACKAGES
  // ============================================================

  async createDiamondPackage(data: {
    name: string;
    description?: string;
    priceUsd: number;
    baseDiamonds: number;
    bonusDiamonds?: number;
    isSpecialOffer?: boolean;
    isPopular?: boolean;
    sortOrder?: number;
    image?: string;
  }) {
    return this.prisma.diamondPackage.create({
      data: {
        name: data.name,
        description: data.description,
        priceUsd: new Decimal(data.priceUsd),
        baseDiamonds: data.baseDiamonds,
        bonusDiamonds: data.bonusDiamonds || 0,
        isSpecialOffer: data.isSpecialOffer || false,
        isPopular: data.isPopular || false,
        sortOrder: data.sortOrder || 0,
        image: data.image,
      },
    });
  }

  async getDiamondPackages() {
    return this.prisma.diamondPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ============================================================
  // GIFTS
  // ============================================================

  async createGift(data: {
    name: string;
    icon: string;
    animation?: string;
    coinPrice: number;
    category?: string;
    sortOrder?: number;
  }) {
    return this.prisma.gift.create({
      data: {
        name: data.name,
        icon: data.icon,
        animation: data.animation,
        coinPrice: new Decimal(data.coinPrice),
        category: data.category || 'general',
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async getGifts() {
    return this.prisma.gift.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async sendGift(
    senderId: string,
    receiverId: string,
    giftId: string,
    quantity: number,
    roomId?: string,
    clientTxnId?: string,
  ) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send a gift to yourself');
    }

    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift || !gift.isActive) {
      throw new NotFoundException('Gift not found');
    }

    const totalCost = new Decimal(gift.coinPrice).mul(quantity);

    // Idempotency: prefer a caller-supplied clientTxnId (replay-safe from the
    // player's device); otherwise derive one from the gift payload so the same
    // logical gift can never double-debit.
    const idempotencyKey =
      clientTxnId && clientTxnId.trim().length > 0
        ? clientTxnId
        : `gift-${senderId}-${receiverId}-${giftId}-${quantity}`;

    return this.prisma.$transaction(async (tx) => {
      const { wallet: senderWallet } = await this.ledger.debit(
        senderId,
        totalCost,
        'gift',
        giftId,
        `Sent ${quantity}x ${gift.name}`,
        idempotencyKey,
        { tx, currency: 'coins', metadata: { receiverId, giftId, quantity: `${quantity}` } },
      );

      const { transaction: creditTx } = await this.ledger.credit(
        receiverId,
        totalCost,
        'gift',
        giftId,
        `Received ${quantity}x ${gift.name}`,
        `${idempotencyKey}-credit`,
        { tx, currency: 'coins', metadata: { senderId, giftId, quantity: `${quantity}` } },
      );

      const transaction = await tx.giftTransaction.create({
        data: {
          giftId,
          senderId,
          receiverId,
          roomId,
          quantity,
          totalCost,
          txRef: idempotencyKey,
        },
      });

      return { transaction, senderWallet, creditTx };
    });
  }

  async getGiftTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.prisma.giftTransaction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          gift: true,
          sender: { select: { id: true, username: true } },
          receiver: { select: { id: true, username: true } },
        },
      }),
      this.prisma.giftTransaction.count(),
    ]);

    return { data: transactions, total, page, limit };
  }

  // ============================================================
  // ECONOMY STATS
  // ============================================================

  async getEconomyStats() {
    const [totalCoinsInCirculation, totalDiamondsInCirculation, totalGiftTransactions] = await Promise.all([
      this.prisma.walletAccount.aggregate({ _sum: { coinBalance: true } }),
      this.prisma.walletAccount.aggregate({ _sum: { diamondBalance: true } }),
      this.prisma.giftTransaction.count(),
    ]);

    return {
      totalCoinsInCirculation: totalCoinsInCirculation._sum.coinBalance || 0,
      totalDiamondsInCirculation: totalDiamondsInCirculation._sum.diamondBalance || 0,
      totalGiftTransactions,
    };
  }
}
