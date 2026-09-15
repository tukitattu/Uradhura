const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('player');
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, ...rest } = options;
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(rest.headers || {}),
  };
  if (!skipAuth && token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.message || 'Request failed', data.code || 'ERROR', res.status);
  }

  return data.data as T;
}

export class ApiError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; player: Player }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),
  register: (username: string, email: string, password: string) =>
    apiFetch<{ token: string; player: Player }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
      skipAuth: true,
    }),
  me: () => apiFetch<Player>('/auth/me'),
};

// ─── Games ────────────────────────────────────────────────────────────────────

export const gamesApi = {
  list: () => apiFetch<Game[]>('/games'),
  get: (slug: string) => apiFetch<Game>(`/games/${slug}`),
  getActiveRound: (gameId: string) => apiFetch<Round>(`/games/${gameId}/round`),
  getHistory: (gameId: string, page = 1) =>
    apiFetch<{ rounds: Round[]; total: number }>(`/games/${gameId}/history?page=${page}`),
  getRoundTotals: (roundId: string) =>
    apiFetch<OptionTotal[]>(`/games/rounds/${roundId}/totals`),
};

// ─── Bets ─────────────────────────────────────────────────────────────────────

export const betsApi = {
  place: (roundId: string, optionId: string, amount: number) =>
    apiFetch<Bet>('/games/bets', {
      method: 'POST',
      body: JSON.stringify({
        roundId,
        optionId,
        amount,
        idempotencyKey: `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }),
    }),
  myBets: (page = 1, gameId?: string) =>
    apiFetch<{ bets: Bet[]; total: number }>(
      `/games/player/bets?page=${page}${gameId ? `&gameId=${gameId}` : ''}`
    ),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const walletApi = {
  get: () => apiFetch<WalletAccount>('/games/player/wallet'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  dashboard: () => apiFetch<DashboardData>('/admin/dashboard'),
  getProfitRisk: () => apiFetch<ProfitRiskConfig>('/admin/profit-risk'),
  saveProfitRisk: (data: Partial<ProfitRiskConfig>) =>
    apiFetch<ProfitRiskConfig>('/admin/profit-risk', { method: 'POST', body: JSON.stringify(data) }),
  simulate: () => apiFetch<SimulationResult>('/admin/profit-risk/simulate', { method: 'POST', body: '{}' }),
  listPlayers: (page = 1, search?: string) =>
    apiFetch<{ players: AdminPlayer[]; total: number }>(
      `/admin/players?page=${page}${search ? `&search=${search}` : ''}`
    ),
  getPlayer: (id: string) => apiFetch<AdminPlayer>(`/admin/players/${id}`),
  applyOverride: (playerId: string, data: object) =>
    apiFetch(`/admin/players/${playerId}/override`, { method: 'POST', body: JSON.stringify(data) }),
  listTokenPackages: () => apiFetch<TokenPackage[]>('/admin/token-packages'),
  saveTokenPackage: (data: Partial<TokenPackage>) =>
    apiFetch<TokenPackage>('/admin/token-packages', { method: 'POST', body: JSON.stringify(data) }),
  deleteTokenPackage: (id: string) =>
    apiFetch(`/admin/token-packages/${id}`, { method: 'DELETE' }),
  betReport: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ bets: Bet[]; total: number }>(`/admin/reports/bets${q}`);
  },
  settlementReport: (page = 1) =>
    apiFetch<{ settlements: Settlement[]; total: number }>(`/admin/reports/settlements?page=${page}`),
  auditLogs: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ logs: AuditLog[]; total: number }>(`/admin/audit-logs${q}`);
  },
  listGames: () => apiFetch<Game[]>('/admin/games'),
  updateGameConfig: (gameId: string, data: object) =>
    apiFetch(`/admin/games/${gameId}/config`, { method: 'PUT', body: JSON.stringify(data) }),
  startRound: (gameId: string, duration?: number) =>
    apiFetch<Round>(`/games/${gameId}/round`, {
      method: 'POST',
      body: JSON.stringify({ bettingDuration: duration || 30 }),
    }),
  closeRoundBetting: (roundId: string) =>
    apiFetch<Round>(`/games/rounds/${roundId}/close-betting`, { method: 'POST', body: '{}' }),
  setRoundResult: (roundId: string, winningOptionId: string, resultData?: object) =>
    apiFetch<Round>(`/games/rounds/${roundId}/result`, {
      method: 'POST',
      body: JSON.stringify({ winningOptionId, resultData }),
    }),
  settleRound: (roundId: string) =>
    apiFetch(`/games/rounds/${roundId}/settle`, { method: 'POST', body: '{}' }),
  toggleGame: (gameId: string, isActive: boolean) =>
    apiFetch(`/admin/games/${gameId}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  upsertGameOption: (gameId: string, data: Partial<GameOption> & { id?: string }) =>
    apiFetch<GameOption>(`/admin/games/${gameId}/options`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGameOption: (gameId: string, optionId: string) =>
    apiFetch(`/admin/games/${gameId}/options/${optionId}`, { method: 'DELETE' }),
  updateGameDurations: (gameId: string, bettingDurationSeconds: number, roundDurationSeconds: number) =>
    apiFetch(`/admin/games/${gameId}/durations`, { method: 'PUT', body: JSON.stringify({ bettingDurationSeconds, roundDurationSeconds }) }),
  getActiveRoundsAll: () =>
    apiFetch<ActiveRound[]>('/admin/rounds/active'),
  forceCloseRound: (roundId: string) =>
    apiFetch(`/admin/rounds/${roundId}/force-close`, { method: 'POST', body: '{}' }),
  forceSetResult: (roundId: string, winningOptionId: string) =>
    apiFetch(`/admin/rounds/${roundId}/force-result`, { method: 'POST', body: JSON.stringify({ winningOptionId }) }),
  forceSettle: (roundId: string) =>
    apiFetch(`/admin/rounds/${roundId}/force-settle`, { method: 'POST', body: '{}' }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
}

export interface AdminPlayer extends Player {
  isActive: boolean;
  createdAt: string;
  totalWon: number;
  totalLost: number;
  totalBets: number;
  totalBetAmount: number;
  recentTransactions?: WalletTransaction[];
}

export interface WalletAccount {
  id: string;
  playerId: string;
  balance: number;
  totalDeposit: number;
  totalWon: number;
  totalLost: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  description?: string;
  createdAt: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  options: GameOption[];
  configurations: GameConfiguration[];
}

export interface GameOption {
  isActive: boolean;
  id: string;
  gameId: string;
  label: string;
  multiplier: number;
  colorHex: string;
  iconUrl?: string;
  isHot: boolean;
  sortOrder: number;
}

export interface GameConfiguration {
  id: string;
  houseEdge: number;
  maxPayoutPerRound: number;
  jackpotWeight: number;
  maxDailyLoss: number;
}

export interface Round {
  id: string;
  gameId: string;
  roundNumber: number;
  status: string;
  bettingEndsAt?: string;
  winnerId?: string;
  resultData?: string;
  totalBetAmount: number;
  createdAt: string;
  game?: Game;
}

export interface Bet {
  id: string;
  roundId: string;
  playerId: string;
  optionId: string;
  amount: number;
  status: string;
  payout?: number;
  createdAt: string;
  option?: GameOption;
  round?: Round;
}

export interface OptionTotal {
  optionId: string;
  label: string;
  multiplier: number;
  totalAmount: number;
  betCount: number;
}

export interface Settlement {
  id: string;
  roundId: string;
  betId: string;
  playerId: string;
  payout: number;
  status: string;
  settledAt?: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  priceUsd: number;
  baseTokens: number;
  bonusTokens: number;
  isSpecialOffer: boolean;
  isPopular: boolean;
  expiryDays: number;
  isActive: boolean;
}

export interface ProfitRiskConfig {
  id: string;
  baseHouseEdge: number;
  vipAdjustment: number;
  maxPayoutPerRound: number;
  jackpotWeight: number;
  maxDailyLossPerPlayer: number;
}

export interface SimulationResult {
  simulatedAt?: string;
  expectedProfit: number;
  roi: number;
  maxExposure: number;
  riskLevel: string;
  simulatedRounds: number;
  hourlyData: Array<{ hour: string; totalBets: number; netProfit: number }>;
}

export interface DashboardData {
  activeGames: number;
  totalGames: number;
  liveRounds: number;
  todayBets: { total: number; count: number; changeVsYesterday: number };
  netProfit: { total: number; changeVsYesterday: number };
  systemStatus: string;
}

export interface ActiveRound {
  id: string;
  gameId: string;
  roundNumber: number;
  status: string;
  bettingEndsAt?: string;
  totalBetAmount: number;
  betCount: number;
  game: { id: string; name: string; slug: string };
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: string;
  after?: string;
  ipAddress?: string;
  createdAt: string;
}
