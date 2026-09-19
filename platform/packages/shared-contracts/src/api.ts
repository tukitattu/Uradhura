// ============================================================
// SHARED CONTRACTS — REST API DTOs (aligned with NestJS controllers)
// ============================================================

export const API_VERSION = 'v1';
export const API_BASE_URL = `/api/${API_VERSION}`;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------- Auth ----------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

// ---------- Games ----------

export interface GetActiveGamesResponse extends ApiEnvelope<import('./models').Game[]> {}

export interface GameBetRequest {
  gameId: string;
  optionId: string;
  amount: number | string;
  idempotencyKey?: string;
}

export interface GameBetResponse extends ApiEnvelope<import('./models').GameBet> {}

export interface GetGameRoundsQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

export interface GameRoundsResponse extends ApiEnvelope<Paginated<import('./models').GameRound>> {}

// ---------- Wallet ----------

export interface WalletResponse extends ApiEnvelope<import('./models').WalletBalance> {}

export interface DepositRequest {
  amount: number | string;
  method: string;
}

export interface WithdrawRequest {
  amount: number | string;
  method: string;
}

// ---------- Players ----------

export interface PlayerProfileResponse extends ApiEnvelope<import('./models').UserProfile> {}

export interface GetPlayerStatsResponse
  extends ApiEnvelope<{
    totalBets: number;
    totalWagered: string;
    netProfit: string;
    winRate: number;
  }> {}

// ---------- Provably fair ----------

export interface GetSeedStateResponse extends ApiEnvelope<import('./models').ProvablyFairSeedState> {}

export interface RotateSeedRequest {
  clientSeed?: string;
}

export interface VerifySeedRequest {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface VerifySeedResponse
  extends ApiEnvelope<{
    valid: boolean;
    expectedServerSeedHash: string;
  }> {}