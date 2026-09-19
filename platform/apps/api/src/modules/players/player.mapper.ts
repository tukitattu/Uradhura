// ============================================================
// PLAYER MAPPER
// Maps Prisma Player rows to the RN-facing flat Player shape.
// Shared by auth, wallet, chat, live, social, and players modules.
// ============================================================

export interface PlayerMapperRow {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  bio?: string | null;
  isBanned?: boolean;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date | null;
  level?: { level: number } | null;
  levelId?: string | null;
  wallet?: { coinBalance?: unknown; diamondBalance?: unknown } | null;
  _count?: {
    posts?: number;
    followers?: number;
    following?: number;
  };
}

export interface PlayerLiteRow {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
}

export function toPlayerDto(row: PlayerMapperRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? '',
    displayName: row.displayName ?? row.username,
    avatar: row.avatar ?? null,
    bio: row.bio ?? '',
    level: row.level?.level ?? 1,
    xp: 0,
    coins: Number(row.wallet?.coinBalance ?? 0) || 0,
    diamonds: Number(row.wallet?.diamondBalance ?? 0) || 0,
    followersCount: row._count?.followers ?? 0,
    followingCount: row._count?.following ?? 0,
    postsCount: row._count?.posts ?? 0,
    isOnline: false,
    lastSeen: (row.lastLoginAt ?? row.createdAt)?.toISOString() ?? new Date().toISOString(),
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function toPlayerLite(row: PlayerLiteRow) {
  const base = toPlayerDto(row as PlayerMapperRow);
  return {
    id: base.id,
    username: base.username,
    email: base.email,
    displayName: base.displayName,
    avatar: base.avatar,
    bio: '',
    level: 1,
    xp: 0,
    coins: 0,
    diamonds: 0,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isOnline: false,
    lastSeen: base.createdAt,
    createdAt: base.createdAt,
  };
}