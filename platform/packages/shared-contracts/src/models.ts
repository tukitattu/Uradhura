// ============================================================
// SHARED CONTRACTS — DOMAIN MODELS
// Mirrors the Prisma schema surface exposed through the REST + Socket APIs.
// ============================================================

export interface GameOption {
  id: string;
  gameId: string;
  label: string;
  description: string | null;
  internalCode: string | null;
  order: number;
  isActive: boolean;
  colorHex: string | null;
  iconUrl: string | null;
}

export interface GameConfigJson {
  name: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export interface Game {
  id: string;
  name: string;
  internalCode: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  type: 'win_go' | 'k3' | 'crash' | 'aman_ceo' | 'royal_ludo' | 'teen_patti' | string;
  status: 'ACTIVE' | 'INACTIVE';
  minBet: string;
  maxBet: string;
  roundDurationSeconds: number;
  isProvablyFair: boolean;
  options: GameOption[];
  createdAt: string;
  updatedAt: string;
}

export interface GameRound {
  id: string;
  gameId: string;
  roundNumber: number;
  status: 'BETTING' | 'LOCKED' | 'RESOLVED';
  result: unknown | null;
  winningOptionId: string | null;
  totalBets: string;
  startedAt: string;
  lockedAt: string | null;
  resolvedAt: string | null;
}

export interface WalletBalance {
  balance: string;
  available: string;
  locks: string;
}

export interface GameBet {
  id: string;
  gameId: string;
  roundId: string;
  playerId: string;
  optionId: string;
  amount: string;
  payout: string | null;
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  createdAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  email: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'IN_GAME';
}

export interface ProvablyFairSeedState {
  serverSeedHash: string;
  clientSeed: string | null;
  nonce: number;
  revealedServerSeed: string | null;
  algorithm: 'HMAC-SHA256';
  verifiedLastHash: boolean;
}