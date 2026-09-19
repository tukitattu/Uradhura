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
  id: string;
  gameId: string;
  label: string;
  multiplier: number;
  colorHex: string;
  iconUrl?: string;
  isHot: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface GameConfiguration {
  id: string;
  houseEdge: number;
  maxPayoutPerRound: number;
  jackpotWeight: number;
  maxDailyLoss: number;
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

export interface GameDenominationConfig {
  gameId: string;
  denominations: string;
  minBet: number;
  maxBet: number;
}

export interface GamePackage {
  id: string;
  gameId: string;
  name: string;
  optionLabels: string;
  price: number;
  multiplier: number;
  isActive: boolean;
  sortOrder: number;
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
