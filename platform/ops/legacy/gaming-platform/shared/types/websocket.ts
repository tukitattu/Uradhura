export type WSEventType =
  | 'round:created'
  | 'round:betting_open'
  | 'round:betting_closed'
  | 'round:result_set'
  | 'round:settled'
  | 'round:new_round'
  | 'bet:placed'
  | 'wallet:updated'
  | 'player:balance_update';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  gameId: string;
  roundId: string;
  data: T;
  timestamp: number;
}

export interface WSRoundCreated {
  roundNumber: number;
  status: 'BETTING_OPEN';
  bettingEndsAt: string;
}

export interface WSRoundBettingClosed {
  status: 'BETTING_CLOSED';
}

export interface WSResultSet {
  status: 'RESULT_PROCESSING';
  winnerId: string;
  winningOptionLabel: string;
  resultData: string;
}

export interface WSRoundSettled {
  status: 'SETTLED';
  winnerId: string;
  totalPayout: number;
  settledBets: number;
}

export interface WSBetPlaced {
  betId: string;
  playerId: string;
  optionId: string;
  amount: number;
  newTotalBetAmount: number;
}

export interface WSBalanceUpdate {
  playerId: string;
  newBalance: number;
}
