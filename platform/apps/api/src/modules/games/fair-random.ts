// ============================================================
// FAIR RANDOM — deterministic HMAC-SHA256 source of entropy
// Pure helper (no Nest) so drivers + services share one impl.
// ============================================================

import { createHmac, createHash, randomBytes } from 'crypto';

export interface FairSeedInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  instance?: number;
}

export class FairRandom {
  static hash(seed: string): string {
    return createHash('sha256').update(seed).digest('hex');
  }

  /** Cryptographically random hex — seed material ONLY. */
  static entropyHex(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  static digest(input: FairSeedInput, message?: string): Buffer {
    const { serverSeed, clientSeed, nonce, instance = 0 } = input;
    const hmac = createHmac('sha256', serverSeed);
    const msg = message ?? `${clientSeed}:${nonce}:${instance}`;
    hmac.update(msg);
    return hmac.digest();
  }

  /** Deterministic float in [0, 1) from 56 bits. */
  static float(input: FairSeedInput): number {
    const bytes = FairRandom.digest(input).subarray(0, 7);
    const value = bytes.reduce((acc, byte) => acc * 256 + byte, 0);
    return value / 2 ** 56;
  }

  /** Deterministic int in [0, upperBound) via rejection sampling (no bias). */
  static int(input: FairSeedInput, upperBound: number): number {
    if (!Number.isInteger(upperBound) || upperBound <= 0) {
      throw new Error(`int: upperBound must be a positive integer, got ${upperBound}`);
    }
    const limit = 2 ** 32;
    for (let i = 0; i < 64; i++) {
      const digest = FairRandom.digest({ ...input, instance: (input.instance ?? 0) + i });
      const raw = digest.readUInt32BE(0);
      const threshold = limit - (limit % upperBound);
      if (raw < threshold) {
        return raw % upperBound;
      }
    }
    return FairRandom.float(input) * upperBound | 0;
  }

  /** Fisher-Yates shuffle keyed by the seed. */
  static shuffle<T>(items: T[], input: FairSeedInput): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = FairRandom.int({ ...input, instance: (input.instance ?? 0) + i }, i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

/** Buildable shared seed input. */
export function fairInput(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): FairSeedInput {
  return { serverSeed, clientSeed, nonce };
}