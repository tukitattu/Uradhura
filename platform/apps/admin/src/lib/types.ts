export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "moderator" | "game_operator" | "finance" | "support" | "viewer";
  avatar?: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  status: "active" | "banned" | "suspended";
  level: number;
  xp: number;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  walletBalance: number;
  country?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: "active" | "inactive" | "maintenance";
  thumbnail?: string;
  bannerUrl?: string;
  minBet: number;
  maxBet: number;
  rtp: number;
  volatility: "low" | "medium" | "high";
  provider: string;
  options: GameOption[];
  config: Record<string, unknown>;
  totalRounds: number;
  totalBets: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface GameOption {
  id: string;
  gameId: string;
  name: string;
  value: string;
  multiplier: number;
  probability: number;
  isActive: boolean;
}

export interface GameRound {
  id: string;
  gameId: string;
  gameName: string;
  status: "pending" | "active" | "completed" | "cancelled";
  result?: string;
  totalBets: number;
  totalPayout: number;
  houseEdge: number;
  betCount: number;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface GameBet {
  id: string;
  roundId: string;
  playerId: string;
  playerUsername: string;
  gameId: string;
  gameName: string;
  amount: number;
  option: string;
  multiplier: number;
  payout: number;
  result: "win" | "loss" | "pending";
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  playerId: string;
  playerUsername: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "bonus" | "adjustment";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  reference?: string;
  description: string;
  createdAt: string;
}

export interface Report {
  id: string;
  playerId: string;
  playerUsername: string;
  reportedBy: string;
  reportedByUsername: string;
  type: "bug" | "cheat" | "abuse" | "other";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "dismissed";
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationAction {
  id: string;
  adminId: string;
  adminName: string;
  targetType: "player" | "game" | "system";
  targetId: string;
  targetName: string;
  action: string;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  totalGames: number;
  activeGames: number;
  totalRevenue: number;
  revenueToday: number;
  pendingReports: number;
  activeRounds: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxPlayersPerRound: number;
  minDepositAmount: number;
  maxWithdrawalAmount: number;
  defaultCurrency: string;
  supportEmail: string;
  featureFlags: Record<string, boolean>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

export interface AnalyticsData {
  revenue: ChartDataPoint[];
  playerGrowth: ChartDataPoint[];
  gamePopularity: ChartDataPoint[];
  betVolume: ChartDataPoint[];
}

export type AssetStatus = "draft" | "published" | "disabled" | "archived";
export type AssetVisibility = "public" | "vip" | "internal" | "beta";

export interface Asset {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  type: string | null;
  format: string | null;
  extension: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  version: number;
  status: AssetStatus;
  isEnabled: boolean;
  isBundled: boolean;
  sortOrder: number;
  target: string | null;
  scope: string | null;
  localization: string | null;
  startsAt: string | null;
  endsAt: string | null;
  visibility: AssetVisibility;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  checksum: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogOptions {
  categories: string[];
  targets: string[];
  statuses: AssetStatus[];
  visibilities: AssetVisibility[];
  formats: string[];
}

export interface SystemSetting {
  key: string;
  value: any;
  category: string | null;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface FeatureFlag {
  key: string;
  label: string;
  enabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface DesignToken {
  scope: string;
  key: string;
  value: string;
  label: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface GameBranding {
  gameSlug: string;
  displayName: string | null;
  tagline: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColors: string[] | null;
  updatedBy: string | null;
  updatedAt: string;
}

export type AdminAuthorizationStatus = "pending" | "approved" | "rejected";

export interface AdminAuthorizationRequest {
  id: string;
  playerId: string;
  requestedRole: string;
  requestedPermissions: string[];
  notes: string | null;
  status: AdminAuthorizationStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    isBanned: boolean;
  };
  reviewedBy?: { id: string; username: string; email: string | null } | null;
  provisionedAdminId?: string;
}

export interface AdminRecord {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  roles?: { id: string; name: string }[];
  permissions?: { permission: { id: string; resource: string; action: string }; effect: string }[];
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  before: string | null;
  after: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface TeenPattiConfig {
  id: string;
  key: string;
  value: any;
  updatedBy: string | null;
  updatedAt: string;
}
