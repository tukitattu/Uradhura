// ============================================================
// SLOT DRIVER — reel spin + multiplier payout table
// One bet surface ("SPIN"). The spin outcome is a weighted reel
// combination whose payout ladder is defined in the admin config
// (config.configData.paylines). All spin bets settle against the
// resulting multiplier.
// ============================================================

import { GameDriver, DriverContext, RoundOutcome } from './game-driver.interface';
import { GameOption } from '@prisma/client';
import { FairRandom } from '../fair-random';

export interface Payline {
  symbol: string;
  weight: number;
  multiplier: number;
  emoji?: string;
}

export class SlotDriver implements GameDriver {
  code = 'slot';
  category = 'slot' as const;

  private readonly DEFAULT_PAYLINES: Payline[] = [
    { symbol: '🍒', weight: 40, multiplier: 1.1, emoji: '🍒' },
    { symbol: '🍋', weight: 25, multiplier: 1.4, emoji: '🍋' },
    { symbol: '🍇', weight: 15, multiplier: 2, emoji: '🍇' },
    { symbol: '💎', weight: 9, multiplier: 3, emoji: '💎' },
    { symbol: '⭐', weight: 6, multiplier: 5, emoji: '⭐' },
    { symbol: '7️⃣', weight: 4, multiplier: 10, emoji: '7️⃣' },
    { symbol: '👑', weight: 1, multiplier: 25, emoji: '👑' },
  ];

  generateOutcome(ctx: DriverContext): RoundOutcome {
    const { seed, config } = ctx;
    const paylines = this.resolvePaylines(config?.configData);

    const totalWeight = paylines.reduce((s, p) => s + p.weight, 0);
    const roll = FairRandom.float({
      serverSeed: seed.serverSeed,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      instance: 0,
    });

    let scaled = roll * totalWeight;
    let winner: Payline = paylines[paylines.length - 1];
    for (const p of paylines) {
      scaled -= p.weight;
      if (scaled <= 0) {
        winner = p;
        break;
      }
    }

    // Build 3 reel columns; the winning line symbol appears on the middle row.
    const reels = Array.from({ length: 3 }, (_, reelIndex) => {
      const symbols = paylines.map((p) => p.symbol);
      const display = Array.from({ length: 3 }, (__, rowIndex) => {
        if (rowIndex === 1) return winner.symbol;
        const pick = FairRandom.int(
          {
            serverSeed: seed.serverSeed,
            clientSeed: seed.clientSeed,
            nonce: seed.nonce,
            instance: 10 + reelIndex * 5 + rowIndex,
          },
          symbols.length,
        );
        return symbols[pick];
      });
      return display;
    });

    const spinOption = ctx.options.find((o) => o.isActive);

    return {
      winningOptionId: spinOption ? spinOption.id : null,
      winningLabel: winner.symbol,
      resultText: `${winner.symbol} x${winner.multiplier}`,
      resultData: {
        reels,
        symbol: winner.symbol,
        multiplier: winner.multiplier,
        emoji: winner.emoji || winner.symbol,
        payline: winner,
      },
      payoutMultiplier: winner.multiplier,
      fairPlay: {
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce: seed.nonce,
        serverSeed: seed.serverSeed,
      },
    };
  }

  describeOption(option: GameOption): { emoji: string; color: string } {
    return { emoji: '🎰', color: option.colorHex || '#ffffff' };
  }

  private resolvePaylines(configData?: string | null): Payline[] {
    if (!configData) return this.DEFAULT_PAYLINES;
    try {
      const parsed = JSON.parse(configData);
      const lines = parsed?.paylines as Payline[] | undefined;
      if (Array.isArray(lines) && lines.length > 0 && lines.every((l) => l && typeof l.symbol === 'string' && l.weight > 0)) {
        return lines.map((l) => ({
          ...l,
          emoji: l.emoji || l.symbol.slice(0, 1),
        }));
      }
    } catch {
      // fall through to defaults
    }
    return this.DEFAULT_PAYLINES;
  }
}