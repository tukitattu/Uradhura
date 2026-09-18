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
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  category: GameCategory;
  status: GameStatus;
  minBet: number;
  maxBet: number;
  playerCount: number;
  rules: string;
  config: Record<string, unknown>;
  createdAt: string;
}

export type GameCategory = 'classic' | 'card' | 'dice' | 'wheel' | 'lottery' | 'slots';
export type GameStatus = 'active' | 'maintenance' | 'upcoming';

export interface GameRound {
  id: string;
  gameId: string;
  roundNumber: number;
  status: RoundStatus;
  result: Record<string, unknown> | null;
  bets: GameBet[];
  totalPool: number;
  startTime: string;
  endTime: string | null;
  bettingDeadline: string;
}

export type RoundStatus = 'waiting' | 'betting' | 'locked' | 'playing' | 'completed' | 'cancelled';

export interface GameBet {
  id: string;
  playerId: string;
  roundId: string;
  amount: number;
  currency: BetCurrency;
  option: string;
  multiplier: number;
  payout: number;
  status: BetStatus;
  createdAt: string;
}

export type BetCurrency = 'coins' | 'diamonds';
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded';

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
