// ============================================================
// WITHDRAWAL SERVICE — dynamic rules, request lifecycle, review,
// super-admin accounting. All rules enforced server-side.
// ============================================================

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletIntegrationService } from '../games/wallet-integration.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ACTIVE_STATUSES, GLOBAL_RULE_ID, WITHDRAWAL_STATUS, WITHDRAWAL_TX } from './withdrawal.constants';
import { Decimal } from '@prisma/client/runtime/library';

export interface RuleUpdateInput {
  enabled?: boolean;
  currency?: string;
  regionCode?: string;
  coinToCurrencyRate?: number | Decimal;
  minAmountCoins?: number;
  maxAmountCoins?: number;
  maxMonthlyCoins?: number;
  cooldownHours?: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  allowedDays?: number[];
  autoApproveMaxCoins?: number;
  manualApprovalRequired?: boolean;
  feePercent?: number | Decimal;
  kycRequired?: boolean;
  firstWithdrawalOnly?: boolean;
  slaHours?: number;
  regionRestrictions?: string[];
  tierCoinValues?: Record<string, number | Decimal>;
  blacklistEnabled?: boolean;
  whitelistEnabled?: boolean;
}

export interface MethodUpdateInput {
  label?: string;
  enabled?: boolean;
  minAmountCoins?: number;
  maxAmountCoins?: number;
  feePercent?: number | Decimal;
  accountLabel?: string;
  minAccountLength?: number;
  maxAccountLength?: number;
  sortOrder?: number;
}

export interface EligibilityReport {
  rate: number;
  rateSource: 'global' | 'tier' | 'override';
  maxMonthlyCoins: number;
  usedMonthlyCoins: number;
  remainingMonthlyCoins: number;
  cooldownRemainingHours: number;
  feePercent: Decimal;
  methods: { code: string; label: string; enabled: boolean; min: number; max: number; feePercent: number; accountLabel: string; currency: string }[];
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletIntegrationService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ----------------------------------------------------------
  // Rule / method configuration
  // ----------------------------------------------------------

  async getRule() {
    let rule = await this.prisma.withdrawalRule.findUnique({ where: { id: GLOBAL_RULE_ID } });
    if (!rule) {
      rule = await this.prisma.withdrawalRule.create({ data: { id: GLOBAL_RULE_ID } });
    }
    return rule;
  }

  async updateRule(input: RuleUpdateInput, adminId: string) {
    const before = await this.getRule();
    const data: Prisma.WithdrawalRuleUpdateInput = { updatedBy: { connect: { id: adminId } } };
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.currency !== undefined) data.currency = String(input.currency).toUpperCase();
    if (input.regionCode !== undefined) data.regionCode = String(input.regionCode).toUpperCase();
    if (input.coinToCurrencyRate !== undefined) {
      const r = new Decimal(input.coinToCurrencyRate);
      if (r.lte(0)) throw new BadRequestException('coinToCurrencyRate must be positive');
      data.coinToCurrencyRate = r;
    }
    if (input.minAmountCoins !== undefined) data.minAmountCoins = input.minAmountCoins;
    if (input.maxAmountCoins !== undefined) data.maxAmountCoins = input.maxAmountCoins;
    if (input.maxMonthlyCoins !== undefined) data.maxMonthlyCoins = input.maxMonthlyCoins;
    if (input.cooldownHours !== undefined) data.cooldownHours = input.cooldownHours;
    if (input.timeWindowStart !== undefined) data.timeWindowStart = input.timeWindowStart;
    if (input.timeWindowEnd !== undefined) data.timeWindowEnd = input.timeWindowEnd;
    if (input.allowedDays !== undefined) data.allowedDays = JSON.stringify(input.allowedDays);
    if (input.autoApproveMaxCoins !== undefined) data.autoApproveMaxCoins = input.autoApproveMaxCoins;
    if (input.manualApprovalRequired !== undefined) data.manualApprovalRequired = input.manualApprovalRequired;
    if (input.feePercent !== undefined) data.feePercent = new Decimal(input.feePercent);
    if (input.kycRequired !== undefined) data.kycRequired = input.kycRequired;
    if (input.firstWithdrawalOnly !== undefined) data.firstWithdrawalOnly = input.firstWithdrawalOnly;
    if (input.slaHours !== undefined) data.slaHours = input.slaHours;
    if (input.regionRestrictions !== undefined) data.regionRestrictions = JSON.stringify(input.regionRestrictions);
    if (input.tierCoinValues !== undefined) data.tierCoinValues = JSON.stringify(input.tierCoinValues);
    if (input.blacklistEnabled !== undefined) data.blacklistEnabled = input.blacklistEnabled;
    if (input.whitelistEnabled !== undefined) data.whitelistEnabled = input.whitelistEnabled;

    if (input.minAmountCoins !== undefined && input.maxAmountCoins !== undefined && input.minAmountCoins > input.maxAmountCoins) {
      throw new BadRequestException('minAmountCoins cannot exceed maxAmountCoins');
    }
    if (input.timeWindowStart && input.timeWindowEnd && this.toMinutes(input.timeWindowStart) > this.toMinutes(input.timeWindowEnd)) {
      throw new BadRequestException('timeWindowStart must not be after timeWindowEnd');
    }

    const updated = await this.prisma.withdrawalRule.update({ where: { id: before.id }, data });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'withdrawal.rules.updated',
      entityType: 'WithdrawalRule',
      entityId: updated.id,
      metadata: this.safeRuleJson(input),
    });
    return updated;
  }

  private safeRuleJson(input: RuleUpdateInput): Prisma.InputJsonValue {
    return Object.fromEntries(
      Object.entries(input).map(([k, v]) => [k, v instanceof Decimal ? v.toString() : v]),
    ) as Prisma.InputJsonValue;
  }

  async getMethods() {
    return this.prisma.withdrawalMethod.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertMethod(methodCode: string, input: MethodUpdateInput, adminId: string) {
    const data: Prisma.WithdrawalMethodUpdateInput = { methodCode, ...({} as object) };
    data.label = input.label ?? data.label;
    data.enabled = input.enabled ?? data.enabled;
    data.minAmountCoins = input.minAmountCoins ?? data.minAmountCoins;
    data.maxAmountCoins = input.maxAmountCoins ?? data.maxAmountCoins;
    data.feePercent = input.feePercent !== undefined ? new Decimal(input.feePercent) : data.feePercent;
    data.accountLabel = input.accountLabel ?? data.accountLabel;
    data.minAccountLength = input.minAccountLength ?? data.minAccountLength;
    data.maxAccountLength = input.maxAccountLength ?? data.maxAccountLength;
    data.sortOrder = input.sortOrder ?? data.sortOrder;

    const method = await this.prisma.withdrawalMethod.upsert({
      where: { methodCode },
      create: {
        methodCode,
        label: input.label ?? methodCode,
        enabled: input.enabled ?? true,
        minAmountCoins: input.minAmountCoins ?? 100,
        maxAmountCoins: input.maxAmountCoins ?? 50000,
        feePercent: input.feePercent !== undefined ? new Decimal(input.feePercent) : new Decimal(0),
        accountLabel: input.accountLabel ?? 'Account',
        minAccountLength: input.minAccountLength ?? 0,
        maxAccountLength: input.maxAccountLength ?? 50,
        sortOrder: input.sortOrder ?? 1,
      },
      update: data,
    });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'withdrawal.method.updated',
      entityType: 'WithdrawalMethod',
      entityId: method.id,
      metadata: this.safeRuleJson(input),
    });
    return method;
  }

  async seedDefaultMethods() {
    const existing = await this.prisma.withdrawalMethod.count();
    if (existing > 0) return;
    const defaults = [
      { methodCode: 'bkash', label: 'bKash', sortOrder: 1 },
      { methodCode: 'nagad', label: 'Nagad', sortOrder: 2 },
      { methodCode: 'bank', label: 'Bank Transfer', sortOrder: 3 },
      { methodCode: 'upi', label: 'UPI', sortOrder: 4 },
      { methodCode: 'usdt', label: 'USDT (TRC20)', sortOrder: 5 },
    ];
    await this.prisma.withdrawalMethod.createMany({
      data: defaults.map((d) => ({ ...d, accountLabel: d.methodCode === 'bank' ? 'Account number' : 'Wallet number' })),
    });
  }

  // ----------------------------------------------------------
  // Evaluation / eligibility (server-authoritative)
  // ----------------------------------------------------------

  async evaluateForPlayer(playerId: string): Promise<EligibilityReport> {
    const rule = await this.getRule();
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    const methods = await this.getMethods();
    const { rate } = await this.effectiveRate(player);
    const { used, maxMonthly } = await this.monthlyUsage(playerId, rule);

    const last = await this.prisma.withdrawalRequest.findFirst({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
    const cooldownMs = (rule.cooldownHours ?? 0) * 3600_000;
    const cooldownRemaining = last ? Math.max(0, Math.ceil((cooldownMs - (Date.now() - last.createdAt.getTime())) / 3600_000)) : 0;

    return {
      rate,
      rateSource: 'global',
      maxMonthlyCoins: maxMonthly,
      usedMonthlyCoins: used,
      remainingMonthlyCoins: Math.max(0, maxMonthly - used),
      cooldownRemainingHours: cooldownRemaining,
      feePercent: rule.feePercent,
      methods: methods.map((m) => ({
        code: m.methodCode,
        label: m.label,
        enabled: m.enabled,
        min: m.minAmountCoins,
        max: m.maxAmountCoins,
        feePercent: m.feePercent.toNumber(),
        accountLabel: m.accountLabel,
        currency: m.currency,
      })),
    };
  }

  private async effectiveRate(player: { id: string; levelId?: string | null }) {
    const rule = await this.getRule();
    const override = await this.prisma.playerWithdrawalOverride.findUnique({ where: { playerId: player.id } });
    if (override?.coinRateOverride && override.coinRateOverride.gt(0)) {
      return { rate: override.coinRateOverride.toNumber(), source: 'override' as const };
    }
    const tiers = this.parseObj<Record<string, string>>(rule.tierCoinValues);
    if (player.levelId && Object.keys(tiers).length > 0) {
      const level = await this.prisma.level.findUnique({ where: { id: player.levelId } });
      const key = (level?.name ?? '').toLowerCase();
      if (key && tiers[key] !== undefined) {
        const n = Number(tiers[key]);
        if (n > 0) return { rate: n, source: 'tier' as const };
      }
    }
    return { rate: rule.coinToCurrencyRate.toNumber(), source: 'global' as const };
  }

  private async monthlyUsage(playerId: string, rule?: Prisma.WithdrawalRuleGetPayload<Record<string, never>>) {
    const r = rule ?? (await this.getRule());
    const override = await this.prisma.playerWithdrawalOverride.findUnique({ where: { playerId } });
    const maxMonthly = override?.maxMonthlyCoins && override.maxMonthlyCoins > 0 ? override.maxMonthlyCoins : r.maxMonthlyCoins;
    const period = this.monthPeriod(new Date());
    const rows = await this.prisma.withdrawalRequest.groupBy({
      by: ['status'],
      where: { playerId, monthlyPeriod: period, status: { in: ACTIVE_STATUSES } },
      _sum: { amountCoins: true },
    });
    const used = rows.reduce((acc, rrow) => acc + (rrow._sum.amountCoins ?? 0), 0);
    return { used, maxMonthly, period };
  }

  private async assertEligible(
    playerId: string,
    amount: number,
    methodCode: string,
    accountHandle: string,
    accountName: string | undefined,
  ) {
    const rule = await this.getRule();
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    if (!rule.enabled) throw new BadRequestException('Withdrawals are currently disabled');

    if (rule.blacklistEnabled && player.withdrawalBlacklisted) {
      throw new BadRequestException(player.withdrawalBlacklistReason ?? 'This account is not eligible for withdrawals');
    }
    if (rule.whitelistEnabled && !player.withdrawalWhitelisted) {
      throw new BadRequestException('This account is not whitelisted for withdrawals');
    }

    if (rule.kycRequired && !player.kycVerified) {
      throw new BadRequestException('KYC verification is required before withdrawing');
    }

    if (rule.firstWithdrawalOnly) {
      const prior = await this.prisma.withdrawalRequest.count({
        where: { playerId, status: { in: [WITHDRAWAL_STATUS.APPROVED, WITHDRAWAL_STATUS.AUTO_APPROVED, WITHDRAWAL_STATUS.PARTIALLY_APPROVED] } },
      });
      if (prior > 0) throw new BadRequestException('Only a single withdrawal is allowed for this account');
    }

    const regions = this.parseArr<string>(rule.regionRestrictions);
    if (regions.length > 0) {
      const country = (player.country ?? '').toUpperCase();
      if (!regions.includes(country)) {
        throw new BadRequestException(`Withdrawals are not available in your region`);
      }
    }

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = this.toMinutes(rule.timeWindowStart);
    const end = this.toMinutes(rule.timeWindowEnd);
    if (minutes < start || minutes > end) {
      throw new BadRequestException(`Withdrawals are only allowed between ${rule.timeWindowStart} and ${rule.timeWindowEnd}`);
    }
    if (!this.parseArr<number>(rule.allowedDays).includes(now.getDay())) {
      throw new BadRequestException('Withdrawals are not allowed today');
    }

    if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('Invalid withdrawal amount');
    if (amount < rule.minAmountCoins || amount > rule.maxAmountCoins) {
      throw new BadRequestException(`Amount must be between ${rule.minAmountCoins} and ${rule.maxAmountCoins} coins`);
    }

    const method = await this.prisma.withdrawalMethod.findUnique({ where: { methodCode } });
    if (!method) throw new BadRequestException('Withdrawal method not found');
    if (!method.enabled) throw new BadRequestException(`${method.label} is currently disabled`);
    if (amount < method.minAmountCoins || amount > method.maxAmountCoins) {
      throw new BadRequestException(`Amount for ${method.label} must be between ${method.minAmountCoins} and ${method.maxAmountCoins} coins`);
    }
    if (!accountHandle || accountHandle.trim().length < method.minAccountLength || accountHandle.trim().length > method.maxAccountLength) {
      throw new BadRequestException(`Invalid account handle for ${method.label}`);
    }
    if (accountName && accountName.trim().length > 100) {
      throw new BadRequestException('Account name is too long');
    }

    const last = await this.prisma.withdrawalRequest.findFirst({ where: { playerId }, orderBy: { createdAt: 'desc' } });
    if (last && rule.cooldownHours > 0) {
      const elapsedMs = Date.now() - last.createdAt.getTime();
      if (elapsedMs < rule.cooldownHours * 3600_000) {
        const remain = Math.ceil((rule.cooldownHours * 3600_000 - elapsedMs) / 3600_000);
        throw new BadRequestException(`Please wait ${remain}h before requesting another withdrawal`);
      }
    }

    const { used, maxMonthly } = await this.monthlyUsage(playerId, rule);
    if (used + amount > maxMonthly) {
      throw new BadRequestException(
        `Monthly withdrawal limit of ${maxMonthly} coins reached (used ${used}, remaining ${Math.max(0, maxMonthly - used)})`,
      );
    }

    return { rule, method, player, used, maxMonthly };
  }

  private feeFor(amount: number, methodFee: Decimal, ruleFee: Decimal): number {
    const pct = methodFee.gt(0) ? methodFee : ruleFee;
    return Math.round((amount * pct.toNumber()) / 100);
  }

  private coinsToCurrency(netCoins: number, rate: number): Decimal {
    if (rate <= 0) return new Decimal(0);
    return new Decimal(netCoins).div(rate).toDP(2);
  }

  private monthPeriod(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) throw new BadRequestException(`Invalid time "${hhmm}"`);
    return h * 60 + m;
  }

  private parseArr<T>(json: string): T[] {
    try {
      const v = JSON.parse(json ?? '[]');
      return Array.isArray(v) ? (v as T[]) : [];
    } catch {
      return [];
    }
  }

  private parseObj<T>(json: string): T {
    try {
      const v = JSON.parse(json ?? '{}');
      return v && typeof v === 'object' ? (v as T) : ({} as T);
    } catch {
      return {} as T;
    }
  }

  // ----------------------------------------------------------
  // Player-facing lifecycle
  // ----------------------------------------------------------

  async request(
    playerId: string,
    input: { amount: number; methodCode: string; accountHandle: string; accountName?: string; idempotencyKey?: string },
  ) {
    const { rule, method, player, used } = await this.assertEligible(
      playerId,
      input.amount,
      input.methodCode,
      input.accountHandle,
      input.accountName,
    );

    const key = input.idempotencyKey ?? `${playerId}-${randomUUID()}`;
    const existing = await this.prisma.withdrawalRequest.findUnique({ where: { idempotencyKey: key } });
    if (existing) return { request: existing, alreadyProcessed: true };

    const id = randomUUID();
    const period = this.monthPeriod(new Date());
    const { rate } = await this.effectiveRate(player);
    const autoApprove = rule.autoApproveMaxCoins > 0 && input.amount <= rule.autoApproveMaxCoins;

    const fee = this.feeFor(input.amount, method.feePercent, rule.feePercent);
    const net = input.amount - fee;
    const currency = this.coinsToCurrency(net, rate);

    let request;
    await this.prisma.$transaction(async (tx) => {
      request = await tx.withdrawalRequest.create({
        data: {
          id,
          playerId,
          amountCoins: input.amount,
          feeCoins: fee,
          netCoins: net,
          rateApplied: new Decimal(rate),
          amountCurrency: currency,
          currency: rule.currency,
          methodCode: input.methodCode,
          accountHandle: input.accountHandle,
          accountName: input.accountName,
          status: autoApprove ? WITHDRAWAL_STATUS.AUTO_APPROVED : WITHDRAWAL_STATUS.PENDING,
          autoApproved: autoApprove,
          monthlyPeriod: period,
          idempotencyKey: key,
          reviewedAt: autoApprove ? new Date() : null,
        },
      });

      const held = await this.wallet.debit(
        playerId,
        input.amount,
        'withdrawal',
        id,
        `Withdrawal hold (${input.methodCode})`,
        `withdraw-hold-${id}`,
        { tx, type: WITHDRAWAL_TX.HOLD },
      );
      request = await tx.withdrawalRequest.update({ where: { id }, data: { holdTxId: held.transaction.id } });
    });

    this.logger.log(`Withdrawal ${id} created for player ${playerId}: ${input.amount} coins (${currency} ${rule.currency})`);

    await this.audit.log({
      actorId: playerId,
      actorType: 'player',
      action: 'withdrawal.requested',
      entityType: 'WithdrawalRequest',
      entityId: id,
      after: { amount: input.amount, method: input.methodCode, status: request.status, monthlyUsedAfter: used + input.amount, autoApproved: autoApprove },
    });

    await this.notifications.create(playerId, {
      type: 'system',
      title: autoApprove ? 'Withdrawal approved' : 'Withdrawal submitted',
      content: autoApprove
        ? `Your withdrawal of ${input.amount} coins (${currency} ${rule.currency}) has been auto-approved and is being processed.`
        : `Your withdrawal request of ${input.amount} coins is being reviewed. SLA: up to ${rule.slaHours}h.`,
      data: { withdrawalId: id },
    });

    return { request, alreadyProcessed: false, autoApproved: autoApprove };
  }

  async myRequests(playerId: string, page = 1, limit = 20) {
    const where = { playerId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async cancel(playerId: string, requestId: string) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!req || req.playerId !== playerId) throw new NotFoundException('Withdrawal request not found');
    if (req.status !== WITHDRAWAL_STATUS.PENDING) {
      throw new BadRequestException(`Cannot cancel a ${req.status} withdrawal`);
    }

    const id = req.id;
    await this.prisma.$transaction(async (tx) => {
      const refund = await this.wallet.credit(
        playerId,
        req.amountCoins,
        'withdrawal',
        id,
        'Withdrawal cancelled — funds returned',
        `withdraw-refund-${id}`,
        { tx, type: WITHDRAWAL_TX.REFUND },
      );
      await tx.withdrawalRequest.update({
        where: { id },
        data: { status: WITHDRAWAL_STATUS.CANCELLED, refundTxId: refund.transaction.id, feeCoins: 0, netCoins: 0, amountCurrency: new Decimal(0) },
      });
    });

    await this.audit.log({
      actorId: playerId,
      actorType: 'player',
      action: 'withdrawal.cancelled',
      entityType: 'WithdrawalRequest',
      entityId: id,
    });
    return { ok: true };
  }

  // ----------------------------------------------------------
  // Admin review
  // ----------------------------------------------------------

  async listAdmin(filters: { status?: string; playerId?: string; page?: number; limit?: number; month?: string }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const where: Prisma.WithdrawalRequestWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.playerId) where.playerId = filters.playerId;
    if (filters.month) where.monthlyPeriod = filters.month;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          player: { select: { id: true, username: true, displayName: true } },
          reviewedBy: { select: { id: true, username: true } },
          method: { select: { label: true, methodCode: true } },
        },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);
    return { rows, total, page, limit };
  }

  async review(
    requestId: string,
    adminId: string,
    input: { decision: 'approve' | 'reject' | 'partial'; reason?: string; amount?: number },
  ) {
    const req = await this.prisma.withdrawalRequest.findUnique({ where: { id: requestId }, include: { method: true, player: true } });
    if (!req) throw new NotFoundException('Withdrawal request not found');
    if (![WITHDRAWAL_STATUS.PENDING, WITHDRAWAL_STATUS.AUTO_APPROVED].includes(req.status as never)) {
      throw new BadRequestException(`Cannot review a ${req.status} withdrawal`);
    }
    if (input.decision !== 'approve' && input.decision !== 'reject' && input.decision !== 'partial') {
      throw new BadRequestException('Invalid decision');
    }

    const rule = await this.getRule();
    const id = req.id;
    const reject = input.decision === 'reject';
    const partial = input.decision === 'partial';

    const nextStatus = reject
      ? WITHDRAWAL_STATUS.REJECTED
      : partial
        ? WITHDRAWAL_STATUS.PARTIALLY_APPROVED
        : WITHDRAWAL_STATUS.APPROVED;

    let approvedAmount = req.amountCoins;
    if (partial) {
      approvedAmount = Number.isInteger(input.amount) && input.amount! > 0 && input.amount! < req.amountCoins ? input.amount! : req.amountCoins;
    }
    if (reject) approvedAmount = 0;
    const refundAmount = req.amountCoins - approvedAmount;

    const fee = reject ? 0 : this.feeFor(approvedAmount, req.method.feePercent, rule.feePercent);
    const net = Math.max(0, approvedAmount - fee);
    const ccy = this.coinsToCurrency(net, req.rateApplied.toNumber());

    await this.prisma.$transaction(async (tx) => {
      let refundTxId: string | undefined;
      if (refundAmount > 0) {
        const refund = await this.wallet.credit(
          req.playerId,
          refundAmount,
          'withdrawal',
          id,
          'Un-approved portion returned',
          `withdraw-refund-${id}`,
          { tx, type: WITHDRAWAL_TX.REFUND },
        );
        refundTxId = refund.transaction.id;
      }

      const nextStatus = reject
        ? WITHDRAWAL_STATUS.REJECTED
        : partial
          ? WITHDRAWAL_STATUS.PARTIALLY_APPROVED
          : WITHDRAWAL_STATUS.APPROVED;

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          feeCoins: fee,
          netCoins: net,
          amountCurrency: ccy,
          approvedAmountCoins: approvedAmount,
          reviewedById: adminId,
          reviewedAt: new Date(),
          reviewNote: input.reason ?? null,
          refundTxId: refundTxId ?? null,
        },
      });
    });

    await this.notifications.create(req.playerId, {
      type: 'system',
      title: reject ? 'Withdrawal rejected' : 'Withdrawal approved',
      content: reject
        ? `Your withdrawal of ${req.amountCoins} coins was rejected${input.reason ? `: ${input.reason}` : ''}. Funds have been returned to your wallet.`
        : `Your withdrawal of ${net} coins (${ccy} ${req.currency}) was approved.${partial && refundAmount > 0 ? ` ${refundAmount} coins were returned to your wallet.` : ''}`,
      data: { withdrawalId: id, status: nextStatus },
    });

    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'withdrawal.reviewed',
      entityType: 'WithdrawalRequest',
      entityId: id,
      after: { decision: input.decision, approvedAmount, refundAmount, fee, net, reason: input.reason ?? null },
    });

    return { ok: true, status: reject ? WITHDRAWAL_STATUS.REJECTED : partial ? WITHDRAWAL_STATUS.PARTIALLY_APPROVED : WITHDRAWAL_STATUS.APPROVED };
  }

  // ----------------------------------------------------------
  // Per-player overrides + blacklist management
  // ----------------------------------------------------------

  async setOverride(playerId: string, input: { maxMonthlyCoins?: number; coinRateOverride?: number; note?: string }, adminId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
    if (!player) throw new NotFoundException('Player not found');

    const data: Prisma.PlayerWithdrawalOverrideUpdateInput = { grantedBy: { connect: { id: adminId } }, note: input.note };
    if (input.maxMonthlyCoins !== undefined) data.maxMonthlyCoins = input.maxMonthlyCoins;
    if (input.coinRateOverride !== undefined) data.coinRateOverride = new Decimal(input.coinRateOverride);

    const override = await this.prisma.playerWithdrawalOverride.upsert({
      where: { playerId },
      create: {
        playerId,
        maxMonthlyCoins: input.maxMonthlyCoins,
        coinRateOverride: input.coinRateOverride !== undefined ? new Decimal(input.coinRateOverride) : undefined,
        note: input.note,
        grantedById: adminId,
      } as Prisma.PlayerWithdrawalOverrideUncheckedCreateInput,
      update: data,
    });

    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'withdrawal.override.updated',
      entityType: 'PlayerWithdrawalOverride',
      entityId: override.id,
      after: input as Prisma.InputJsonValue,
    });
    return override;
  }

  async removeOverride(playerId: string, adminId: string) {
    const override = await this.prisma.playerWithdrawalOverride.findUnique({ where: { playerId } });
    if (!override) throw new NotFoundException('No override set for this player');
    await this.prisma.playerWithdrawalOverride.delete({ where: { playerId } });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'withdrawal.override.removed',
      entityType: 'PlayerWithdrawalOverride',
      entityId: override.id,
    });
    return { ok: true };
  }

  async setBlacklist(player: { playerId: string; blacklisted: boolean; reason?: string }, adminId: string) {
    const existing = await this.prisma.player.findUnique({ where: { id: player.playerId } });
    if (!existing) throw new NotFoundException('Player not found');

    const updated = await this.prisma.player.update({
      where: { id: player.playerId },
      data: {
        withdrawalBlacklisted: player.blacklisted,
        withdrawalBlacklistReason: player.blacklisted ? (player.reason ?? 'Blacklisted by admin') : null,
      },
    });

    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: player.blacklisted ? 'withdrawal.blacklisted' : 'withdrawal.unblacklisted',
      entityType: 'Player',
      entityId: updated.id,
      after: { reason: player.reason ?? null },
    });
    return { ok: true };
  }

  async setWhitelist(player: { playerId: string; whitelisted: boolean; reason?: string }, adminId: string) {
    const existing = await this.prisma.player.findUnique({ where: { id: player.playerId } });
    if (!existing) throw new NotFoundException('Player not found');
    await this.prisma.player.update({
      where: { id: player.playerId },
      data: { withdrawalWhitelisted: player.whitelisted },
    });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: player.whitelisted ? 'withdrawal.whitelisted' : 'withdrawal.unwhitelisted',
      entityType: 'Player',
      entityId: existing.id,
      after: { reason: player.reason ?? null },
    });
    return { ok: true };
  }

  async listBlacklist() {
    return this.prisma.player.findMany({
      where: { withdrawalBlacklisted: true },
      select: { id: true, username: true, displayName: true, withdrawalBlacklistReason: true, updatedAt: true },
    });
  }

  // ----------------------------------------------------------
  // Super-admin accounting (real ledger numbers only)
  // ----------------------------------------------------------

  async dashboard(filters: { month?: string; periodStart?: string; periodEnd?: string; adminId?: string; playerId?: string; status?: string }) {
    const range = this.rangeFor(filters);

    const includeWhere = {
      reviewedAt: { not: null },
      ...(filters.adminId ? { reviewedById: filters.adminId } : {}),
      ...(filters.playerId ? { playerId: filters.playerId } : {}),
    };
    const where = {
      createdAt: { gte: range.start, lte: range.end },
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [allRows, pendingCount] = await this.prisma.$transaction([
      this.prisma.withdrawalRequest.findMany({ where }),
      this.prisma.withdrawalRequest.count({ where: { ...where, status: WITHDRAWAL_STATUS.PENDING } }),
    ]);

    const approvedStatuses: string[] = [WITHDRAWAL_STATUS.APPROVED, WITHDRAWAL_STATUS.AUTO_APPROVED, WITHDRAWAL_STATUS.PARTIALLY_APPROVED];
    const paid = allRows.filter((r) => approvedStatuses.includes(r.status));
    const rejected = allRows.filter((r) => r.status === WITHDRAWAL_STATUS.REJECTED);

    const totalApprovedCoins = paid.reduce((a, r) => a + r.netCoins, 0);
    const totalFiat = paid.reduce((a, r) => a + r.amountCurrency.toNumber(), 0);
    const playersPaid = new Set(paid.map((r) => r.playerId)).size;

    let avgReviewHours = 0;
    const reviewed = allRows.filter((r) => r.reviewedById && r.reviewedAt);
    if (reviewed.length) {
      avgReviewHours =
        reviewed.reduce((a, r) => a + (r.reviewedAt!.getTime() - r.createdAt.getTime()) / 3600_000, 0) / reviewed.length;
    }

    const adminIds = [...new Set(paid.filter((r) => r.reviewedById).map((r) => r.reviewedById!))];
    const admins = await this.prisma.adminUser.findMany({
      where: { id: { in: adminIds } },
      select: { id: true, username: true, firstName: true, lastName: true },
    });
    const adminName = (id: string) => {
      const a = admins.find((x) => x.id === id);
      if (!a) return 'unknown';
      return a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.username;
    };

    const perAdmin = adminIds.map((adminId) => {
      const approvedRows = paid.filter((r) => r.reviewedById === adminId);
      const rejectedRows = rejected.filter((r) => r.reviewedById === adminId);
      const myReviewed = reviewed.filter((r) => r.reviewedById === adminId);
      const dates = this.groupByDay(approvedRows);
      return {
        adminId,
        adminName: adminName(adminId),
        approvedCount: approvedRows.length,
        approvedCoins: approvedRows.reduce((a, r) => a + r.netCoins, 0),
        approvedFiat: approvedRows.reduce((a, r) => a + r.amountCurrency.toNumber(), 0),
        playersPaid: new Set(approvedRows.map((r) => r.playerId)).size,
        rejectedCount: rejectedRows.length,
        avgReviewHours:
          myReviewed.length > 0
            ? myReviewed.reduce((a, r) => a + (r.reviewedAt!.getTime() - r.createdAt.getTime()) / 3600_000, 0) / myReviewed.length
            : 0,
        byDate: dates,
      };
    });

    // Ledger-backed numbers.
    const ledger = await this.ledgerSheet(range.start, range.end);

    // Suspicious patterns: same admin approving the same player repeatedly.
    const pairCounts = new Map<string, { adminId: string; playerId: string; count: number; coins: number }>();
    for (const r of paid) {
      if (!r.reviewedById) continue;
      const k = `${r.reviewedById}:${r.playerId}`;
      const cur = pairCounts.get(k) ?? { adminId: r.reviewedById!, playerId: r.playerId, count: 0, coins: 0 };
      cur.count += 1;
      cur.coins += r.netCoins;
      pairCounts.set(k, cur);
    }
    const players = await this.prisma.player.findMany({
      where: { id: { in: [...pairCounts.values()].map((v) => v.playerId) } },
      select: { id: true, username: true, displayName: true },
    });
    const playerName = (id: string) => players.find((p) => p.id === id)?.username ?? 'unknown';
    const suspiciousPairs = [...pairCounts.values()]
      .filter((p) => p.count >= 3)
      .map((p) => ({ ...p, adminName: adminName(p.adminId), playerName: playerName(p.playerId) }));

    return {
      period: { month: filters.month ?? this.monthPeriod(new Date()), start: range.start, end: range.end },
      totals: {
        requested: { count: allRows.length, coins: allRows.reduce((a, r) => a + r.amountCoins, 0) },
        paid: { count: paid.length, coins: totalApprovedCoins, fiat: totalFiat, players: playersPaid },
        autoApproved: paid.filter((r) => r.autoApproved).length,
        rejected: { count: rejected.length, coins: rejected.reduce((a, r) => a + r.amountCoins, 0) },
        pending: pendingCount,
        avgReviewHours,
      },
      byDay: this.flattenDays(this.groupByDay(allRows)),
      perAdmin,
      suspiciousPairs,
      ledger,
      flags: {
        coinsBurnedMatchesPaid: !ledger.netWithdrawalOut.eq(totalApprovedCoins) ? 'ledger/paid mismatch' : null,
      },
    };
  }

  private rangeFor(filters: { month?: string; periodStart?: string; periodEnd?: string }) {
    if (filters.periodStart && filters.periodEnd) {
      return { start: new Date(filters.periodStart), end: new Date(filters.periodEnd) };
    }
    const [y, m] = (filters.month ?? this.monthPeriod(new Date())).split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private groupByDay(rows: Array<{ createdAt: Date; netCoins: number }>) {
    const map = new Map<string, { date: string; count: number; coins: number }>();
    for (const r of rows) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, '0')}-${String(r.createdAt.getDate()).padStart(2, '0')}`;
      const cur = map.get(key) ?? { date: key, count: 0, coins: 0 };
      cur.count += 1;
      cur.coins += r.netCoins;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  private flattenDays(groups: Array<{ date: string; count: number; coins: number }>) {
    return groups;
  }

  private async ledgerSheet(start: Date, end: Date) {
    const txns = await this.prisma.walletTransaction.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { type: true, referenceType: true, amount: true, balanceAfter: true, balanceBefore: true },
    });

    const debit = new Map<string, Decimal>();
    const credit = new Map<string, Decimal>();
    const add = (map: Map<string, Decimal>, key: string, v: Decimal) => map.set(key, (map.get(key) ?? new Decimal(0)).add(v));

    let netHolds = new Decimal(0);
    let netRefunds = new Decimal(0);
    for (const t of txns) {
      const isDebit = t.balanceAfter.lt(t.balanceBefore);
      const delta = t.balanceBefore.sub(t.balanceAfter).abs();
      if (isDebit) add(debit, t.type, delta);
      else add(credit, t.type, delta);
      if (t.referenceType === 'withdrawal') {
        if (t.type === WITHDRAWAL_TX.HOLD) netHolds = netHolds.add(t.amount);
        if (t.type === WITHDRAWAL_TX.REFUND) netRefunds = netRefunds.add(t.amount);
      }
    }

    const sum = (map: Map<string, Decimal>) => [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([type, amount]) => ({ type, amount: amount.toNumber() }));

    return {
      coinsIn: sum(credit),
      coinsOut: sum(debit),
      withdrawalHolds: netHolds.toNumber(),
      withdrawalRefunds: netRefunds.toNumber(),
      netWithdrawalOut: netHolds.sub(netRefunds),
    };
  }

  async exportCsv(filters: { month?: string; periodStart?: string; periodEnd?: string; status?: string }): Promise<string> {
    const range = this.rangeFor(filters);
    const where: Prisma.WithdrawalRequestWhereInput = { createdAt: { gte: range.start, lte: range.end } };
    if (filters.status) where.status = filters.status;

    const rows = await this.prisma.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        player: { select: { username: true, displayName: true } },
        reviewedBy: { select: { username: true } },
      },
    });

    const header = 'id,created_at,player_id,player_username,amount_coins,fee_coins,net_coins,rate,amount_currency,currency,method,account_handle,status,reviewed_by,reviewed_at,review_note,suspicious';
    const lines = rows.map((r) =>
      [
        r.id,
        r.createdAt.toISOString(),
        r.playerId,
        this.csvEscape(r.player.username),
        r.amountCoins,
        r.feeCoins,
        r.netCoins,
        r.rateApplied.toString(),
        r.amountCurrency.toString(),
        r.currency,
        r.methodCode,
        this.csvEscape(r.accountHandle),
        r.status,
        r.reviewedBy?.username ?? '',
        r.reviewedAt?.toISOString() ?? '',
        this.csvEscape(r.reviewNote ?? ''),
        r.suspicious ? 'YES' : 'no',
      ].join(','),
    );
    return [header, ...lines].join('\n');
  }

  private csvEscape(v: string): string {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  }
}