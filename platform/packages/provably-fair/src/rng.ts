// ============================================================
// PROVABLY FAIR RNG — CORE
// server_seed + client_seed + nonce -> HMAC-SHA256 -> outcome
// ============================================================

import { createHash, createHmac, randomBytes } from 'crypto';

export const DEFAULT_SEED_LENGTH = 32;
export const MAX_NONCE = 2 ** 48 - 1;

export interface SeedCommitment {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export function generateServerSeed(length: number = DEFAULT_SEED_LENGTH): string {
  if (!Number.isInteger(length) || length <= 0 || length > 256) {
    throw new Error('generateServerSeed: length must be an integer in (0, 256]');
  }
  return randomBytes(length).toString('base64url').slice(0, length);
}

export function computeServerSeedHash(serverSeed: string): string {
  return createHash('sha256').update(serverSeed).digest('hex');
}

export function generateClientSeed(length: number = DEFAULT_SEED_LENGTH): string {
  return generateServerSeed(length);
}

export function buildSeedCommitment(serverSeed: string, clientSeed: string, nonce = 0): SeedCommitment {
  if (nonce < 0 || nonce > MAX_NONCE) {
    throw new Error(`buildSeedCommitment: nonce out of range (0..${MAX_NONCE})`);
  }
  return {
    serverSeed,
    serverSeedHash: computeServerSeedHash(serverSeed),
    clientSeed,
    nonce,
  };
}

export function hmacDigest(serverSeed: string, clientSeed: string, nonce: number, index = 0): Buffer {
  if (nonce < 0 || nonce > MAX_NONCE) {
    throw new Error(`hmacDigest: nonce out of range (0..${MAX_NONCE})`);
  }
  if (index < 0 || index > 100_000) {
    throw new Error('hmacDigest: index out of range');
  }
  const message = `${clientSeed}:${nonce}:${index}`;
  return createHmac('sha256', serverSeed).update(message).digest();
}

export function extractFloat(serverSeed: string, clientSeed: string, nonce: number, index = 0): number {
  const digest = hmacDigest(serverSeed, clientSeed, nonce, index);
  // Use first 8 bytes as a 53-bit mantissa for float in [0, 1)
  const bytes = digest.subarray(0, 7);
  const value = bytes.reduce((acc, byte) => acc * 256 + byte, 0);
  return value / 2 ** 56;
}

// Rejection sampling: unbiased integer in [0, upperBound) — no modulo bias.
export function extractInt(serverSeed: string, clientSeed: string, nonce: number, upperBound: number, index = 0): number {
  if (!Number.isInteger(upperBound) || upperBound <= 0) {
    throw new Error(`extractInt: upperBound must be a positive integer, got ${upperBound}`);
  }
  const limit = 2 ** 32;
  const digest = hmacDigest(serverSeed, clientSeed, nonce, index);
  const raw = digest.readUInt32BE(0);
  const threshold = limit - (limit % upperBound);
  if (raw < threshold) {
    return raw % upperBound;
  }
  return extractInt(serverSeed, clientSeed, nonce, upperBound, index + 1);
}

export function extractFloats(serverSeed: string, clientSeed: string, nonce: number, count: number, index = 0): number[] {
  if (!Number.isInteger(count) || count <= 0 || count > 1024) {
    throw new Error(`extractFloats: count must be in (0, 1024]`);
  }
  return Array.from({ length: count }, (_, i) => extractFloat(serverSeed, clientSeed, nonce, index + i));
}

// Verify a previously recorded outcome can be recomputed from the revealed seed.
export function verifyOutcome(
  params: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    expectedHash: string;
    expectedFloat: number;
    expectedInt?: { upperBound: number; value: number };
  }
): boolean {
  const { serverSeed, clientSeed, nonce, expectedHash, expectedFloat, expectedInt } = params;
  if (computeServerSeedHash(serverSeed) !== expectedHash) {
    return false;
  }
  const recomputed = extractFloat(serverSeed, clientSeed, nonce);
  const sameFloat = Math.abs(recomputed - expectedFloat) < 1e-12;
  if (expectedInt) {
    const recomputedInt = extractInt(serverSeed, clientSeed, nonce, expectedInt.upperBound);
    return sameFloat && recomputedInt === expectedInt.value;
  }
  return sameFloat;
}

export * from './fair-outcome';
export * from './constants';