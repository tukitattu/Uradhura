// ============================================================
// TEEN PATTI DRIVER — 3 seats (A/B/C), 3-card hands
// Each seat is dealt a deterministic 3-card hand from the round
// seed. Hands are ranked (trail > pure sequence > sequence >
// color > pair > high card). Players bet on which seat wins.
// ============================================================

import { GameDriver, DriverContext, RoundOutcome } from './game-driver.interface';
import { GameOption } from '@prisma/client';
import { FairRandom } from '../fair-random';

interface Card {
  rank: string;
  suit: string;
  value: number;
}

interface HandRank {
  label: string;
  rank: number; // 1 (high) ... 6 (trail)
  highValue: number;
}

export class TeenPattiDriver implements GameDriver {
  code = 'teen_patti';
  category = 'card' as const;

  private static readonly RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  private static readonly SUITS = ['♠','♥','♦','♣'];

  generateOutcome(ctx: DriverContext): RoundOutcome {
    const { options, seed } = ctx;
    const seats = options.filter((o) => o.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    if (seats.length < 2) {
      throw new Error('teen_patti: at least 2 active seats required');
    }

    const deck = FairRandom.shuffle(this.buildDeck(), {
      serverSeed: seed.serverSeed,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      instance: 0,
    });

    const hands: { seat: GameOption; cards: Card[] }[] = seats.map((seat, i) => ({
      seat,
      cards: deck.slice(i * 3, i * 3 + 3),
    }));

    // Rank hands, break ties by high card then by deterministic shuffle order
    const evaluated = hands.map((h) => ({ ...h, eval: this.evaluateHand(h.cards) }));

    const winnerHand = [...evaluated].sort((a, b) => {
      if (b.eval.rank !== a.eval.rank) return b.eval.rank - a.eval.rank;
      if (b.eval.highValue !== a.eval.highValue) return b.eval.highValue - a.eval.highValue;
      return 0;
    })[0];

    const winnerIndex = evaluated.indexOf(winnerHand);

    return {
      winningOptionId: winnerHand.seat.id,
      winningLabel: winnerHand.seat.name,
      resultText: `${winnerHand.seat.name} wins with ${winnerHand.eval.label}`,
      resultData: {
        seats: hands.map((h, i) => ({
          seatId: h.seat.id,
          seatName: h.seat.name,
          multiplier: h.seat.multiplier.toString(),
          cards: h.cards.map((c) => ({ rank: c.rank, suit: c.suit, value: c.value })),
          handRank: evaluated[i].eval.label,
          handRankValue: evaluated[i].eval.rank,
        })),
        winningIndex: winnerIndex,
        winningSeatId: winnerHand.seat.id,
        roundNumber: ctx.round.roundNumber,
      },
      payoutMultiplier: (() => {
        const m = Number(winnerHand.seat.multiplier);
        return Number.isFinite(m) && m > 0 ? m : 1;
      })(),
      fairPlay: {
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce: seed.nonce,
        serverSeed: seed.serverSeed,
      },
    };
  }

  describeOption(option: GameOption): { emoji: string; color: string } {
    if (option.name) {
      const seat = option.name[0].toUpperCase();
      return { emoji: seat, color: option.colorHex || '#ffffff' };
    }
    return { emoji: '🎴', color: '#ffffff' };
  }

  private buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of TeenPattiDriver.SUITS) {
      TeenPattiDriver.RANKS.forEach((rank, i) => {
        deck.push({ rank, suit, value: i + 2 });
      });
    }
    return deck;
  }

  // ----------------------------------------------------------
  // Hand evaluation (simplified Teen Patti hierarchy)
  // ----------------------------------------------------------

  private evaluateHand(cards: Card[]): HandRank {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const values = sorted.map((c) => c.value);
    const suits = new Set(sorted.map((c) => c.suit));
    const isPair = new Set(values).size === 2;
    const isTriple = new Set(values).size === 1;
    // A-2-3 is a valid low sequence (Ace rolls low), matching the
    // dedicated TeenPatti engine evaluator.
    const isAceLowStraight = values[0] === 14 && values[1] === 3 && values[2] === 2;
    const isSequence =
      (values[0] - values[1] === 1 && values[1] - values[2] === 1) || isAceLowStraight;
    const isPureSequence = isSequence && suits.size === 1;
    const isColor = suits.size === 1 && !isSequence;
    const sequenceHigh = isAceLowStraight ? 3 : values[0];

    if (isTriple) return { label: 'Trail', rank: 6, highValue: values[0] };
    if (isPureSequence) return { label: 'Pure Sequence', rank: 5, highValue: sequenceHigh };
    if (isSequence) return { label: 'Sequence', rank: 4, highValue: sequenceHigh };
    if (isColor) return { label: 'Color', rank: 3, highValue: values[0] };
    if (isPair) {
      const pair = values.find((v, i, arr) => arr.filter((x) => x === v).length === 2);
      const kicker = values.find((v) => v !== pair);
      return { label: 'Pair', rank: 2, highValue: pair * 100 + kicker };
    }
    return { label: 'High Card', rank: 1, highValue: values[0] * 100 + values[1] * 10 + values[2] };
  }
}