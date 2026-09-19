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
  recentTransactions?: import('./wallet').WalletTransaction[];
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
