// ============================================================
// WHEEL DRIVER — Greedy Monkey, Greedy Lion, Food Wheel
// Weighted selection of a food/option with multiplier + spin metadata.
// ============================================================

import { GameDriver, DriverContext, RoundOutcome } from './game-driver.interface';
import { GameOption } from '@prisma/client';
import { FairRandom } from '../fair-random';

export class WheelDriver implements GameDriver {
  code: string;
  category: 'wheel';

  constructor(code: string) {
    this.code = code;
    this.category = 'wheel';
  }

  generateOutcome(ctx: DriverContext): RoundOutcome {
    const { options, seed } = ctx;

    if (options.length === 0) {
      throw new Error(`${this.code}: no active options configured`);
    }

    // Weighted pick using the committed round seed (HMAC-SHA256).
    const weights = options.map((o) => Number(o.weight) > 0 ? Number(o.weight) : 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const float = FairRandom.float({ serverSeed: seed.serverSeed, clientSeed: seed.clientSeed, nonce: seed.nonce });

    const scaled = float * weightSum;
    let cumulative = 0;
    let winner = options[options.length - 1];
    for (let i = 0; i < options.length; i++) {
      cumulative += weights[i];
      if (scaled < cumulative) {
        winner = options[i];
        break;
      }
    }

    // Landing angle so the wheel can spin to a deterministic stop position.
    const optionIndex = options.indexOf(winner);
    const segmentAngle = 360 / options.length;
    const baseAngle = optionIndex * segmentAngle;
    const jitter = FairRandom.float({ ...seed, instance: 1 }) * segmentAngle * 0.9;

    return {
      winningOptionId: winner.id,
      winningLabel: winner.name,
      resultText: `${winner.name} x${winner.multiplier.toFixed(2)}`,
      resultData: {
        winningOptionId: winner.id,
        winningOptionName: winner.name,
        multiplier: winner.multiplier.toString(),
        angle: Number((baseAngle + jitter).toFixed(2)),
        optionIndex,
        optionCount: options.length,
      },
      payoutMultiplier: Number(winner.multiplier),
      fairPlay: {
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce: seed.nonce,
        serverSeed: seed.serverSeed,
      },
    };
  }

  describeOption(option: GameOption): { emoji: string; color: string } {
    const emoji = (option.icon || option.name).trim();
    return {
      emoji: emoji.length <= 2 ? emoji : '🍀',
      color: option.colorHex || '#ffffff',
    };
  }
}