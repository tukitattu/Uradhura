import { Game, GameBranding, GameDenominationConfig, GamePackage, GameWithBranding } from './game';

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

export interface DesignToken {
  id: string;
  scope: string;
  key: string;
  value: string;
  label?: string;
  updatedAt: string;
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
