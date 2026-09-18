// ============================================================
// PROVABLY FAIR — SHARED CONSTANTS / CONFIG
// ============================================================

export const RNG_ALGORITHM = 'HMAC-SHA256' as const;
export const RNG_COMMITMENT_SCHEME = 'sha256(serverSeed) revealed on game end' as const;

export const HOUSE_EDGE_PERCENT_DEFAULT = 4;
export const CRASH_INSTANT_MODULUS_DEFAULT = 25;

export const SEED_ROTATION_POLICY = {
  serverSeed: { bytes: 32, maxRoundsBeforeRotate: 5000 },
  clientSeed: { bytes: 32, rotateAfterRounds: 10 },
} as const;