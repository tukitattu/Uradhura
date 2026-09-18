export { AdminPlayer } from './player';

export interface DashboardData {
  activeGames: number;
  totalGames: number;
  liveRounds: number;
  todayBets: { total: number; count: number; changeVsYesterday: number };
  netProfit: { total: number; changeVsYesterday: number };
  systemStatus: string;
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

export interface AdminDashboardData {
  dashboard: DashboardData;
  profitRisk: ProfitRiskConfig;
  activeRounds: Array<{
    id: string;
    gameId: string;
    roundNumber: number;
    status: string;
    bettingEndsAt?: string;
    totalBetAmount: number;
    betCount: number;
    game: { id: string; name: string; slug: string };
  }>;
}
