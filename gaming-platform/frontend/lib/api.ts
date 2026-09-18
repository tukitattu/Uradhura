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

// ─── Player ───────────────────────────────────────────────────────────────────

export const playerApi = {
  topUp: (packageId: string) =>
    apiFetch<{ balance: number; tokensAdded: number }>('/games/player/topup', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    }),
  getPackages: () => apiFetch<TokenPackage[]>('/games/player/packages', { skipAuth: true }),
  getTodayStats: () => apiFetch<TodayStats>('/games/player/today-stats'),
};

export const recentResultsApi = {
  get: (gameId: string, limit = 10) =>
    apiFetch<RecentResult[]>(`/games/${gameId}/results/recent?limit=${limit}`),
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
  branding?: GameBranding | null;
  activeRound?: ActiveRoundSummary | null;
}

export interface ActiveRoundSummary {
  id: string;
  roundNumber: number;
  status: string;
  bettingEndsAt?: string | null;
  totalBetAmount: number;
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

// ─── Admin Settings ───────────────────────────────────────────────────────────

export const settingsApi = {
  getAll: () => apiFetch<Record<string, SettingsGroup>>('/settings'),
  getByCategory: (category: string) => apiFetch<SettingsEntry[]>(`/settings/${category}`),
  update: (settings: Record<string, unknown>) =>
    apiFetch('/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  reset: (category?: string) =>
    apiFetch('/settings/reset', { method: 'POST', body: JSON.stringify({ category }) }),
};

export interface SettingsEntry {
  key: string;
  value: unknown;
  category: string;
  description: string;
  source?: string;
  updatedAt?: string;
}

export type SettingsGroup = SettingsEntry[];

// ─── Super Admin ──────────────────────────────────────────────────────────────

export const superAdminApi = {
  // Design tokens
  getTokens: (scope?: string) =>
    apiFetch<DesignToken[]>(`/superadmin/design-tokens${scope ? `?scope=${scope}` : ''}`),
  saveToken: (data: Partial<DesignToken>) =>
    apiFetch<DesignToken>('/superadmin/design-tokens', { method: 'POST', body: JSON.stringify(data) }),
  bulkSave: (tokens: Partial<DesignToken>[]) =>
    apiFetch<DesignToken[]>('/superadmin/design-tokens/bulk', { method: 'POST', body: JSON.stringify({ tokens }) }),
  deleteToken: (id: string) =>
    apiFetch(`/superadmin/design-tokens/${id}`, { method: 'DELETE' }),

  // Game branding
  getGameBrandings: () => apiFetch<GameWithBranding[]>('/superadmin/game-branding'),
  saveGameBranding: (slug: string, data: Partial<GameBranding>) =>
    apiFetch<GameBranding>(`/superadmin/game-branding/${slug}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Feature flags
  getFlags: () => apiFetch<FeatureFlag[]>('/superadmin/feature-flags'),
  saveFlag: (data: Partial<FeatureFlag>) =>
    apiFetch<FeatureFlag>('/superadmin/feature-flags', { method: 'POST', body: JSON.stringify(data) }),
  deleteFlag: (id: string) =>
    apiFetch(`/superadmin/feature-flags/${id}`, { method: 'DELETE' }),

  // Stats
  getStats: () => apiFetch<PlatformStats>('/superadmin/stats'),

  // Account management
  listAccounts: (page = 1, role?: string) =>
    apiFetch<{ accounts: AdminAccountEntry[]; total: number; page: number; limit: number }>(
      `/superadmin/accounts?page=${page}${role ? `&role=${role}` : ''}`
    ),
  createAccount: (data: { username: string; email: string; password: string; role: string }) =>
    apiFetch<AdminAccountEntry>('/superadmin/accounts', { method: 'POST', body: JSON.stringify(data) }),
  setRole: (playerId: string, role: string) =>
    apiFetch(`/superadmin/accounts/${playerId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  setStatus: (playerId: string, isActive: boolean) =>
    apiFetch(`/superadmin/accounts/${playerId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  listAdminRequests: (status?: string) =>
    apiFetch<AdminAuthorizationRequest[]>(`/superadmin/admin-requests${status ? `?status=${status}` : ''}`),
  approveRequest: (requestId: string, notes?: string) =>
    apiFetch(`/superadmin/admin-requests/${requestId}/approve`, { method: 'POST', body: JSON.stringify({ notes }) }),
  rejectRequest: (requestId: string, notes?: string) =>
    apiFetch(`/superadmin/admin-requests/${requestId}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),

  // Game CRUD
  createGame: (data: { name: string; slug: string; description?: string; sortOrder?: number }) =>
    apiFetch<Game>('/superadmin/games', { method: 'POST', body: JSON.stringify(data) }),
  deleteGameSA: (gameId: string) =>
    apiFetch(`/superadmin/games/${gameId}`, { method: 'DELETE' }),
  updateSortOrder: (gameId: string, sortOrder: number) =>
    apiFetch(`/superadmin/games/${gameId}/sort-order`, { method: 'PATCH', body: JSON.stringify({ sortOrder }) }),
  getDenominations: (gameId: string) =>
    apiFetch<GameDenominationConfig>(`/superadmin/games/${gameId}/denominations`),
  saveDenominations: (gameId: string, data: { denominations: string; minBet: number; maxBet: number }) =>
    apiFetch<GameDenominationConfig>(`/superadmin/games/${gameId}/denominations`, { method: 'PUT', body: JSON.stringify(data) }),
  listPackages: (gameId: string) =>
    apiFetch<GamePackage[]>(`/superadmin/games/${gameId}/packages`),
  savePackage: (gameId: string, data: Partial<GamePackage>) =>
    apiFetch<GamePackage>(`/superadmin/games/${gameId}/packages`, { method: 'POST', body: JSON.stringify(data) }),
  deletePackage: (gameId: string, packageId: string) =>
    apiFetch(`/superadmin/games/${gameId}/packages/${packageId}`, { method: 'DELETE' }),

  // Health
  getHealth: () => apiFetch<ServiceHealth>('/superadmin/health'),
  getHealthHistory: (limit = 20) => apiFetch<ServiceHealthSnapshot[]>(`/superadmin/health/history?limit=${limit}`),

  // Payment
  listPaymentConfigs: () => apiFetch<PaymentGatewayConfig[]>('/superadmin/payment-configs'),
  savePaymentConfig: (data: Partial<PaymentGatewayConfig>) =>
    apiFetch<PaymentGatewayConfig>('/superadmin/payment-configs', { method: 'POST', body: JSON.stringify(data) }),
  listPaymentOrders: (page = 1, status?: string) =>
    apiFetch<{ orders: PaymentOrder[]; total: number }>(`/superadmin/payment-orders?page=${page}${status ? `&status=${status}` : ''}`),

  // Video call
  listVideoAccess: () => apiFetch<VideoCallAccess[]>('/superadmin/video-access'),
  grantVideoAccess: (data: { playerId: string; channelName?: string; role?: string; notes?: string }) =>
    apiFetch<VideoCallAccess>('/superadmin/video-access', { method: 'POST', body: JSON.stringify(data) }),
  revokeVideoAccess: (playerId: string) =>
    apiFetch(`/superadmin/video-access/${playerId}`, { method: 'DELETE' }),
};

export interface AdminAuthorizationRequest {
  id: string;
  playerId: string;
  requestedRole: string;
  requestedPermissions: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  player?: { id: string; username: string; email: string; role: string };
}

export const adminAuthApi = {
  request: (payload: { requestedRole?: string; requestedPermissions?: string[]; notes?: string }) =>
    apiFetch<AdminAuthorizationRequest>('/admin-authorization/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRequests: () => apiFetch<AdminAuthorizationRequest[]>('/admin-authorization/requests'),
  approve: (requestId: string, notes?: string) =>
    apiFetch<AdminAuthorizationRequest>(`/admin-authorization/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  reject: (requestId: string, notes?: string) =>
    apiFetch<AdminAuthorizationRequest>(`/admin-authorization/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
};

// ─── Video Call ───────────────────────────────────────────────────────────────

export const videoApi = {
  getToken: () => apiFetch<VideoCallToken>('/video/token'),
};

// ─── Payments (player-facing) ─────────────────────────────────────────────────

export const paymentApi = {
  initiate: (packageId: string, provider: string) =>
    apiFetch<{ orderId: string; checkoutUrl: string; status: string }>('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({ packageId, provider }),
    }),
  validateReceipt: (packageId: string, receipt: string, platform: 'ios' | 'android') =>
    apiFetch<{ orderId: string; tokensAdded: number }>('/payments/validate-receipt', {
      method: 'POST',
      body: JSON.stringify({ packageId, receipt, platform }),
    }),
  purchase: (packageId: string, paymentMethod: string, reference?: string) =>
    apiFetch<{ orderId: string; status: string; amountCents: number; tokenAmount: number; paymentMethod: string; instructions: string }>(
      '/payments/custom/purchase', {
        method: 'POST',
        body: JSON.stringify({ packageId, paymentMethod, reference }),
      }),
  getMyOrders: (page = 1) =>
    apiFetch<{ orders: PaymentOrder[]; total: number }>(`/payments/custom/my-orders?page=${page}`),
  confirm: (orderId: string, notes?: string) =>
    apiFetch(`/payments/custom/confirm/${orderId}`, { method: 'POST', body: JSON.stringify({ notes }) }),
  cancel: (orderId: string, reason?: string) =>
    apiFetch(`/payments/custom/cancel/${orderId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

export interface DesignToken {
  id: string;
  scope: string;
  key: string;
  value: string;
  label?: string;
  updatedAt: string;
}

export interface GameBranding {
  id: string;
  gameSlug: string;
  displayName?: string;
  logoUrl?: string;
  iconEmoji?: string;
  primaryColor?: string;
  accentColor?: string;
  bgGradient?: string;
  tagline?: string;
  isVisible: boolean;
  updatedAt: string;
}

export interface GameWithBranding extends Game {
  branding: GameBranding | null;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  allowedRoles: string;
  updatedAt: string;
}

export interface PlatformStats {
  players: number;
  activePlayers: number;
  games: number;
  rounds: number;
  bets: number;
  designTokens: number;
  version: string;
  db: string;
}

export interface TodayStats {
  todayEarnings: number;  // net (won - lost)
  todayWon: number;
  todayLost: number;
  todayStaked: number;
  todayBetCount: number;
  allTimeWon: number;
  allTimeLost: number;
  balance: number;
}

export interface RecentResult {
  id: string;
  roundId: string;
  winningOption: string;
  winningOptionLabel: string;
  winningOptionColor: string;
  winningOptionMultiplier: number | null;
  processedAt: string;
  round: {
    id: string;
    roundNumber: number;
    winnerId: string | null;
    totalBetAmount: number;
    settledAt: string | null;
  };
}

export interface AdminAccountEntry {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  balance: number;
  hasVideoAccess: boolean;
}

export interface GameDenominationConfig {
  gameId: string;
  denominations: string; // JSON array string
  minBet: number;
  maxBet: number;
}

export interface GamePackage {
  id: string;
  gameId: string;
  name: string;
  optionLabels: string; // JSON array string
  price: number;
  multiplier: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceHealth {
  uptimeSeconds: number;
  dbPingMs: number;
  dbOk: boolean;
  memUsedMb: number;
  memTotalMb: number;
  rssMb: number;
  nodeVersion: string;
  environment: string;
  pendingMigrations: number;
  responseMs: number;
  apiVersion: string;
  timestamp: string;
}

export interface ServiceHealthSnapshot {
  id: string;
  uptimeSeconds: number;
  dbPingMs: number;
  memUsedMb: number;
  memTotalMb: number;
  nodeVersion: string;
  environment: string;
  pendingMigrations: number;
  recordedAt: string;
}

export interface PaymentGatewayConfig {
  id: string;
  provider: string;
  isEnabled: boolean;
  publicKey: string | null;
  webhookSecret: string | null;
  webhookUrl: string | null;
  metadata: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface PaymentOrder {
  id: string;
  playerId: string;
  packageId: string | null;
  provider: string;
  externalOrderId: string | null;
  currency: string;
  amountCents: number;
  tokenAmount: number;
  status: string;
  createdAt: string;
  player?: { id: string; username: string; email: string };
}

export interface VideoCallAccess {
  id: string;
  playerId: string;
  grantedBy: string;
  channelName: string;
  role: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  player?: { id: string; username: string; email: string; role: string };
}

export interface VideoCallToken {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  role: string;
  expiresAt: string;
  isStub: boolean;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export const supportApi = {
  createTicket: (subject: string, description: string, category?: string, priority?: string) =>
    apiFetch<SupportTicket>('/support', {
      method: 'POST',
      body: JSON.stringify({ subject, description, category, priority }),
    }),
  myTickets: (page = 1) =>
    apiFetch<{ tickets: SupportTicket[]; total: number }>(`/support/my?page=${page}`),
  getTicket: (ticketId: string) =>
    apiFetch<SupportTicketDetail>(`/support/${ticketId}`),
  reply: (ticketId: string, message: string, isInternal?: boolean) =>
    apiFetch<SupportMessage>(`/support/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal }),
    }),
  allTickets: (page = 1, status?: string, category?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    return apiFetch<{ tickets: SupportTicketDetail[]; total: number }>(`/support/admin/all?${params}`);
  },
  updateTicketStatus: (ticketId: string, status: string, assignedTo?: string) =>
    apiFetch(`/support/admin/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, assignedTo }),
    }),
};

// ─── Permissions (Superadmin) ─────────────────────────────────────────────────

export const permissionApi = {
  grant: (adminId: string, permission: string, scope: string, expiresAt?: string, notes?: string) =>
    apiFetch<AdminPermission>('/permissions/grant', {
      method: 'POST',
      body: JSON.stringify({ adminId, permission, scope, expiresAt, notes }),
    }),
  revoke: (adminId: string, permission: string) =>
    apiFetch(`/permissions/${adminId}/${permission}`, { method: 'DELETE' }),
  list: (adminId: string) =>
    apiFetch<AdminPermission[]>(`/permissions/${adminId}`),
  grantPreset: (adminId: string, preset: string, gameSlug?: string) =>
    apiFetch<{ granted: number }>('/permissions/preset', {
      method: 'POST',
      body: JSON.stringify({ adminId, preset, gameSlug }),
    }),
  check: (permission: string) =>
    apiFetch<{ permission: string; allowed: boolean }>(`/permissions/check?permission=${permission}`),
  presets: () =>
    apiFetch<Array<{ name: string; description: string }>>('/permissions/presets'),
};

// ─── Support & Permission Types ───────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  playerId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  player: { id: string; username: string; email: string };
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export interface AdminPermission {
  id: string;
  adminId: string;
  permission: string;
  scope: string;
  grantedBy: string;
  isActive: boolean;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
}
