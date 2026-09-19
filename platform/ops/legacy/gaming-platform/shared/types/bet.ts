import { Game, GameOption } from './game';

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

export interface TodayStats {
  todayEarnings: number;
  todayWon: number;
  todayLost: number;
  todayStaked: number;
  todayBetCount: number;
  allTimeWon: number;
  allTimeLost: number;
  balance: number;
}
