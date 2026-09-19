// ============================================================
// SHARED CONTRACTS — SOCKET.IO EVENTS (namespace /game)
// Server-authoritative: client SENDS actions, server EMITS truth.
// ============================================================

export const GAME_NAMESPACE = '/game';

export interface ClientToServerEvents {
  // ---- game flow ----
  join_game: (payload: { gameId: string }) => void;
  leave_game: (payload: { gameId: string }) => void;
  place_bet: (payload: { gameId: string; optionId: string; amount: number | string; idempotencyKey?: string }) => void;
  // ---- provably fair ----
  get_seed_state: () => void;
  rotate_seed: (payload: { clientSeed?: string }) => void;
  verify_seed: (payload: { serverSeed: string; clientSeed: string; nonce: number }) => void;
}

export interface ServerToClientEvents {
  // ---- game flow ----
  round_update: (payload: {
    gameId: string;
    round: {
      id: string;
      roundNumber: number;
      status: 'BETTING' | 'LOCKED' | 'RESOLVED';
      result: unknown;
      startedAt: string;
      lockedAt: string | null;
      resolvedAt: string | null;
    };
  }) => void;
  bet_result: (payload: {
    betId: string;
    gameId: string;
    optionId: string;
    amount: string;
    payout: string | null;
    status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  }) => void;
  seed_state: (payload: import('./models').ProvablyFairSeedState) => void;
  seed_verified: (payload: { valid: boolean; expectedServerSeedHash: string }) => void;
  error: (payload: { message: string; code?: string; details?: unknown }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  username: string;
}

export const ROUND_STATUS = { BETTING: 'BETTING', LOCKED: 'LOCKED', RESOLVED: 'RESOLVED' } as const;
export const GAME_ROOM_PREFIX = 'game:';