// ============================================================
// THREE CARD DRIVER — 3 colored seats, one card each
// Each seat is dealt a single deterministic card. The seat with
// the HIGHEST card value wins (ties resolved by suit order).
// ============================================================

import { GameDriver, DriverContext, RoundOutcome } from './game-driver.interface';
import { GameOption } from '@prisma/client';
import { FairRandom } from '../fair-random';

interface Card {
  rank: string;
  suit: string;
  value: number;
  suitValue: number;
}

export class ThreeCardDriver implements GameDriver {
  code = 'three_card';
  category = 'card' as const;

  private static readonly RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  private static readonly SUITS = ['♠','♥','♦','♣']; // ♠ > ♥ > ♦ > ♣

  generateOutcome(ctx: DriverContext): RoundOutcome {
    const { options, seed } = ctx;
    const seats = options.filter((o) => o.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    if (seats.length < 2) {
      throw new Error('three_card: at least 2 active seats required');
    }

    const deck = FairRandom.shuffle(this.buildDeck(), {
      serverSeed: seed.serverSeed,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      instance: 0,
    });

    const seatsPlay: { seat: GameOption; card: Card }[] = seats.map((seat, i) => ({
      seat,
      card: deck[i],
    }));

    const winner = [...seatsPlay].sort((a, b) => {
      if (b.card.value !== a.card.value) return b.card.value - a.card.value;
      return b.card.suitValue - a.card.suitValue;
    })[0];

    const winningIndex = seatsPlay.indexOf(winner);

    return {
      winningOptionId: winner.seat.id,
      winningLabel: winner.seat.name,
      resultText: `${winner.seat.name} wins with ${winner.card.rank}${winner.card.suit}`,
      resultData: {
        seats: seatsPlay.map((s, i) => ({
          seatId: s.seat.id,
          seatName: s.seat.name,
          multiplier: s.seat.multiplier.toString(),
          card: { rank: s.card.rank, suit: s.card.suit, value: s.card.value },
          isWinner: i === winningIndex,
        })),
        winningIndex,
        winningSeatId: winner.seat.id,
        roundNumber: ctx.round.roundNumber,
      },
      payoutMultiplier: (() => {
        const m = Number(winner.seat.multiplier);
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
    return {
      emoji: '🂱',
      color: option.colorHex || '#' + (option.label || 'fff'),
    };
  }

  private buildDeck(): Card[] {
    const deck: Card[] = [];
    for (let s = 0; s < ThreeCardDriver.SUITS.length; s++) {
      const suit = ThreeCardDriver.SUITS[s];
      ThreeCardDriver.RANKS.forEach((rank, i) => {
        deck.push({ rank, suit, value: i + 2, suitValue: 4 - s });
      });
    }
    return deck;
  }
}