export type GameId =
  | "greedy-monkey"
  | "greedy-lion"
  | "teen-patti"
  | "food-wheel"
  | "three-player-card"
  | "slot-multiplier";

export type GameOption = {
  id: string;
  name: string;
  imageUrl: string;
  multiplier?: number;
  enabled: boolean;
  hot?: boolean;
  recommended?: boolean;
};

export type GameConfig = {
  id: GameId;
  name: string;
  characterName?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  characterUrl?: string;
  rulesUrl?: string;
  options: GameOption[];
  denominations: number[];
  minBet: number;
  maxBet: number;
  bettingDurationSec: number;
  roundDurationSec: number;
  enabled: boolean;
};

export type RoundState =
  | "UPCOMING"
  | "BETTING_OPEN"
  | "BETTING_CLOSED"
  | "RESULT_PROCESSING"
  | "SETTLED"
  | "CLOSED";

export type GameRound = {
  gameId: GameId;
  roundId: string;
  state: RoundState;
  serverNowMs: number;
  bettingClosesAtMs?: number;
  roundClosesAtMs?: number;
  resultOptionId?: string;
};

export type WalletSnapshot = {
  coinBalance: number;
  diamondBalance: number;
  updatedAt: string;
};

export type PlayerProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  level?: number;
};

export type LiveRoom = {
  id: string;
  title: string;
  host: PlayerProfile;
  viewerCount: number;
  coverUrl?: string;
};

export type PlatformState = {
  games: GameConfig[];
  liveRooms: LiveRoom[];
  wallet?: WalletSnapshot;
  player?: PlayerProfile;
};