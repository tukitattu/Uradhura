// ============================================================
// RNG SERVICE — Server-side Random Number Generation
// Provably Fair implementation with SHA-256 commitment scheme
//
// ALL randomness is derived from HMAC-SHA256(seed, nonce) so that
// results are deterministic, verifiable, and never Math.random().
// ============================================================

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { GameOption } from '@prisma/client';

export interface RngHmacParams {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  instance?: number; // extra diversification per use within a round
}

export interface WeightedPick {
  selectedOption: GameOption;
  randomValue: number;
  seedUsed: string;
  hmac: string;
}

export interface Card {
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  suit: '♠' | '♥' | '♦' | '♣';
  value: number; // 1..13
}

@Injectable()
export class RngService {
  private readonly SEED_LENGTH = 32;
  private readonly HASH_ALGORITHM = 'sha256';

  /** Cryptographically random entropy — used ONLY for seed material. */
  randomHex(bytes: number = this.SEED_LENGTH): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  generateSeed(): string {
    return this.randomHex();
  }

  generateServerSeed(): string {
    return this.randomHex();
  }

  hashSeed(seed: string): string {
    return crypto.createHash(this.HASH_ALGORITHM).update(seed).digest('hex');
  }

  // ----------------------------------------------------------
  // Deterministic HMAC source of entropy
  // ----------------------------------------------------------

  hmacDigest(params: RngHmacParams): string {
    const { serverSeed, clientSeed, nonce, instance = 0 } = params;
    const hmac = crypto.createHmac(this.HASH_ALGORITHM, serverSeed);
    const message = `${clientSeed}:${nonce}:${instance}`;
    hmac.update(message);
    return hmac.digest('hex');
  }

  /**
   * Deterministic float in [0, 1) using 53 bits from the HMAC digest.
   * No modulo bias; the full digest provides 256 bits of entropy.
   */
  float(params: RngHmacParams): number {
    const digest = Buffer.from(this.hmacDigest(params), 'hex');
    // First 7 bytes -> 56-bit mantissa normalized to [0,1)
    const bytes = digest.subarray(0, 7);
    const value = bytes.reduce((acc, byte, i) => acc * 256 + byte, 0);
    return value / 2 ** 56;
  }

  /** Deterministic integer in [0, upperBound) using rejection sampling (no bias). */
  int(params: RngHmacParams, upperBound: number): number {
    if (!Number.isInteger(upperBound) || upperBound <= 0) {
      throw new Error(`int: upperBound must be a positive integer, got ${upperBound}`);
    }
    const limit = 2 ** 32;
    for (let instance = params.instance ?? 0; instance < params.instance + 64; instance++) {
      const digest = Buffer.from(this.hmacDigest({ ...params, instance }), 'hex');
      const raw = digest.readUInt32BE(0);
      const threshold = limit - (limit % upperBound);
      if (raw < threshold) {
        return raw % upperBound;
      }
    }
    // Extremely unlikely fallback (no bias-free branch after 64 tries)
    const digest = Buffer.from(this.hmacDigest(params), 'hex');
    return digest.readUInt32BE(0) % upperBound;
  }

  // ----------------------------------------------------------
  // Weighted option selection (wheel games)
  // ----------------------------------------------------------

  /**
   * Selects a winning option using unbiased weighted selection.
   * Every option must have weight > 0.
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

    const weightSum = effectiveWeights.reduce((sum, w) => sum + Math.max(0, w), 0);
    if (weightSum <= 0) {
      throw new Error('Total weight must be greater than zero');
    }

    const hmac = this.hmacDigest({ serverSeed: seed, clientSeed: '', nonce });
    const randomValue = this.float({ serverSeed: seed, clientSeed: '', nonce });
    const scaled = randomValue * weightSum;

    let cumulative = 0;
    for (let i = 0; i < activeOptions.length; i++) {
      cumulative += Math.max(0, effectiveWeights[i]);
      if (scaled < cumulative) {
        return {
          selectedOption: activeOptions[i],
          randomValue: scaled,
          seedUsed: hmac,
        };
      }
    }
    return {
      selectedOption: activeOptions[activeOptions.length - 1],
      randomValue: scaled,
      seedUsed: hmac,
    };
  }

  // ----------------------------------------------------------
  // Card dealing
  // ----------------------------------------------------------

  private static readonly RANKS: Card['rank'][] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  private static readonly SUITS: Card['suit'][] = ['♠','♥','♦','♣'];

  buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of RngService.SUITS) {
      for (let i = 0; i < RngService.RANKS.length; i++) {
        deck.push({
          rank: RngService.RANKS[i],
          suit,
          value: i + 2, // 2..14 (Ace high = 14)
        });
      }
    }
    return deck;
  }

  /**
   * Deterministically shuffles a deck using the HMAC RNG (Fisher-Yates).
   * Safe to call multiple times with different `instance`s for distinct deals.
   */
  shuffle<T>(items: T[], params: RngHmacParams): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int({ ...params, instance: params.instance + (copy.length - i) }, i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Deals N hands of handSize cards deterministically.
   * Returns ordered hands plus the full shuffled deck for audit/verification.
   */
  dealHands(
    handCount: number,
    handSize: number,
    params: RngHmacParams,
  ): { hands: Card[][]; deck: Card[] } {
    const deck = this.shuffle(this.buildDeck(), params);
    const hands: Card[][] = Array.from({ length: handCount }, () => []);
    for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
      for (let handIndex = 0; handIndex < handCount; handIndex++) {
        const idx = handIndex * handSize + cardIndex;
        if (idx < deck.length) {
          hands[handIndex].push(deck[idx]);
        }
      }
    }
    return { hands, deck };
  }

  // ----------------------------------------------------------
  // Hand evaluation helpers
  // ----------------------------------------------------------

  /** Sum of card values — simple configurable ranking for position card games. */
  evaluateHandValue(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + card.value, 0);
  }

  /** Highest card value in the hand. */
  evaluateHandHigh(hand: Card[]): number {
    return hand.reduce((max, card) => Math.max(max, card.value), 0);
  }

  // ----------------------------------------------------------
  // Verification
  // ----------------------------------------------------------

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
    try {
      const { selectedOption } = this.generateResult(activeOptions, `${serverSeed}:${clientSeed}`, nonce);
      return { isValid: true, selectedOption, expectedHash: serverHash };
    } catch {
      return { isValid: false, selectedOption: null, expectedHash: serverHash };
    }
  }

  combineSeeds(serverSeed: string, clientSeed: string, nonce: number): string {
    return `${serverSeed}:${clientSeed}:${nonce}`;
  }
}