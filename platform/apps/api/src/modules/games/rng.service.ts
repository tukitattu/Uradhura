// ============================================================
// RNG SERVICE — Server-side Random Number Generation
// Provably Fair implementation with SHA-256 commitment scheme
// ============================================================

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { GameOption } from '@prisma/client';

@Injectable()
export class RngService {
  private readonly SEED_LENGTH = 32;
  private readonly HASH_ALGORITHM = 'sha256';

  /**
   * Generates a cryptographically random hex seed for client use.
   * 32 bytes = 256 bits of entropy = 64 hex characters.
   */
  generateSeed(): string {
    return crypto.randomBytes(this.SEED_LENGTH).toString('hex');
  }

  /**
   * Generates a server seed for the provably fair scheme.
   * Returns a 64-character hex string from 32 random bytes.
   */
  generateServerSeed(): string {
    return crypto.randomBytes(this.SEED_LENGTH).toString('hex');
  }

  /**
   * Creates a SHA-256 hash of the server seed.
   * This hash is shown to the player BEFORE the round starts as
   * a commitment — the player can verify the server didn't
   * change the seed after seeing all bets.
   */
  hashSeed(seed: string): string {
    return crypto.createHash(this.HASH_ALGORITHM).update(seed).digest('hex');
  }

  /**
   * Generates a game result by selecting a winning option using
   * HMAC-based seeded RNG with optional custom weights.
   *
   * The algorithm:
   *   1. Create HMAC-SHA256(serverSeed, "round:" + roundId + ":" + nonce)
   *   2. Take the first 8 hex characters → 32-bit integer
   *   3. Normalise into [0, totalWeight) cumulative distribution
   *   4. Select the option whose cumulative range contains the value
   *
   * @param options  - Active game options to select from
   * @param seed     - The combined seed string (serverSeed or HMAC)
   * @param weights  - Optional per-option weights; falls back to option.weight
   * @param nonce    - Incrementing nonce for uniqueness per round
   * @returns        - The selected GameOption and the raw random value for audit
   */
  generateResult(
    options: GameOption[],
    seed: string,
    nonce: number = 0,
    weights?: number[],
  ): { selectedOption: GameOption; randomValue: number; seedUsed: string } {
    if (!options || options.length === 0) {
      throw new Error('At least one game option is required');
    }

    const activeOptions = options.filter((o) => o.isActive);
    if (activeOptions.length === 0) {
      throw new Error('No active game options available');
    }

    const effectiveWeights = weights ?? activeOptions.map((o) => Number(o.weight));

    if (effectiveWeights.length !== activeOptions.length) {
      throw new Error(
        `Weight count (${effectiveWeights.length}) must match option count (${activeOptions.length})`,
      );
    }

    const totalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) {
      throw new Error('Total weight must be greater than zero');
    }

    const hmac = crypto.createHmac(this.HASH_ALGORITHM, seed);
    hmac.update(`nonce:${nonce}`);
    const hmacDigest = hmac.digest('hex');

    // Use first 8 hex chars → 32-bit unsigned int → normalise to [0, totalWeight)
    const hexSlice = hmacDigest.substring(0, 8);
    const rawInt = parseInt(hexSlice, 16);
    const normalisedValue = (rawInt / 0xffffffff) * totalWeight;

    let cumulative = 0;
    for (let i = 0; i < activeOptions.length; i++) {
      cumulative += effectiveWeights[i];
      if (normalisedValue < cumulative) {
        return {
          selectedOption: activeOptions[i],
          randomValue: normalisedValue,
          seedUsed: hmacDigest,
        };
      }
    }

    // Floating-point edge case fallback — return last option
    return {
      selectedOption: activeOptions[activeOptions.length - 1],
      randomValue: normalisedValue,
      seedUsed: hmacDigest,
    };
  }

  /**
   * Verifies that a previously-generated result is valid given the
   * original seeds and nonce. This is the "provably fair" check
   * that players can perform independently.
   *
   * @param serverSeed - The original server seed (revealed after round)
   * @param clientSeed - The client-provided seed
   * @param nonce      - The nonce used during generation
   * @param options    - The game options available during the round
   * @returns          - Whether the result is valid, plus the selected option
   */
  verifyResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    options: GameOption[],
  ): { isValid: boolean; selectedOption: GameOption | null; expectedHash: string } {
    const serverHash = this.hashSeed(serverSeed);

    const activeOptions = options.filter((o) => o.isActive);
    if (activeOptions.length === 0) {
      return { isValid: false, selectedOption: null, expectedHash: serverHash };
    }

    // Reconstruct the combined seed the same way it was done during generation
    const combinedSeed = this.combineSeeds(serverSeed, clientSeed, nonce);

    // Re-run the weighted selection with the reconstructed seed
    const totalWeight = activeOptions.reduce((sum, o) => sum + Number(o.weight), 0);
    if (totalWeight <= 0) {
      return { isValid: false, selectedOption: null, expectedHash: serverHash };
    }

    const hmac = crypto.createHmac(this.HASH_ALGORITHM, combinedSeed);
    hmac.update('result');
    const hmacDigest = hmac.digest('hex');

    const hexSlice = hmacDigest.substring(0, 8);
    const rawInt = parseInt(hexSlice, 16);
    const normalisedValue = (rawInt / 0xffffffff) * totalWeight;

    let cumulative = 0;
    for (const option of activeOptions) {
      cumulative += Number(option.weight);
      if (normalisedValue < cumulative) {
        return {
          isValid: true,
          selectedOption: option,
          expectedHash: serverHash,
        };
      }
    }

    return {
      isValid: true,
      selectedOption: activeOptions[activeOptions.length - 1],
      expectedHash: serverHash,
    };
  }

  /**
   * Combines server seed, client seed, and nonce into a single
   * deterministic seed string used for HMAC generation.
   */
  combineSeeds(serverSeed: string, clientSeed: string, nonce: number): string {
    return `${serverSeed}:${clientSeed}:${nonce}`;
  }
}
