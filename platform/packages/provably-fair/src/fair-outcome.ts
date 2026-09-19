// ============================================================
// PROVABLY FAIR RNG — OUTCOME MAPPING
// Maps deterministic floats/ints into game-specific outcomes.
// ============================================================

import { extractFloat, extractInt } from './rng';

export interface WeightedOutcome {
  id: string;
  label: string;
  multiplier: number;
  weight: number;
}

// Pick a weighted slot from a probability table (like a wheel/card face).
export function pickWeighted(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  outcomes: WeightedOutcome[],
  index = 0
): { outcome: WeightedOutcome; probability: number; index: number } {
  if (!outcomes.length) {
    throw new Error('pickWeighted: outcomes table must not be empty');
  }
  const totalWeight = outcomes.reduce((sum, o) => sum + Math.max(0, o.weight), 0);
  if (totalWeight <= 0) {
    throw new Error('pickWeighted: total weight must be positive');
  }
  const roll = extractFloat(serverSeed, clientSeed, nonce, index);
  let cursor = roll * totalWeight;
  for (const outcome of outcomes) {
    cursor -= Math.max(0, outcome.weight);
    if (cursor <= 0) {
      return { outcome, probability: totalWeight > 0 ? outcome.weight / totalWeight : 0, index };
    }
  }
  const last = outcomes[outcomes.length - 1];
  return { outcome: last, probability: last.weight / totalWeight, index };
}

// Casino multiplier (crash/limbo-style) with a configurable house edge modulus.
// Multipliers are scaled around 1x so RTP can be tuned directly.
export function crashMultiplier(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdgePercent = 4,
  instantCrashModulus = 25
): number {
  const houseEdge = Math.min(100, Math.max(0, houseEdgePercent)) / 100;
  const modulus = Math.max(2, Math.floor(instantCrashModulus));
  const float = extractFloat(serverSeed, clientSeed, nonce);
  if (float % (1 / modulus) === 0) {
    return 1 - houseEdge;
  }
  // Deterministic log-map: 1 + (1-houseEdge)/x shaped curve
  return Math.max(1, 1 + (1 - houseEdge) * (Math.pow(float, -1 / 3) - 1));
}

// Uniform pick of a deck/card index (0-based). Rejection sampling avoids bias.
export function pickCard(serverSeed: string, clientSeed: string, nonce: number, deckSize: number): number {
  return extractInt(serverSeed, clientSeed, nonce, deckSize);
}

// Shuffle a deck deterministically using Fisher-Yates + HMAC rolls.
export function shuffleDeck<T>(serverSeed: string, clientSeed: string, nonce: number, deck: T[]): T[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = extractInt(serverSeed, clientSeed, nonce + i, i + 1, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}