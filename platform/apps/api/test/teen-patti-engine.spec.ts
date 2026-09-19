import { evaluateHand, compareHands } from '../src/modules/teen-patti/engine/evaluator';
import { TeenPattiGame, TPGameConfig, TPSeat } from '../src/modules/teen-patti/engine/teen-patti-game';
import { dealHands, DealSeat } from '../src/modules/teen-patti/engine/deal';

function c(r: number, s: number) { return { r, s }; }

const cfg: TPGameConfig = { bootAmount: 10, chaalCap: 4, maxSeats: 6, maxActionsPerHand: 200 };

function seedFor(nonce: number) {
  return { serverSeed: 'unit-test-server', clientSeed: 'unit-test-client', nonce };
}

function seats(nums: number[], chips = 500, isSeen = false): DealSeat[] {
  return nums.map((n) => ({ seatNo: n, playerId: null, isBot: true, chips, isSeen }));
}

function dealt(seatNos: number[], nonce: number, chips = 500, isSeen = false) {
  return dealHands(seedFor(nonce), seats(seatNos, chips, isSeen)).seats;
}

function chipSum(s: { chips: number }[]) { return s.reduce((a: number, x: { chips: number }) => a + x.chips, 0); }

describe('Teen Patti evaluator', () => {
  it('ranks all categories in order', () => {
    const trail = evaluateHand([c(14, 0), c(14, 1), c(14, 2)]);
    const pure = evaluateHand([c(10, 0), c(11, 0), c(12, 0)]);
    const seq = evaluateHand([c(10, 0), c(11, 1), c(12, 2)]);
    const color = evaluateHand([c(2, 0), c(7, 0), c(14, 0)]);
    const pair = evaluateHand([c(5, 0), c(5, 1), c(2, 2)]);
    const high = evaluateHand([c(2, 0), c(7, 1), c(14, 2)]);
    expect(trail.rank).toBeGreaterThan(pure.rank);
    expect(pure.rank).toBeGreaterThan(seq.rank);
    expect(seq.rank).toBeGreaterThan(color.rank);
    expect(color.rank).toBeGreaterThan(pair.rank);
    expect(pair.rank).toBeGreaterThan(high.rank);
  });

  it('handles A-2-3 as the lowest sequence', () => {
    const a23 = evaluateHand([c(14, 0), c(2, 1), c(3, 2)]);
    const kqj = evaluateHand([c(13, 0), c(12, 1), c(11, 2)]);
    expect(a23.rank).toBe(4);
    expect(compareHands(a23, kqj)).toBeLessThan(0);
  });

  it('compares pairs by pair then kicker', () => {
    expect(compareHands(evaluateHand([c(5,0),c(5,1),c(14,2)]), evaluateHand([c(5,0),c(5,1),c(13,2)]))).toBeGreaterThan(0);
    expect(compareHands(evaluateHand([c(6,0),c(6,1),c(2,2)]), evaluateHand([c(5,0),c(5,1),c(14,2)]))).toBeGreaterThan(0);
  });
});

describe('deal determinism', () => {
  it('produces identical decks for the same seed', () => {
    const a = dealHands(seedFor(42), seats([1,2,3]));
    const b = dealHands(seedFor(42), seats([1,2,3]));
    expect(a.seats.map(s=>s.cards)).toEqual(b.seats.map(s=>s.cards));
  });

  it('deals all 52 cards with no overlaps', () => {
    const { seats: s, deck } = dealHands(seedFor(7), seats([1,2,3,4,5,6]));
    const all = [...s.flatMap(x=>x.cards), ...deck];
    expect(new Set(all.map(c=>`${c.r}-${c.s}`)).size).toBe(52);
  });
});

describe('hand state machine', () => {
  it('posts boots correctly', () => {
    const d = dealt([1,2,3], 1);
    const g = new TeenPattiGame(cfg, d, 1);
    expect(g.pot).toBe(40);
    expect(g.seat(1).committed).toBe(20);
    expect(g.seat(2).committed).toBe(10);
    expect(g.seat(3).committed).toBe(10);
    expect(g.turnSeatNo).toBe(2);
  });

  it('rejects out-of-turn actions', () => {
    const g = new TeenPattiGame(cfg, dealt([1,2,3], 1), 1);
    expect(g.apply(1, 'blind').ok).toBe(false);
  });

  it('plays to a winner with full chip conservation', () => {
    const g = new TeenPattiGame(cfg, dealt([1,2,3], 3), 1);
    const start = g.pot + chipSum(g.seats);
    let guard = 0;
    while (guard++ < 200 && g.status === 'betting') {
      const s = g.turnSeatNo!;
      const acts = g.availableActions(s);
      expect(g.apply(s, acts[0]).ok).toBe(true);
    }
    expect(g.status).toBe('finished');
    expect(chipSum(g.seats) + g.pot).toBe(start);
    expect(Object.values(g.settle!.payoffs).reduce((a,v)=>a+v, 0)).toBe(0);
  });

  it('gives a solo survivor the entire pot', () => {
    const g = new TeenPattiGame(cfg, dealt([1,2,3], 5), 1);
    g.apply(2, 'fold');
    const potBefore = g.pot;
    g.apply(3, 'fold');
    expect(g.settle!.winners).toEqual([1]);
    expect(g.settle!.payoffs[1]).toBe(potBefore - g.seat(1).committed);
    expect(g.seat(1).chips).toBe(520);
    expect(g.seat(2).chips).toBe(490);
    expect(g.seat(3).chips).toBe(490);
  });

  it('handles an all-in short stack with side pots', () => {
    const chips: Record<number, number> = { 1: 30, 2: 10, 3: 200 };
    const inputs = [1, 2, 3].map((n) => ({ seatNo: n, playerId: null, isBot: true, chips: chips[n], isSeen: true }));
    const d = dealHands(seedFor(9), inputs).seats;
    const g = new TeenPattiGame({ ...cfg, bootAmount: 2 }, d, 1);
    const start = g.pot + chipSum(g.seats);

    for (let i = 0; i < 200 && g.status === 'betting'; i++) {
      const s = g.turnSeatNo!;
      const acts = g.availableActions(s);
      if (g.seat(s).chips < g.stake * 2 && acts.includes('allin')) {
        g.apply(s, 'allin');
      } else if (acts.includes('chaal')) {
        g.apply(s, 'chaal');
      } else {
        g.apply(s, acts[0]);
      }
    }

    expect(g.status).toBe('finished');
    expect(g.seats.every((x) => x.chips >= 0)).toBe(true);
    expect(chipSum(g.seats) + g.pot).toBe(start);
    const net = Object.values(g.settle!.payoffs).reduce((a, v) => a + v, 0);
    expect(net).toBe(0);
  });

  it('forces showdown when the chaal cap is hit', () => {
    const g = new TeenPattiGame({ ...cfg, bootAmount: 2 }, dealt([1,2,3], 11, 2000, true), 1);
    let guard = 0, capHit = false;
    while (guard++ < 200 && g.status === 'betting') {
      const s = g.turnSeatNo!;
      const acts = g.availableActions(s);
      if (acts.includes('raise')) {
        g.apply(s, 'raise');
        if (g.stakeLevel >= cfg.chaalCap) capHit = true;
      } else if (acts.includes('chaal')) {
        g.apply(s, 'chaal');
      } else {
        g.apply(s, 'fold');
      }
    }
    expect(g.status).toBe('finished');
    expect(capHit).toBe(true);
    expect(g.settle!.reveal.length).toBeGreaterThan(0);
  });

  it('respects maxActionsPerHand', () => {
    const g = new TeenPattiGame({ ...cfg, maxActionsPerHand: 3, maxSeats: 3 }, dealt([1,2,3], 13, 200, true), 1);
    for (let i = 0; i < 3 && g.status === 'betting'; i++) {
      const s = g.turnSeatNo!;
      const acts = g.availableActions(s);
      const kind = acts.includes('chaal') ? 'chaal' : (acts.includes('see') ? 'see' : acts[0]);
      expect(g.apply(s, kind).ok).toBe(true);
    }
    expect(g.status).toBe('finished');
  });
});