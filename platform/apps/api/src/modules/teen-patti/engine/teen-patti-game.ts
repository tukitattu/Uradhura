import { TPCard, cardLabel } from './cards';
import { evaluateHand, compareHands, TPHandRank } from './evaluator';

export interface TPGameConfig {
  bootAmount: number;
  chaalCap: number;
  maxSeats: number;
  maxActionsPerHand: number;
}

export interface TPSeat {
  seatNo: number;
  playerId: string | null;
  isBot: boolean;
  chips: number;
  isSeen: boolean;
  cards: TPCard[];
  committed: number;
  folded: boolean;
  allIn: boolean;
  blindRaised: boolean;
  actedInLevel: boolean;
}

export type TPSeatView = Omit<TPSeat, 'cards'> & { cardCount: number };

export type TPHandStatus = 'betting' | 'finished';

export type TPActionKind = 'fold' | 'see' | 'blind' | 'chaal' | 'call' | 'raise' | 'allin' | 'show';

export interface TPEvent {
  type: TPActionKind | 'deal' | 'boot' | 'win' | 'showdown' | 'advance';
  seatNo: number;
  amount: number;
  pot: number;
  stake: number;
}

export interface TPApplyResult {
  ok: boolean;
  reason?: string;
  events: TPEvent[];
  nextTurn: number | null;
  settle?: TPSettle;
  settledHand?: { seats: HandReveal[]; winners: number[]; showdown: boolean };
}

export interface HandReveal {
  seatNo: number;
  playerId: string | null;
  isBot: boolean;
  cards: string[];
  handLabel: string;
  committed: number;
}

export interface TPSettle {
  status: TPHandStatus;
  winners: number[];
  payoffs: Record<number, number>;
  reveal: HandReveal[];
}

export class TeenPattiGame {
  readonly config: TPGameConfig;
  seats: TPSeat[];
  pot = 0;
  stake: number;
  stakeLevel = 0;
  dealerSeatNo: number;
  status: TPHandStatus = 'betting';
  turnSeatNo: number | null = null;
  actionCount = 0;
  settle: TPSettle | null = null;

  constructor(
    config: TPGameConfig,
    seats: Omit<TPSeat, 'committed' | 'folded' | 'allIn' | 'blindRaised' | 'actedInLevel'>[],
    dealerSeatNo: number,
  ) {
    this.config = config;
    this.stake = config.bootAmount;
    this.dealerSeatNo = dealerSeatNo;
    this.seats = seats.map((s) => ({
      seatNo: s.seatNo,
      playerId: s.playerId,
      isBot: s.isBot,
      chips: s.chips,
      isSeen: s.isSeen,
      cards: s.cards,
      committed: 0,
      folded: false,
      allIn: false,
      blindRaised: false,
      actedInLevel: false,
    }));
    this.postBoots();
    this.seats.sort((a, b) => a.seatNo - b.seatNo);
    this.turnSeatNo = this.firstActingSeat();
  }

  seat(seatNo: number): TPSeat {
    const s = this.seats.find((x) => x.seatNo === seatNo);
    if (!s) throw new Error(`seat ${seatNo} not found`);
    return s;
  }

  countInHand(): number {
    return this.seats.filter((s) => !s.folded).length;
  }

  actingSeats(): TPSeat[] {
    return this.seats.filter((s) => !s.folded && !s.allIn && s.chips > 0);
  }

  inHandSeats(): TPSeat[] {
    return this.seats.filter((s) => !s.folded);
  }

  views(): TPSeatView[] {
    return this.seats.map((s) => ({
      seatNo: s.seatNo,
      playerId: s.playerId,
      isBot: s.isBot,
      chips: s.chips,
      isSeen: s.isSeen,
      committed: s.committed,
      folded: s.folded,
      allIn: s.allIn,
      blindRaised: s.blindRaised,
      actedInLevel: s.actedInLevel,
      cardCount: s.cards.length,
    }));
  }

  private postBoots(): void {
    for (const s of this.seats) {
      const required = s.seatNo === this.dealerSeatNo ? this.config.bootAmount * 2 : this.config.bootAmount;
      const pay = Math.min(required, s.chips);
      s.chips -= pay;
      s.committed += pay;
      this.pot += pay;
      if (s.chips === 0) s.allIn = true;
    }
    this.stake = this.config.bootAmount;
  }

  private firstActingSeat(): number | null {
    return this.nextActingSeat(this.dealerSeatNo);
  }

  private nextActingSeat(afterSeatNo: number): number | null {
    const nums = this.seats.map((s) => s.seatNo);
    const start = nums.indexOf(afterSeatNo);
    const count = nums.length;
    for (let k = 1; k <= count; k++) {
      const idx = (start + k) % count;
      const s = this.seats[idx];
      if (!s.folded && !s.allIn && s.chips > 0) return s.seatNo;
    }
    return null;
  }

  availableActions(seatNo: number): TPActionKind[] {
    if (this.status !== 'betting') return [];
    const s = this.seat(seatNo);
    if (s.folded || s.allIn) return [];
    if (this.turnSeatNo !== seatNo) return [];
    if (this.countInHand() === 1) return [];

    const actions: TPActionKind[] = [];
    if (!s.isSeen) {
      actions.push('see');
      actions.push('fold');
      if (!s.blindRaised && this.stakeLevel < this.config.chaalCap) actions.push('raise');
      if (s.chips >= this.stake) actions.push('blind');
    } else {
      actions.push('fold');
      if (s.chips >= this.costToContinue(s) || this.stakeLevel < this.config.chaalCap) actions.push('chaal');
      if (this.stakeLevel < this.config.chaalCap) actions.push('raise');
      if (this.countInHand() === 2) actions.push('show');
    }
    if (s.chips < this.costToContinue(s)) actions.push('allin');
    return actions;
  }

  private costToContinue(s: TPSeat): number {
    return s.isSeen ? this.stake * 2 : this.stake;
  }

  apply(seatNo: number, kind: TPActionKind): TPApplyResult {
    if (this.status !== 'betting') {
      return { ok: false, reason: 'hand already finished', events: [], nextTurn: null };
    }
    const s = this.seat(seatNo);
    if (this.turnSeatNo !== seatNo) {
      return { ok: false, reason: 'not your turn', events: [], nextTurn: null };
    }
    if (!this.availableActions(seatNo).includes(kind)) {
      return { ok: false, reason: `illegal action ${kind}`, events: [], nextTurn: null };
    }

    const events: TPEvent[] = [];
    this.actionCount += 1;

    switch (kind) {
      case 'fold':
        s.folded = true;
        events.push({ type: 'fold', seatNo, amount: 0, pot: this.pot, stake: this.stake });
        break;

      case 'see': {
        s.isSeen = true;
        events.push({ type: 'see', seatNo, amount: 0, pot: this.pot, stake: this.stake });
        break;
      }

      case 'raise': {
        const wasSolo = this.nextActingSeat(seatNo) === seatNo;
        this.stake *= 2;
        this.stakeLevel += 1;
        if (!s.isSeen) s.blindRaised = true;
        for (const o of this.actingSeats()) o.actedInLevel = false;
        const pay = Math.min(this.costToContinue(s), s.chips);
        s.chips -= pay;
        s.committed += pay;
        this.pot += pay;
        if (s.chips === 0) s.allIn = true;
        s.actedInLevel = true;
        events.push({ type: 'raise', seatNo, amount: pay, pot: this.pot, stake: this.stake });
        if (!wasSolo) break;
        return this.resolveHand(events);
      }

      default: {
        const normalized = kind === 'allin' ? (s.isSeen ? 'chaal' : 'blind') : kind;
        const cost = this.costToContinue(s);
        const allIn = s.chips < cost;
        const pay = allIn ? s.chips : cost;
        s.chips -= pay;
        s.committed += pay;
        this.pot += pay;
        if (s.chips === 0) s.allIn = true;
        s.actedInLevel = true;
        if (allIn) {
          events.push({ type: 'allin', seatNo, amount: pay, pot: this.pot, stake: this.stake });
        } else {
          events.push({ type: normalized, seatNo, amount: pay, pot: this.pot, stake: this.stake });
        }
        break;
      }
    }

    if (this.actionCount >= this.config.maxActionsPerHand) {
      return this.resolveHand(events);
    }

    if (kind === 'show') {
      return this.resolveHand(events);
    }

    if (this.countInHand() <= 1) {
      return this.resolveHand(events);
    }

    const next = this.nextActingSeat(seatNo);
    if (next === null || next === seatNo) {
      return this.resolveHand(events);
    }

    this.turnSeatNo = next;
    const capReached = this.stakeLevel >= this.config.chaalCap;
    if (capReached && this.actingSeats().every((x) => x.actedInLevel)) {
      return this.resolveHand(events);
    }

    return { ok: true, events, nextTurn: next };
  }

  private resolveHand(events: TPEvent[]): TPApplyResult {
    this.status = 'finished';
    const showdown = this.inHandSeats().length > 1;
    const reveal = this.buildReveal();
    const potShare = new Map<number, number>();
    for (const g of this.buildPots()) {
      potShare.set(g.seatNo, (potShare.get(g.seatNo) ?? 0) + g.amount);
    }
    const payoffs: Record<number, number> = {};
    for (const s of this.seats) {
      const share = potShare.get(s.seatNo) ?? 0;
      payoffs[s.seatNo] = share - s.committed;
      s.chips += share;
    }
    this.settle = {
      status: 'finished',
      winners: this.computeWinners(),
      payoffs,
      reveal,
    };
    this.pot = 0;
    events.push({
      type: showdown ? 'showdown' : 'win',
      seatNo: this.settle.winners[0],
      amount: payoffs[this.settle.winners[0]] ?? 0,
      pot: 0,
      stake: this.stake,
    });
    return {
      ok: true,
      events,
      nextTurn: null,
      settle: this.settle,
      settledHand: { seats: reveal, winners: this.settle.winners, showdown },
    };
  }

  private buildReveal(): HandReveal[] {
    const inHand = this.inHandSeats();
    return inHand.map((s) => {
      const rank = evaluateHand(s.cards);
      return {
        seatNo: s.seatNo,
        playerId: s.playerId,
        isBot: s.isBot,
        cards: s.cards.map(cardLabel),
        handLabel: rank.label,
        committed: s.committed,
      };
    });
  }

  private computeWinners(): number[] {
    const inHand = this.inHandSeats();
    if (inHand.length === 1) return [inHand[0].seatNo];
    const acting = this.actingSeats();
    const contest = acting.length >= 2 ? acting : inHand;
    let best = contest[0];
    for (const s of contest) {
      if (compareHands(evaluateHand(s.cards), evaluateHand(best.cards)) > 0) best = s;
    }
    return contest.filter((s) => compareHands(evaluateHand(s.cards), evaluateHand(best.cards)) === 0).map((s) => s.seatNo);
  }

  private buildPots(): { seatNo: number; amount: number }[] {
    const inHand = this.inHandSeats();
    const acting = this.actingSeats();
    const contest = acting.length >= 2 ? acting : inHand;

    const levels = [...new Set(inHand.map((s) => s.committed))].sort((a, b) => a - b);
    const potGroups: { seatNo: number; amount: number }[] = [];
    let prev = 0;
    for (const L of levels) {
      const layerTotal = this.seats.reduce((sum, s) => sum + Math.max(0, Math.min(s.committed, L) - prev), 0);
      prev = L;
      const eligible = contest.filter((s) => s.committed >= L);
      if (eligible.length === 0) continue;
      let best = evaluateHand(eligible[0].cards);
      let ties = [eligible[0]];
      for (let i = 1; i < eligible.length; i++) {
        const cmp = compareHands(evaluateHand(eligible[i].cards), best);
        if (cmp > 0) {
          best = evaluateHand(eligible[i].cards);
          ties = [eligible[i]];
        } else if (cmp === 0) {
          ties.push(eligible[i]);
        }
      }
      const tiedSorted = [...ties].sort((a, b) => a.seatNo - b.seatNo);
      const share = Math.floor(layerTotal / tiedSorted.length);
      let remainder = layerTotal % tiedSorted.length;
      for (const t of tiedSorted) {
        let amount = share;
        if (remainder > 0) {
          amount += 1;
          remainder -= 1;
        }
        potGroups.push({ seatNo: t.seatNo, amount });
      }
    }
    return potGroups;
  }
}