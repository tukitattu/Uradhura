export interface Player {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  level: number;
  xp: number;
  coins: number;
  diamonds: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface PlayerProfile extends Player {
  isFollowing: boolean;
  recentPosts: Post[];
  stats: PlayerStats;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  currentStreak: number;
  bestStreak: number;
}

export interface Game {
  id: string;
  internalCode: string;
  name: string;
  displayName: string;
  slug?: string;
  description?: string | null;
  shortDescription?: string | null;
  thumbnail?: string | null;
  banner?: string | null;
  icon?: string | null;
  category?: GameCategory | null;
  gameType?: string | null;
  status: GameStatus;
  minBet?: number;
  maxBet?: number;
  playerCount?: number;
  rules?: string | null;
  config?: Record<string, unknown>;
  isHot?: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
  centralCharacter?: string | null;
  characterName?: string | null;
  theme?: string | null;
  colorConfig?: string | null;
  createdAt: string;
}

export type GameCategory =
  | 'classic'
  | 'card'
  | 'dice'
  | 'wheel'
  | 'lottery'
  | 'slots'
  | 'slot'
  | 'package';
export type GameStatus = 'active' | 'maintenance' | 'upcoming' | 'inactive';

// ============================================================
// GAME ENGINE — server-authoritative shapes
// These types mirror the /game socket namespace and the player
// games REST endpoints (GET /games/active, /games/:id/state,
// /games/:id/current-round, /games/:id/history, /games/verify).
// Prisma Decimals arrive serialized as strings; resultData on a
// GameRound row arrives as a JSON string, while the result files
// embedded in round_result events arrive as parsed objects.
// ============================================================

export type GameInternalCode =
  | 'greedy_monkey'
  | 'greedy_lion'
  | 'food_wheel'
  | 'teen_patti'
  | 'three_card'
  | 'slot';

export type RoundStatus =
  | 'upcoming'
  | 'betting_open'
  | 'betting_closed'
  | 'result_processing'
  | 'settled'
  | 'closed';

export interface GameRound {
  id: string;
  gameId: string;
  roundNumber: number;
  status: RoundStatus;
  bettingOpensAt: string | null;
  bettingEndsAt: string | null;
  resultData: string | null;
  winnerId: string | null;
  winnerLabel: string | null;
  totalBetAmount: string;
  totalPayout: string;
  houseEdge: string | null;
  jackpotWeight: string | null;
  configVersion: number | null;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  closedAt: string | null;
}

export interface GameOption {
  id: string;
  gameId: string;
  name: string;
  label: string;
  icon: string | null;
  image: string | null;
  positionX: number | null;
  positionY: number | null;
  multiplier: string;
  weight: string;
  isHot: boolean;
  isRecommended: boolean;
  sortOrder: number;
  isActive: boolean;
  colorHex: string;
  metadata: string | null;
}

export interface GameConfig {
  id: string;
  gameId: string;
  version: number;
  houseEdge: string;
  maxPayoutPerRound: string;
  jackpotWeight: string;
  vipAdjustment: string;
  maxDailyLossPerPlayer: string;
  bettingDurationSeconds: number;
  roundDurationSeconds: number;
  resultProcessingDelayMs: number;
  newRoundDelayMs: number;
  minPlayers: number;
  maxPlayers: number;
  isActive: boolean;
  configData: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameBetConfig {
  id: string;
  gameId: string;
  denominations: string;
  minBet: string;
  maxBet: string;
  allowCustomBet: boolean;
  allowMultipleSelections: boolean;
  allowRepeatBet: boolean;
  allowAutoBet: boolean;
  allowAutoPlay: boolean;
  maxAutoBetRounds: number;
}

export interface GameBetRecord {
  id: string;
  roundId: string;
  playerId: string;
  optionId: string;
  amount: string;
  potentialPayout: string;
  status: string;
  payout: string | null;
  multiplierSnapshot: string | null;
  idempotencyKey: string;
  txRef: string | null;
  metadata: string | null;
  createdAt: string;
  settledAt: string | null;
}

export interface MyBet {
  id: string;
  optionId: string;
  amount: string;
  status: string;
  payout: string | null;
}

export interface SeedState {
  seedId: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  algorithm?: 'HMAC-SHA256';
  revealedServerSeed?: string | null;
}

export interface OptionBetTotal {
  count: number;
  total: string;
}

export type BetTotals = Partial<Record<string, OptionBetTotal>>;

// ---- Result data produced by the game drivers ----

export interface WheelResultData {
  winningOptionId: string;
  winningOptionName: string;
  multiplier: string;
  angle: number;
  optionIndex: number;
  optionCount: number;
}

export interface GameCardData {
  rank: string;
  suit: string;
  value: number;
}

export interface CardGameSeat {
  seatId: string;
  seatName: string;
  multiplier: string;
  cards?: GameCardData[];
  card?: GameCardData;
  handRank?: string;
  handRankValue?: number;
  isWinner?: boolean;
}

export interface CardGameResultData {
  seats: CardGameSeat[];
  winningIndex: number;
  winningSeatId: string;
  roundNumber: number;
}

export interface SlotPayline {
  symbol: string;
  weight: number;
  multiplier: number;
  emoji?: string;
}

export interface SlotResultData {
  reels: string[][];
  symbol: string;
  multiplier: number | string;
  emoji: string;
  payline?: SlotPayline;
}

export type GameResultData =
  | WheelResultData
  | CardGameResultData
  | SlotResultData
  | Record<string, unknown>;

// ---- /game socket events ----

export interface RoundUpdateEvent {
  gameId: string;
  round?: GameRound;
  options?: GameOption[];
  config?: GameConfig | null;
  betConfig?: GameBetConfig | null;
  seed?: SeedState | null;
  betTotals?: BetTotals;
  playerCount?: number;
  event?: 'new_bet' | 'player_joined' | 'player_left';
  totalBetAmount?: string;
  serverTime: number;
}

export interface RoundStartedEvent {
  gameId: string;
  round: Pick<GameRound, 'id' | 'roundNumber' | 'status'>;
  seed: SeedState | null;
  betTotals: BetTotals;
  serverTime: number;
}

export interface RoundClosedEvent {
  gameId: string;
  round: Pick<GameRound, 'id' | 'status'>;
  betTotals: BetTotals;
  serverTime: number;
}

export interface RoundResultEvent {
  gameId: string;
  roundId: string;
  roundNumber: number;
  result: {
    winningOptionId: string | null;
    winningLabel: string;
    resultData: GameResultData;
    totalPayout: string;
    totalWinners: number;
  };
  fairPlay: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    revealedServerSeed: string;
    url: string;
  };
  serverTime: number;
}

export interface BetPlacedEvent {
  bet: GameBetRecord;
  balanceAfter: string;
}

export interface BetResultEvent {
  betId: string;
  roundId: string;
  gameId: string;
  optionId: string;
  status: 'won' | 'lost';
  amount: string;
  payout: string | null;
}

export interface BalanceUpdateEvent {
  balance: string;
}

export interface SeedRotatedEvent {
  accepted: boolean;
  clientSeed: string;
}

export interface SocketErrorEvent {
  message: string;
  code: string;
}

// ---- REST payloads ----

export interface CurrentRoundResponse {
  round: GameRound | null;
  options: GameOption[];
  config: GameConfig | null;
  betConfig: GameBetConfig | null;
  seed: SeedState | null;
  betTotals: BetTotals;
  serverTime: number;
}

export interface PlayerGameStateResponse extends CurrentRoundResponse {
  game: Game;
  myBets: MyBet[];
  balance: { coins: string; diamonds: string };
}

export interface HistoryItem {
  roundId: string;
  roundNumber: number;
  winningOptionId: string | null;
  winningLabel: string | null;
  resultData: GameResultData | null;
  totalBetAmount: string;
  totalPayout: string;
  settledAt: string | null;
}

export interface VerifyRoundResponse {
  roundId: string;
  algorithm: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  revealedServerSeed: string;
  hashMatchesCommitment: boolean;
  valid: boolean;
}

export interface GameBet {
  id: string;
  playerId: string;
  roundId: string;
  amount: string;
  status: string;
  payout: string | null;
  createdAt: string;
}

export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded' | 'cancelled';
export type BetCurrency = 'coins' | 'diamonds';

export interface Wallet {
  id: string;
  playerId: string;
  coins: number;
  diamonds: number;
  totalDeposited: number;
  totalWithdrawn: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: BetCurrency;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'gift' | 'purchase' | 'reward';

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price: number;
  currency: string;
  bonus: number;
  isPopular: boolean;
}

export interface DiamondPackage {
  id: string;
  name: string;
  diamonds: number;
  price: number;
  currency: string;
  isPopular: boolean;
}

export interface LiveRoom {
  id: string;
  hostId: string;
  host: Player;
  title: string;
  thumbnail: string | null;
  viewerCount: number;
  status: 'live' | 'ended' | 'scheduled';
  startedAt: string;
  tags: string[];
}

export interface LiveGift {
  id: string;
  name: string;
  icon: string;
  price: number;
  animation: string;
  sound: string;
}

export interface GiftSent {
  id: string;
  senderId: string;
  sender: Player;
  roomId: string;
  giftId: string;
  gift: LiveGift;
  message: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: Player;
  content: string;
  type: MessageType;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'gift' | 'system';

export interface Conversation {
  id: string;
  participants: Player[];
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

export interface Post {
  id: string;
  playerId: string;
  player: Player;
  content: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  playerId: string;
  player: Player;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
