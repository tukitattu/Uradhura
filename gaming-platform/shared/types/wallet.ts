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
