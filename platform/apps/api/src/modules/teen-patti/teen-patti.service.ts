import { Injectable, Logger, OnModuleDestroy, OnModuleInit, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletIntegrationService } from '../games/wallet-integration.service';
import { AuditService } from '../audit/audit.service';
import { FairRandom, FairSeedInput } from '../games/fair-random';
import { TeenPattiGame, TPGameConfig, TPActionKind, TPSeatView } from './engine/teen-patti-game';
import { dealHands } from './engine/deal';
import { evaluateHand } from './engine/evaluator';
import { selectBotAction, botName } from './bot-policy';
import { TeenPattiConfigService } from './teen-patti-config.service';
import { TeenPattiSeat, TeenPattiTable, TeenPattiHand, Prisma } from '@prisma/client';

export const TEEN_PATTI_EVENTS = {
  state: 'teen_patti.state',
  action: 'teen_patti.action',
  result: 'teen_patti.result',
} as const;

const TICK_MS = 2000;

interface TableRuntime {
  game: TeenPattiGame | null;
  hand: TeenPattiHand | null;
  botSteps: Map<number, number>;
  lastActionAt: Map<number, number>;
  chipsAtDeal: Map<number, number>;
  pendingStands: Map<number, { seatId: string; playerId: string }>;
}

export interface TableStateView {
  table: {
    id: string;
    tableCode: string;
    title: string;
    bootAmount: number;
    chaalCap: number;
    maxSeats: number;
    minPlayers: number;
    minBuyIn: number;
    maxBuyIn: number;
    status: string;
    handNo: number;
    handInPlay: boolean;
  };
  seats: TPSeatView[];
  turn: number | null;
  pot: number;
  stake: number;
  handicap: TableStateView['seats'][number] | null;
}

@Injectable()
export class TeenPattiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TeenPattiService.name);
  private readonly runtimes = new Map<string, TableRuntime>();
  private timer: NodeJS.Timeout | null = null;
  private readonly lockChain = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletIntegrationService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
    private readonly configService: TeenPattiConfigService,
  ) {}

  onModuleInit(): void {
    void this.rehydrateAll();
    this.timer = setInterval(() => void this.tickAll().catch((e) => this.logger.error('tickAll failed', e)), TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async runLocked<T>(tableId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.lockChain.get(tableId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    this.lockChain.set(tableId, prev.then(() => gate));
    await prev.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private loadRuntime(tableId: string): TableRuntime {
    let rt = this.runtimes.get(tableId);
    if (!rt) {
      rt = { game: null, hand: null, botSteps: new Map(), lastActionAt: new Map(), chipsAtDeal: new Map(), pendingStands: new Map() };
      this.runtimes.set(tableId, rt);
    }
    return rt;
  }

  // ----------------------------------------------------------
  // Lobby
  // ----------------------------------------------------------

  async listTables(): Promise<{ id: string; tableCode: string; title: string; bootAmount: number; seated: number; seats: number; status: string }[]> {
    const tables = await this.prisma.teenPattiTable.findMany({
      where: { status: { in: ['open', 'playing'] } },
      orderBy: { createdAt: 'asc' },
      include: { seats: { where: { isSeated: true, chips: { gt: 0 } } } },
    });
    return tables.map((t) => ({
      id: t.id,
      tableCode: t.tableCode,
      title: t.title,
      bootAmount: t.bootAmount,
      seated: t.seats.length,
      seats: t.maxSeats,
      status: t.status,
    }));
  }

  async getTable(tableId: string, viewerPlayerId?: string): Promise<TableStateView | null> {
    const table = await this.prisma.teenPattiTable.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    const rt = this.loadRuntime(tableId);
    const game = rt.game;
    const seatRows = await this.prisma.teenPattiSeat.findMany({
      where: { tableId, isSeated: true },
      orderBy: { seatNo: 'asc' },
    });

    const seats: TableStateView['seats'] = seatRows.map((r) => {
      const gseat = game?.seats.find((s) => s.seatNo === r.seatNo);
      return {
        seatNo: r.seatNo,
        playerId: this.maskPlayerId(r.playerId, viewerPlayerId, r.seatNo),
        isBot: r.isBot,
        chips: gseat ? gseat.chips : r.chips,
        isSeen: gseat ? gseat.isSeen : false,
        committed: gseat ? gseat.committed : 0,
        folded: gseat ? gseat.folded : false,
        allIn: gseat ? gseat.allIn : false,
        blindRaised: gseat ? gseat.blindRaised : false,
        actedInLevel: gseat ? gseat.actedInLevel : false,
        cardCount: r.isBot ? 0 : gseat ? 3 : 0,
        name: r.name,
      };
    });

    return {
      table: {
        id: table.id,
        tableCode: table.tableCode,
        title: table.title,
        bootAmount: table.bootAmount,
        chaalCap: table.chaalCap,
        maxSeats: table.maxSeats,
        minPlayers: table.minPlayers,
        minBuyIn: table.minBuyIn,
        maxBuyIn: table.maxBuyIn,
        status: table.status,
        handNo: Math.max(0, table.nextHandNo - 1),
        handInPlay: !!game && game.status === 'betting',
      },
      seats,
      turn: game && game.status === 'betting' ? game.turnSeatNo : null,
      pot: game ? game.pot : 0,
      stake: game ? game.stake : table.bootAmount,
      handicap: null,
    };
  }

  async getPrivates(tableId: string, playerId: string) {
    const rt = this.loadRuntime(tableId);
    const game = rt.game;
    if (!game) return { cards: [], handLabel: null, chips: null };
    const seat = game.seats.find((s) => s.playerId === playerId);
    if (!seat) return { cards: [], handLabel: null, chips: null };
    return {
      cards: seat.cards.map((c) => ({ r: c.r, s: c.s })),
      handLabel: evaluateHand(seat.cards, { rankingOrder: game.config.rankingOrder }).label,
      chips: seat.chips,
    };
  }

  async ensureTable(opts: { bootAmount?: number; title?: string; minBuyIn?: number; maxBuyIn?: number; botFill?: boolean; botReserve?: number } = {}): Promise<TeenPattiTable> {
    const { value: cfg } = await this.configService.getConfig();
    const serverSeed = FairRandom.entropyHex(32);

    for (let attempt = 0; attempt < 8; attempt++) {
      const tableCode = `TP-${FairRandom.entropyHex(3).toUpperCase()}`;
      try {
        return await this.prisma.teenPattiTable.create({
          data: {
            tableCode,
            title: opts.title ?? 'Classic Teen Patti',
            bootAmount: opts.bootAmount ?? cfg.bootAmount,
            chaalCap: cfg.chaalCap,
            maxSeats: cfg.seats,
            minPlayers: cfg.minPlayers,
            minBuyIn: opts.minBuyIn ?? cfg.minBuyIn,
            maxBuyIn: opts.maxBuyIn ?? cfg.maxBuyIn,
            botFill: opts.botFill ?? true,
            houseReserve: opts.botReserve ?? cfg.botReserve,
            serverSeed,
            serverSeedHash: FairRandom.hash(serverSeed),
          },
        });
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
    throw new ConflictException('Could not allocate a unique table code; please retry');
  }

  async updateTable(
    tableId: string,
    patch: { bootAmount?: number; chaalCap?: number; minBuyIn?: number; maxBuyIn?: number; maxSeats?: number; minPlayers?: number; title?: string; botFill?: boolean },
    adminId: string,
  ): Promise<TeenPattiTable> {
    const table = await this.prisma.teenPattiTable.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');

    const seats = patch.maxSeats ?? table.maxSeats;
    const minPlayers = patch.minPlayers ?? table.minPlayers;
    const minBuyIn = patch.minBuyIn ?? table.minBuyIn;
    const maxBuyIn = patch.maxBuyIn ?? table.maxBuyIn;

    if (!Number.isInteger(seats) || seats < 3 || seats > 9) throw new BadRequestException('maxSeats must be between 3 and 9');
    if (!Number.isInteger(minPlayers) || minPlayers < 2 || minPlayers > seats) throw new BadRequestException('minPlayers must be between 2 and maxSeats');
    if (!Number.isInteger(minBuyIn) || minBuyIn < 1) throw new BadRequestException('minBuyIn must be >= 1');
    if (!Number.isInteger(maxBuyIn) || maxBuyIn < minBuyIn) throw new BadRequestException('maxBuyIn must be >= minBuyIn');
    if (patch.bootAmount !== undefined && (!Number.isInteger(patch.bootAmount) || patch.bootAmount < 1)) throw new BadRequestException('bootAmount must be >= 1');
    if (patch.chaalCap !== undefined && (!Number.isInteger(patch.chaalCap) || patch.chaalCap < 1 || patch.chaalCap > 20)) {
      throw new BadRequestException('chaalCap must be between 1 and 20');
    }

    const seated = await this.prisma.teenPattiSeat.count({ where: { tableId, isSeated: true } });
    if (seats < seated) throw new BadRequestException(`Cannot shrink below currently seated players (${seated})`);

    const data: Prisma.TeenPattiTableUpdateInput = {};
    if (patch.bootAmount !== undefined) data.bootAmount = patch.bootAmount;
    if (patch.chaalCap !== undefined) data.chaalCap = patch.chaalCap;
    if (patch.minBuyIn !== undefined) data.minBuyIn = patch.minBuyIn;
    if (patch.maxBuyIn !== undefined) data.maxBuyIn = patch.maxBuyIn;
    if (patch.maxSeats !== undefined) data.maxSeats = patch.maxSeats;
    if (patch.minPlayers !== undefined) data.minPlayers = patch.minPlayers;
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.botFill !== undefined) data.botFill = patch.botFill;

    const updated = await this.prisma.teenPattiTable.update({
      where: { id: tableId },
      data,
    });
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'teen_patti.table.updated',
      entityType: 'TeenPattiTable',
      entityId: tableId,
      metadata: { patch: patch as unknown as Prisma.InputJsonValue },
    });
    return updated;
  }

  async applyConfigToTables(adminId: string): Promise<{ updated: number }> {
    const { value: cfg } = await this.configService.getConfig();
    const tables = await this.prisma.teenPattiTable.findMany({
      where: { status: { in: ['open', 'playing'] } },
      select: { id: true, maxSeats: true },
    });

    let updated = 0;
    for (const t of tables) {
      const seated = await this.prisma.teenPattiSeat.count({ where: { tableId: t.id, isSeated: true } });
      const maxSeats = cfg.seats >= seated ? cfg.seats : t.maxSeats;
      await this.prisma.teenPattiTable.update({
        where: { id: t.id },
        data: {
          bootAmount: cfg.bootAmount,
          chaalCap: cfg.chaalCap,
          minBuyIn: cfg.minBuyIn,
          maxBuyIn: cfg.maxBuyIn,
          maxSeats,
          minPlayers: Math.min(cfg.minPlayers, maxSeats),
        },
      });
      updated++;
    }

    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'teen_patti.config.applied_to_tables',
      entityType: 'TeenPattiTable',
      entityId: 'global',
      metadata: { updated, version: (await this.configService.getConfig()).version },
    });

    return { updated };
  }

  // ----------------------------------------------------------
  // Seating + wallet escrow
  // ----------------------------------------------------------

  async sit(tableId: string, playerId: string, buyIn: number): Promise<void> {
    const table = await this.prisma.teenPattiTable.findUnique({ where: { id: tableId } });
    if (!table) throw new NotFoundException('Table not found');
    if (table.status === 'closed') throw new ConflictException('Table is closed');

    await this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      // A hand may be in play; the seat joins from the next hand onward.
      // Hands auto-chain on bot-filled tables, so there is no idle window to
      // sit into. Seating mid-hand is safe: the current in-memory game never
      // touches seats added after it was dealt.
      const player = await this.prisma.player.findUnique({ where: { id: playerId } });
      if (!player) throw new NotFoundException('Player not found');

      const active = await this.prisma.teenPattiSeat.findFirst({
        where: { tableId, playerId, isSeated: true },
      });
      if (active) throw new ConflictException('Already seated on this table');

      const rows = await this.prisma.teenPattiSeat.findMany({
        where: { tableId },
        select: { seatNo: true },
      });
      const taken = new Set(rows.map((o) => o.seatNo));

      const previous = await this.prisma.teenPattiSeat.findFirst({ where: { tableId, playerId } });
      let seatNo: number | undefined;
      if (previous) {
        seatNo = previous.seatNo;
      } else {
        seatNo = Array.from({ length: table.maxSeats }, (_, i) => i + 1).find((n) => !taken.has(n));
        if (!seatNo) throw new ConflictException('Table is full');
      }

      if (!Number.isInteger(buyIn) || buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
        throw new BadRequestException(`Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}`);
      }

      await this.prisma.$transaction(async (tx) => {
        await this.wallet.debit(playerId, buyIn, 'teen_patti', tableId, `Buy-in at ${table.tableCode}`, `tp-buyin-${tableId}-${playerId}-${buyIn}`, {
          tx,
          type: 'game_buyin',
        });
        if (previous) {
          await tx.teenPattiSeat.update({
            where: { id: previous.id },
            data: { chips: buyIn, isSeated: true, joinedAt: new Date(), leftAt: null },
          });
        } else {
          await tx.teenPattiSeat.create({
            data: {
              tableId,
              seatNo: seatNo!,
              playerId,
              name: player.displayName || player.username,
              chips: buyIn,
            },
          });
        }
      });

      await this.audit.log({
        actorId: playerId,
        actorType: 'player',
        action: 'teen_patti.buyin',
        entityType: 'TeenPattiTable',
        entityId: tableId,
        after: { buyIn, seatNo, tableCode: table.tableCode },
      });

      // Kick the table into action: refill bots to minPlayers and deal the
      // first hand as soon as the first human is seated (no waiting for a tick).
      await this.ensureDealt(tableId, rt);
    });
  }

  async rotateSeed(tableId: string, playerId: string, clientSeed: string): Promise<void> {
    const trimmed = typeof clientSeed === 'string' ? clientSeed.trim() : '';
    if (trimmed.length < 8 || trimmed.length > 64 || /[\s]/.test(trimmed)) {
      throw new BadRequestException('clientSeed must be 8-64 non-whitespace characters');
    }
    const updated = await this.prisma.teenPattiSeat.updateMany({
      where: { tableId, playerId, isSeated: true },
      data: { clientSeed: trimmed },
    });
    if (updated.count === 0) throw new NotFoundException('You are not seated on this table');
  }

  async buyMore(tableId: string, playerId: string, amount: number): Promise<void> {
    await this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      const seat = await this.prisma.teenPattiSeat.findFirst({
        where: { tableId, playerId, isSeated: true },
      });
      if (!seat) throw new NotFoundException('Seat not found');
      if (!Number.isInteger(amount) || amount <= 0) throw new BadRequestException('Amount must be positive');

      // Stable idempotency key per (table, player, amount): a retried request is
      // a no-op end to end — the wallet debit, the seat-chip credit AND the
      // in-memory stack bump must all be skipped, otherwise a timeout replay
      // mints free chips. Prefix is distinct from sit()'s buy-in key so a sit
      // of X followed by a top-up of X does not collide on the UNIQUE
      // idempotency constraint.
      const key = `tp-topup-${tableId}-${playerId}-${amount}`;
      const applied = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: key } });
        if (existing) return false;

        await this.wallet.debit(playerId, amount, 'teen_patti', tableId, `Top-up at ${seat.name}`, key, {
          tx,
          type: 'game_buyin',
        });
        await tx.teenPattiSeat.update({
          where: { id: seat.id },
          data: { chips: { increment: amount } },
        });
        return true;
      });

      // Persist the top-up into the live hand too (when the player is in it),
      // otherwise the next settle overwrites the seat row with the stale
      // in-memory chip count and the debit silently vanishes. Only bump the
      // live stack when this request actually applied — a deduped replay must
      // not inflate the in-memory seat.
      if (applied) {
        const gseat = rt.game?.seats.find((s) => s.seatNo === seat.seatNo);
        if (gseat) gseat.chips += amount;
      }
    });
  }

  async stand(tableId: string, playerId: string): Promise<{ cashedOut: number; pending: boolean }> {
    return this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      const seat = await this.prisma.teenPattiSeat.findFirst({
        where: { tableId, playerId, isSeated: true },
      });
      if (!seat) throw new NotFoundException('Seat not found');

      const inPlay = rt.game?.seats.some((s) => s.seatNo === seat.seatNo) ?? false;
      if (rt.game && rt.game.status === 'betting' && inPlay) {
        // Hands auto-chain, so there is no idle window to cash out. Queue the
        // stand and settle it as soon as the current hand finishes.
        if (!rt.pendingStands.has(seat.seatNo)) {
          rt.pendingStands.set(seat.seatNo, { seatId: seat.id, playerId });
        }
        return { cashedOut: 0, pending: true };
      }

      const chips = seat.chips;
      await this.prisma.$transaction(async (tx) => {
        if (chips > 0) {
          // Event-unique key: the seat row is REUSED when a player re-sits, so a
          // stable key would silently skip the refund on a later cash-out.
          await this.wallet.credit(playerId, chips, 'teen_patti', tableId, `Cash-out at ${seat.name}`, `tp-cashout-${seat.id}-${FairRandom.entropyHex(6)}`, {
            tx,
            type: 'game_cashout',
          });
        }
        await tx.teenPattiSeat.update({
          where: { id: seat.id },
          data: { chips: 0, isSeated: false, leftAt: new Date() },
        });
      });
      rt.pendingStands.delete(seat.seatNo);

      await this.audit.log({
        actorId: playerId,
        actorType: 'player',
        action: 'teen_patti.cashout',
        entityType: 'TeenPattiTable',
        entityId: tableId,
        after: { cashedOut: chips },
      });

      return { cashedOut: chips, pending: false };
    });
  }

  // ----------------------------------------------------------
  // Play (server-authoritative actions, atomically persisted)
  // ----------------------------------------------------------

  async performAction(tableId: string, playerId: string, kind: TPActionKind): Promise<{ ok: boolean; reason?: string }> {
    return this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      await this.ensureDealt(tableId, rt);
      const game = rt.game!;
      if (game.status !== 'betting') return { ok: false, reason: 'No hand in progress' };

      const seat = game.seats.find((s) => s.playerId === playerId);
      if (!seat) {
        const seated = await this.prisma.teenPattiSeat.findFirst({
          where: { tableId, playerId, isSeated: true },
          select: { id: true },
        });
        if (!seated) throw new NotFoundException('You are not seated on this table');
        return { ok: false, reason: 'Waiting for the next hand' };
      }
      if (game.turnSeatNo !== seat.seatNo) return { ok: false, reason: 'Not your turn' };

      return this.act(tableId, rt, seat.seatNo, kind);
    });
  }

  /**
   * Applies an action to a CLONE of the in-memory game and only swaps the
   * live runtime reference after the whole mutation (action row + hand row +
   * settlement + rake + reserve) commits in a single DB transaction. A failed
   * DB write therefore leaves the engine state untouched.
   */
  private async act(tableId: string, rt: TableRuntime, seatNo: number, kind: TPActionKind): Promise<{ ok: boolean; reason?: string }> {
    const game = rt.game!;
    const hand = rt.hand!;
    const cloned = this.cloneGame(game);

    const result = cloned.apply(seatNo, kind);
    if (!result.ok) return { ok: false, reason: result.reason ?? 'Illegal action' };

    const amount = result.events.length ? result.events[0].amount : 0;
    const settle = result.settle && result.settle.status === 'finished' ? result.settle : null;

    await this.persistAndSettle(tableId, rt, cloned, seatNo, kind, amount, settle);

    rt.game = cloned;
    rt.lastActionAt.set(seatNo, Date.now());
    if (cloned.seats.find((s) => s.seatNo === seatNo)?.isBot) {
      rt.botSteps.set(seatNo, (rt.botSteps.get(seatNo) ?? 0) + 1);
    }

    this.events.emit(TEEN_PATTI_EVENTS.action, { tableId, events: result.events, handNo: hand.handNo });

    if (settle) {
      await this.finishHand(tableId, rt, hand, settle);
    } else {
      this.emitState(tableId);
    }

    return { ok: true };
  }

  private cloneGame(game: TeenPattiGame): TeenPattiGame {
    const proto = Object.getPrototypeOf(game);
    const copy = Object.create(proto);
    Object.assign(copy, JSON.parse(JSON.stringify(game)));
    return copy as TeenPattiGame;
  }

  private async persistAndSettle(
    tableId: string,
    rt: TableRuntime,
    game: TeenPattiGame,
    seatNo: number,
    kind: TPActionKind,
    amount: number,
    settle: NonNullable<ReturnType<TeenPattiGame['apply']>['settle']> | null,
  ): Promise<void> {
    const hand = rt.hand!;
    await this.prisma.$transaction(async (tx) => {
      await this.persistAction(tx, rt, game, seatNo, kind, amount);
      if (settle) await this.persistSettle(tx, tableId, rt, game, settle);
    });
  }

  private async persistAction(
    tx: Prisma.TransactionClient,
    rt: TableRuntime,
    game: TeenPattiGame,
    seatNo: number,
    kind: TPActionKind,
    amount: number,
  ): Promise<void> {
    const hand = rt.hand!;
    const seat = game.seats.find((s) => s.seatNo === seatNo)!;
    const order = await tx.teenPattiAction.count({ where: { handId: hand.id } });
    await tx.teenPattiAction.create({
      data: {
        handId: hand.id,
        handOrder: order,
        seatNo,
        playerId: seat.playerId,
        isBot: seat.isBot,
        kind,
        amount,
        pot: game.pot,
        stake: game.stake,
        isSeen: seat.isSeen,
      },
    });
    await tx.teenPattiHand.update({
      where: { id: hand.id },
      data: {
        pot: game.pot,
        stake: game.stake,
        stakeLevel: game.stakeLevel,
        currentTurnSeatNo: game.turnSeatNo,
      },
    });
  }

  private async persistSettle(
    tx: Prisma.TransactionClient,
    tableId: string,
    rt: TableRuntime,
    game: TeenPattiGame,
    settle: NonNullable<ReturnType<TeenPattiGame['apply']>['settle']>,
  ): Promise<void> {
    const hand = rt.hand!;

    let botDelta = 0;
    for (const seat of game.seats) {
      await tx.teenPattiSeatHand.updateMany({
        where: { handId: hand.id, seatNo: seat.seatNo },
        data: {
          folded: seat.folded,
          allIn: seat.allIn,
          committed: seat.committed,
          result: settle.payoffs[seat.seatNo] ?? 0,
        },
      });
      await tx.teenPattiSeat.updateMany({
        where: { tableId, seatNo: seat.seatNo, isSeated: true },
        data: { chips: seat.chips },
      });
      if (seat.isBot) {
        const before = rt.chipsAtDeal.get(seat.seatNo) ?? seat.chips;
        botDelta += seat.chips - before;
      }
    }

    const table = await tx.teenPattiTable.findUnique({ where: { id: tableId } });
    const houseReserve = Math.max(0, (table?.houseReserve ?? 0) + botDelta);

    if (settle.rakeCoins > 0) {
      const houseId = await this.housePlayerId(tx);
      await this.wallet.credit(houseId, settle.rakeCoins, 'teen_patti', hand.id, `Table rake for hand #${hand.handNo} at ${table?.tableCode ?? tableId}`, `tp-rake-${hand.id}`, {
        tx,
        type: 'game_rake',
      });
    }

    await tx.teenPattiHand.update({
      where: { id: hand.id },
      data: {
        status: 'finished',
        pot: 0,
        rakeCoins: settle.rakeCoins,
        rakePercent: game.config.rakePercent ?? 0,
        currentTurnSeatNo: null,
        finishedAt: new Date(),
        seedServerSeed: hand.seedServerSeed,
      },
    });
    await tx.teenPattiTable.update({
      where: { id: tableId },
      data: { handInPlay: false, houseReserve },
    });
  }

  private async finishHand(tableId: string, rt: TableRuntime, hand: TeenPattiHand, settle: NonNullable<ReturnType<TeenPattiGame['apply']>['settle']>): Promise<void> {
    this.events.emit(TEEN_PATTI_EVENTS.result, {
      tableId,
      handNo: hand.handNo,
      settle: {
        winners: settle.winners,
        payoffs: settle.payoffs,
        rakeCoins: settle.rakeCoins,
        reveal: settle.reveal.map((r) => ({
          seatNo: r.seatNo,
          playerId: r.playerId,
          isBot: r.isBot,
          cards: r.cards,
          handLabel: r.handLabel,
          committed: r.committed,
        })),
      },
      seedCommitHash: hand.seedCommitHash,
      seedClientSeed: hand.seedClientSeed,
      seedServerSeed: hand.seedServerSeed,
    });

    rt.game = null;
    rt.hand = null;
    rt.chipsAtDeal.clear();

    if (rt.pendingStands.size > 0) {
      const seats = await this.prisma.teenPattiSeat.findMany({
        where: { tableId, isSeated: true },
      });
      for (const [seatNo, pending] of rt.pendingStands) {
        const seat = seats.find((s) => s.seatNo === seatNo && s.id === pending.seatId);
        if (!seat) {
          rt.pendingStands.delete(seatNo);
          continue;
        }
        const chips = seat.chips;
        await this.prisma.$transaction(async (tx) => {
          if (chips > 0) {
            await this.wallet.credit(pending.playerId, chips, 'teen_patti', tableId, `Cash-out at ${seat.name}`, `tp-cashout-${seat.id}-${FairRandom.entropyHex(6)}`, {
              tx,
              type: 'game_cashout',
            });
          }
          await tx.teenPattiSeat.update({
            where: { id: seat.id },
            data: { chips: 0, isSeated: false, leftAt: new Date() },
          });
        });
        await this.audit.log({
          actorId: pending.playerId,
          actorType: 'player',
          action: 'teen_patti.cashout',
          entityType: 'TeenPattiTable',
          entityId: tableId,
          after: { cashedOut: chips, pending: true },
        });
        rt.pendingStands.delete(seatNo);
      }
    }

    await this.deal(tableId, rt);
  }

  // ----------------------------------------------------------
  // Dealing
  // ----------------------------------------------------------

  private async deal(tableId: string, rt: TableRuntime): Promise<void> {
    const table = await this.prisma.teenPattiTable.findUnique({ where: { id: tableId } });
    if (!table) return;

    await this.pruneBrokeSeats(tableId);
    const seatRows = await this.prisma.teenPattiSeat.findMany({
      where: { tableId, isSeated: true, chips: { gt: 0 } },
      orderBy: { seatNo: 'asc' },
    });
    const realCount = seatRows.filter((s) => !s.isBot).length;

    if (realCount === 0) {
      rt.game = null;
      rt.hand = null;
      rt.chipsAtDeal.clear();
      await this.prisma.teenPattiTable.update({
        where: { id: tableId },
        data: { handInPlay: false, status: 'open' },
      });
      return;
    }

    await this.refillBots(table, seatRows);

    const readyRows = await this.prisma.teenPattiSeat.findMany({
      where: { tableId, isSeated: true, chips: { gt: 0 } },
      orderBy: { seatNo: 'asc' },
    });
    if (readyRows.length < 2) {
      rt.game = null;
      rt.hand = null;
      rt.chipsAtDeal.clear();
      await this.prisma.teenPattiTable.update({
        where: { id: tableId },
        data: { handInPlay: false, status: 'open' },
      });
      return;
    }

    const nonce = table.nextHandNo;
    const override = readyRows.find((s) => !s.isBot && s.clientSeed && s.clientSeed.length >= 8 && s.clientSeed.length <= 64);
    const clientSeed = override ? override.clientSeed : FairRandom.entropyHex(16);
    const serverSeed = FairRandom.entropyHex(32);
    const commit = FairRandom.hash(serverSeed);
    const input: FairSeedInput = { serverSeed, clientSeed, nonce };

    const dealerSeat = readyRows.find((s) => s.seatNo > table.dealerSeatNo) ?? readyRows[0];
    const { value: cfg } = await this.configService.getConfig();
    const { seats: dealt } = dealHands(
      input,
      readyRows.map((r) => ({ seatNo: r.seatNo, playerId: r.playerId, isBot: r.isBot, chips: r.chips, isSeen: false })),
      { cardsPerPlayer: cfg.cardsPerPlayer, deckCount: cfg.deckCount },
    );

    const config: TPGameConfig = {
      bootAmount: table.bootAmount,
      chaalCap: table.chaalCap,
      maxSeats: table.maxSeats,
      maxActionsPerHand: cfg.maxActionsPerHand,
      rakePercent: cfg.rakePercent,
      rankingOrder: cfg.rankingOrder,
      tieBreak: cfg.tieBreak,
      tieBreakKey: commit,
      tieBreakNonce: nonce,
      cardVisibility: cfg.cardVisibility,
    };
    const game = new TeenPattiGame(config, dealt, dealerSeat.seatNo);

    for (const r of readyRows) rt.chipsAtDeal.set(r.seatNo, r.chips);

    const hand = await this.prisma.teenPattiHand.create({
      data: {
        tableId,
        handNo: nonce,
        status: 'betting',
        dealerSeatNo: dealerSeat.seatNo,
        currentTurnSeatNo: game.turnSeatNo,
        pot: game.pot,
        stake: game.stake,
        stakeLevel: game.stakeLevel,
        seedCommitHash: commit,
        seedClientSeed: clientSeed,
        seedNonce: nonce,
        seedServerSeed: serverSeed,
      },
    });

    await this.prisma.teenPattiSeatHand.createMany({
      data: dealt.map((d) => ({
        handId: hand.id,
        seatNo: d.seatNo,
        playerId: d.playerId,
        isBot: d.isBot,
        cards: JSON.stringify(d.cards),
        isSeen: false,
        chipsIn: rt.chipsAtDeal.get(d.seatNo)!,
      })),
    });

    await this.prisma.teenPattiTable.update({
      where: { id: tableId },
      data: {
        nextHandNo: nonce + 1,
        dealerSeatNo: dealerSeat.seatNo,
        status: 'playing',
        handInPlay: true,
      },
    });

    rt.game = game;
    rt.hand = hand;
    if (rt.botSteps.size === 0) {
      for (const r of readyRows) if (r.isBot) rt.botSteps.set(r.seatNo, 0);
    }
    if (game.turnSeatNo !== null) rt.lastActionAt.set(game.turnSeatNo, Date.now());

    this.events.emit(TEEN_PATTI_EVENTS.action, {
      tableId,
      events: [{ type: 'deal', seatNo: 0, amount: 0, pot: game.pot, stake: game.stake }],
      handNo: nonce,
    });
    this.emitState(tableId);
  }

  private async pruneBrokeSeats(tableId: string): Promise<void> {
    await this.prisma.teenPattiSeat.updateMany({
      where: { tableId, isSeated: true, chips: { lte: 0 }, isBot: true },
      data: { isSeated: false, leftAt: new Date() },
    });
  }

  private async refillBots(table: TeenPattiTable, current: TeenPattiSeat[]): Promise<void> {
    if (!table.botFill) return;
    const real = current.filter((s) => !s.isBot);
    if (real.length === 0) return;

    const seated = current.filter((s) => s.isBot).length;
    const want = Math.max(0, table.minPlayers - (real.length + seated));
    if (want === 0) return;

    const taken = new Set(current.map((s) => s.seatNo));
    const free = Array.from({ length: table.maxSeats }, (_, i) => i + 1).filter((n) => !taken.has(n));
    const useseed: FairSeedInput = { serverSeed: table.serverSeed, clientSeed: 'bot-fill', nonce: table.nextHandNo };

    const now = new Date();
    const existingNames = new Set(current.map((s) => s.name));
    const rows: { tableId: string; seatNo: number; name: string; isBot: boolean; chips: number; joinedAt: Date }[] = [];
    let reserve = table.houseReserve;

    for (let idx = 0; idx < Math.min(free.length, want); idx++) {
      const seatNo = free[idx];
      const chips = 400 + FairRandom.int({ ...useseed, instance: idx }, 1601);
      if (reserve < chips) break;
      reserve -= chips;
      let name = botName(FairRandom.int({ ...useseed, instance: idx + 300 }, 100));
      while (existingNames.has(name)) {
        name = `${name} #${seatNo}`;
      }
      existingNames.add(name);
      rows.push({ tableId: table.id, seatNo, name, isBot: true, chips, joinedAt: now });
    }

    if (rows.length === 0) return;

    await this.prisma.teenPattiSeat.createMany({ data: rows });
    await this.prisma.teenPattiTable.update({
      where: { id: table.id },
      data: { houseReserve: Math.max(0, reserve) },
    });
  }

  // ----------------------------------------------------------
  // Tick loop (bots + human timeouts)
  // ----------------------------------------------------------

  private async tickAll(): Promise<void> {
    // Tick 'open' tables too: they may be waiting on bot fill + a first deal
    // (e.g. a human sat down while the process was busy or after a restart).
    const tables = await this.prisma.teenPattiTable.findMany({
      where: { status: { in: ['open', 'playing'] } },
      select: { id: true },
    });
    await Promise.all(tables.map((t) => this.tickTable(t.id)));
  }

  async tickTable(tableId: string): Promise<void> {
    await this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      await this.ensureDealt(tableId, rt);
      const game = rt.game;
      if (!game || game.status !== 'betting' || game.turnSeatNo === null) return;

      const seatNo = game.turnSeatNo;
      const seat = game.seats.find((s) => s.seatNo === seatNo);
      if (!seat) return;

      const available = game.availableActions(seatNo);
      if (available.length === 0) return;

      if (!seat.isBot) {
        const { value: cfg } = await this.configService.getConfig();
        const timeoutMs = cfg.actionTimeoutSeconds * 1000;
        const last = rt.lastActionAt.get(seatNo) ?? Date.now();
        if (Date.now() - last < timeoutMs) return;
        await this.act(tableId, rt, seatNo, 'fold');
        return;
      }

      const step = rt.botSteps.get(seatNo) ?? 0;
      const hand = rt.hand!;
      const kind = selectBotAction(
        { serverSeed: hand.seedServerSeed!, clientSeed: hand.seedClientSeed, nonce: hand.seedNonce },
        step,
        { chips: seat.chips, committed: seat.committed, isSeen: seat.isSeen, handRank: seat.isSeen ? evaluateHand(seat.cards, { rankingOrder: game.config.rankingOrder }).rank : 0 },
        { pot: game.pot, stake: game.stake, stakeLevel: game.stakeLevel, chaalCap: game.config.chaalCap, countInHand: game.countInHand() },
        available,
      );

      const before = rt.botSteps.get(seatNo) ?? 0;
      const result = await this.act(tableId, rt, seatNo, kind);
      if (!result.ok) {
        this.logger.warn(`Bot action rejected on ${tableId}: ${kind}`);
        rt.botSteps.set(seatNo, before);
      }
    });
  }

  // ----------------------------------------------------------
  // Boot rehydration
  // ----------------------------------------------------------

  private async abortStaleHands(): Promise<void> {
    const stale = await this.prisma.teenPattiHand.findMany({
      where: { status: 'betting' },
      select: { id: true, tableId: true },
    });
    if (stale.length === 0) return;

    await this.prisma.teenPattiHand.updateMany({
      where: { id: { in: stale.map((s) => s.id) }, status: 'betting' },
      data: { status: 'aborted', pot: 0, finishedAt: new Date() },
    });
    const tableIds = [...new Set(stale.map((s) => s.tableId))];
    await this.prisma.teenPattiTable.updateMany({
      where: { id: { in: tableIds } },
      data: { handInPlay: false, status: 'open' },
    });
    this.logger.warn(`Aborted ${stale.length} stale in-flight teen-patti hand(s) on boot`);
  }

  private async rehydrateAll(): Promise<void> {
    await this.abortStaleHands();
    const tables = await this.prisma.teenPattiTable.findMany({
      where: { status: { in: ['open', 'playing'] } },
      select: { id: true },
    });
    for (const t of tables) {
      await this.tickTable(t.id);
    }
  }

  // ----------------------------------------------------------
  // Admin lifecycle
  // ----------------------------------------------------------

  async createTable(opts: { bootAmount?: number; title?: string; minBuyIn?: number; maxBuyIn?: number; botFill?: boolean; botReserve?: number } = {}, adminId: string): Promise<TeenPattiTable> {
    const table = await this.ensureTable(opts);
    await this.audit.log({
      actorId: adminId,
      actorType: 'admin',
      action: 'teen_patti.table.created',
      entityType: 'TeenPattiTable',
      entityId: table.id,
      metadata: { tableCode: table.tableCode },
    });
    return table;
  }

  async closeTable(tableId: string, adminId: string): Promise<{ ok: boolean }> {
    return this.runLocked(tableId, async () => {
      const table = await this.prisma.teenPattiTable.findUnique({ where: { id: tableId } });
      if (!table) throw new NotFoundException('Table not found');

      const rt = this.loadRuntime(tableId);
      if (rt.hand) {
        await this.prisma.teenPattiHand.update({
          where: { id: rt.hand.id },
          data: { status: 'aborted', pot: 0, finishedAt: new Date() },
        });
      }
      rt.game = null;
      rt.hand = null;
      rt.chipsAtDeal.clear();

      const seats = await this.prisma.teenPattiSeat.findMany({ where: { tableId, isSeated: true } });
      const now = new Date();
      const botChips = seats.filter((s) => s.isBot).reduce((sum, s) => sum + (s.chips > 0 ? s.chips : 0), 0);
      await this.prisma.$transaction(async (tx) => {
        for (const seat of seats) {
          if (!seat.isBot && seat.playerId && seat.chips > 0) {
            await this.wallet.credit(seat.playerId, seat.chips, 'teen_patti', tableId, `Cash-out on table close at ${seat.name}`, `tp-closeout-${seat.id}-${FairRandom.entropyHex(6)}`, {
              tx,
              type: 'game_cashout',
            });
          }
          await tx.teenPattiSeat.update({
            where: { id: seat.id },
            data: { chips: 0, isSeated: false, leftAt: now },
          });
        }
        await tx.teenPattiTable.update({
          where: { id: tableId },
          data: { status: 'closed', handInPlay: false, houseReserve: Math.max(0, (table.houseReserve ?? 0) + botChips) },
        });
      });

      await this.audit.log({
        actorId: adminId,
        actorType: 'admin',
        action: 'teen_patti.table.closed',
        entityType: 'TeenPattiTable',
        entityId: tableId,
        metadata: { cashedOutSeats: seats.length },
      });

      return { ok: true };
    });
  }

  async kickPlayer(tableId: string, playerId: string, adminId: string): Promise<{ ok: boolean; cashedOut: number }> {
    return this.runLocked(tableId, async () => {
      const rt = this.loadRuntime(tableId);
      const seat = await this.prisma.teenPattiSeat.findFirst({
        where: { tableId, playerId, isSeated: true },
      });
      if (!seat || seat.isBot) throw new NotFoundException('Player is not seated on this table');

      const chips = seat.chips;

      // Fold the player out of the live hand so they cannot keep betting.
      // Refund ONLY the un-committed residual stack: chips already committed
      // into the pot stay there and are fought over by the remaining players —
      // kitting out the full buy-in mid-hand would pay the committed chips
      // twice (wallet refund + pot payout).
      const gseat = rt.game?.seats.find((s) => s.seatNo === seat.seatNo);
      if (gseat) {
        gseat.folded = true;
      }
      const cashedOut = gseat ? Math.max(0, gseat.chips) : chips;

      await this.prisma.$transaction(async (tx) => {
        if (cashedOut > 0) {
          await this.wallet.credit(playerId, cashedOut, 'teen_patti', tableId, `Kicked by admin at ${seat.name}`, `tp-kick-${seat.id}-${FairRandom.entropyHex(6)}`, {
            tx,
            type: 'game_cashout',
          });
        }
        await tx.teenPattiSeat.update({
          where: { id: seat.id },
          data: { chips: 0, isSeated: false, leftAt: new Date() },
        });
      });

      await this.audit.log({
        actorId: adminId,
        actorType: 'admin',
        action: 'teen_patti.player.kicked',
        entityType: 'TeenPattiTable',
        entityId: tableId,
        metadata: { playerId, cashedOut },
      });

      return { ok: true, cashedOut };
    });
  }

  async handHistory(tableId: string, page = 1, limit = 20): Promise<{
    data: (TeenPattiHand & { seatHands: { seatNo: number; playerId: string | null; isBot: boolean; result: number; folded: boolean }[]; actions: { kind: string; seatNo: number; amount: number; handOrder: number }[] })[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, Math.floor(page) || 1);
    const safeLimit = Math.min(Math.max(1, Math.floor(limit) || 20), 100);
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.prisma.teenPattiHand.findMany({
        where: { tableId },
        orderBy: { handNo: 'desc' },
        skip,
        take: safeLimit,
        include: {
          seatHands: { select: { seatNo: true, playerId: true, isBot: true, result: true, folded: true } },
          actions: { select: { kind: true, seatNo: true, amount: true, handOrder: true }, orderBy: { handOrder: 'asc' } },
        },
      }),
      this.prisma.teenPattiHand.count({ where: { tableId } }),
    ]);

    return { data: rows, meta: { total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) } };
  }

  async rakeSummary(): Promise<{
    totalRake: number;
    totalHands: number;
    byTable: { tableId: string; tableCode: string; rakeCoins: number; hands: number }[];
  }> {
    const agg = await this.prisma.teenPattiHand.aggregate({
      where: { status: 'finished' },
      _sum: { rakeCoins: true },
      _count: true,
    });
    const grouped = await this.prisma.teenPattiHand.groupBy({
      by: ['tableId'],
      where: { status: 'finished' },
      _sum: { rakeCoins: true },
      _count: true,
    });
    const tables = await this.prisma.teenPattiTable.findMany({
      where: { id: { in: grouped.map((g) => g.tableId) } },
      select: { id: true, tableCode: true },
    });
    const codeById = new Map(tables.map((t) => [t.id, t.tableCode]));

    return {
      totalRake: agg._sum.rakeCoins ?? 0,
      totalHands: agg._count,
      byTable: grouped.map((g) => ({
        tableId: g.tableId,
        tableCode: codeById.get(g.tableId) ?? g.tableId,
        rakeCoins: g._sum.rakeCoins ?? 0,
        hands: g._count,
      })),
    };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------

  private async ensureDealt(tableId: string, rt: TableRuntime): Promise<void> {
    if (rt.game && rt.game.status !== 'finished') return;
    await this.deal(tableId, rt);
  }

  private async housePlayerId(db: PrismaService | Prisma.TransactionClient): Promise<string> {
    const username = process.env.TEENPATTI_HOUSE_USERNAME ?? 'house_operator';
    const row = await db.player.upsert({
      where: { username },
      update: {},
      create: { username, passwordHash: `house-${FairRandom.entropyHex(16)}`, displayName: 'House Operator', isActive: true },
    });
    return row.id;
  }

  private maskPlayerId(playerId: string | null, viewerPlayerId: string | undefined, seatNo: number): string | null {
    if (!playerId) return null;
    if (viewerPlayerId && playerId === viewerPlayerId) return playerId;
    return `player-${seatNo}`;
  }

  private emitState(tableId: string): void {
    void this.getTable(tableId).then((state) => {
      if (state) this.events.emit(TEEN_PATTI_EVENTS.state, { tableId, state });
    });
  }
}