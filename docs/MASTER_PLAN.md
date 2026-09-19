# Uradhura Gaming Platform — Master Plan v1

> Status: CONFIMED BUILD — production-grade, not a demo.
> Applies to: Web Admin (Next.js), Player Web (Next.js), Android APK (Expo/React Native), ONE shared backend.

---

## 1. Production Software Confirmation

This is confirmed as a production-grade project. Every model, endpoint, event, and module is
built to run in production, not as a demo.

Non-negotiable production rules (baked into Step 1+ architecture):

| # | Rule | Enforcement point |
|---|------|-------------------|
| 1 | Server-authoritative. Wallet, bets, outcome, payout, RNG are computed ONLY on the backend. Clients only render and send intent. | GameGateway, GameEngine, WalletService |
| 2 | Real database only. No in-memory stores for ledger/wallet/game state. PostgreSQL 16 via Prisma. | Prisma schema (Step 1) |
| 3 | Redis 7 required at runtime (Socket.IO adapter, BullMQ queues, pub/sub, rate limiting). | docker-compose, gateway config |
| 4 | Real money math via Decimal (never JS float) for balances, bets, payouts, RTP. | WalletService, engine settlement |
| 5 | `Math.random()` is FORBIDDEN for any business value. Provably fair HMAC-SHA256 + CSPRNG only. | provably-fair module, lint rule |
| 6 | No mock/demo/seed data anywhere. Only seed = ONE super-admin. | prisma/seed.ts |
| 7 | No placeholders/TODO. Everything wired end-to-end. | code review gate |
| 8 | JWT access+refresh tokens, bcrypt password hashes, RBAC enforced server-side on every protected route. | AuthModule, guards |
| 9 | Web (Next.js) and APK (Expo) share the same backend + same Socket.IO contract. | api.ts, socket.ts in both apps |
| 10 | Every state-changing wallet/game operation is idempotent (idempotencyKey) and journaled to an immutable ledger. | WalletTransaction, GameBet, GameSettlement |

---

## 2. Reference Repositories Studied

| Repo | Why | Idioms adopted |
|------|-----|----------------|
| [colyseus/colyseus](https://github.com/colyseus/colyseus) | Authoritative multiplayer framework | Server-authoritative room + state sync; matchmaking patterns; delta/state sync concepts; scales via Redis |
| [kkpan11/pinus](https://github.com/kkpan11/pinus) | Node.js game server framework | Connector/gateway component split; push vs. response message model; channel-based pub/sub |
| [m16khb/mafia-game-backend](https://github.com/m16khb/mafia-game-backend) | Exact-match architecture (NestJS + Prisma + Socket.IO) | NestJS module layout, Prisma integration, Redis-backed Socket.IO adapter, room lifecycle |
| [dBish6/Quest_Casino](https://github.com/dBish6/Quest_Casino) | Casino microservice + wallet split | Wallet service separation, bet→result→settle pipeline, Kafka/NATS message boundaries |
| [saahiyo/51game-wingo](https://github.com/saahiyo/51game-wingo) | 1-minute prediction/betting game (Expo + Node) | Round-loop game model (betting window → lock → result → settle), client seed flow |
| [ufvg/casino-math-engine](https://github.com/ufvg/casino-math-engine) | Provably fair math engine | `serverSeed + clientSeed + nonce -> HMAC-SHA256 -> outcome`; rejection sampling (no modulo bias); RTP calibration; published commitment hash |
| [googleforgames/open-match2](https://github.com/googleforgames/open-match2) | Production matchmaker | Backfill/match tickets, queue-based matchmaking used as conceptual reference for rooms/ranked play |

**Key extraction** — provably fair core (from casino-math-engine):
```
server_seed + client_seed + nonce  --HMAC-SHA256-->  hmac digest
h(server_seed) published BEFORE play ("commitment")
server_seed revealed AFTER play; anyone can recompute the outcome.
```

---

## 3. Proposed Monorepo Folder Structure

```
Uradhura/
├── platform/                       # THE production monorepo (single shared backend)
│   ├── apps/
│   │   ├── api/                    # NestJS API — the ONE backend (port 4000)
│   │   │   ├── src/
│   │   │   │   ├── main.ts
│   │   │   │   ├── app.module.ts
│   │   │   │   ├── common/         # guards, decorators, filters, interceptors, pipes
│   │   │   │   ├── config/         # validated env config
│   │   │   │   ├── modules/
│   │   │   │   │   ├── auth/
│   │   │   │   │   ├── players/
│   │   │   │   │   ├── wallet/         # WalletService (server-authoritative ledger)
│   │   │   │   │   ├── payments/
│   │   │   │   │   ├── games/          # Game master, config, options
│   │   │   │   │   ├── gateway/        # Socket.IO gateway + GameEngine orchestration
│   │   │   │   │   ├── engine/         # GameEngine interface + implementations
│   │   │   │   │   ├── provably-fair/  # RNG module (CSPRNG + HMAC verification)
│   │   │   │   │   ├── live/           # Live rooms, gifts, chat
│   │   │   │   │   ├── social/         # Posts, likes, comments, follow
│   │   │   │   │   ├── economy/        # Packages, rewards, tasks, rankings
│   │   │   │   │   ├── moderation/
│   │   │   │   │   ├── notifications/
│   │   │   │   │   ├── admin/          # RBAC admin users, audit
│   │   │   │   │   └── dashboard/
│   │   │   │   └── shared/         # shared DTOs, enums, contracts
│   │   │   ├── prisma/             # Step 1 production schema + seed (super-admin only)
│   │   │   └── test/
│   │   ├── admin/                  # Next.js Web Admin (port 3001)
│   │   └── player/                 # Next.js Player Web (port 3000)
│   ├── apps-extra?
│   │   └── mobile/                 # Expo React Native → Android APK (shares platform API)
│   ├── docker/
│   │   ├── docker-compose.yml      # postgres 16 + redis 7 + api + admin + nginx
│   │   └── .env.example
│   └── packages/
│       ├── shared-contracts/       # TS types for Socket.IO + API DTOs (shared by api/web/admin/mobile)
│       └── provably-fair/          # Pure RNG + verification lib (zero infra deps)
└── gaming-platform/                # LEGACY local dev webapp (Express+Next) — not production; kept only as reference
```

---

## 4. Docker Compose — PostgreSQL 16 + Redis 7

Already present in `platform/docker/docker-compose.yml` (verified):

- `postgres:16-alpine` — POSTGRES_DB=gaming_platform, user gaming_admin, volume, healthcheck, port `5432`.
- `redis:7-alpine` — appendonly, maxmemory 256mb, healthcheck, port `6379`.
- `api` (NestJS, :4000), `admin` (Next, :3001), `nginx` (:80/:443) — `depends_on` postgres+redis healthy.
- `.env.example` — DATABASE_URL=`postgresql://gaming_admin:${DB_PASSWORD}@postgres:5432/gaming_platform`, REDIS_URL, JWT secrets, CORS.

Step 1 changes required to compose (next build phase):
- Add `platform/mobile` build (Expo/EAS) — web independent, no compose change needed.
- API healthcheck target: `http://localhost:4000/api/v1/health`.
- Add worker service for BullMQ queues.

---

## 5. Game Engine Interface Contract

Defined in `platform/packages/shared-contracts` and implemented in `platform/apps/api/src/modules/engine/`.

```ts
// GameEngine contract — every game implements this. Server-authoritative only.
export interface GameEngine {
  readonly code: string;                      // game internalCode
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly allowedBetDenominations: number[];
  readonly minBet: number;
  readonly maxBet: number;

  // Called by GameGateway when a betting window opens.
  startRound(ctx: EngineStartContext): Promise<EngineRoundSession>;

  // Called synchronously per bet; MUST be fast and side-effect free (validation only).
  validateBet(ctx: EngineBetContext): Promise<EngineBetAcceptance>;

  // settlement: generates outcome from provably-fair RNG for the round,
  // returns per-player settlements. Called ONLY server-side.
  settleRound(ctx: EngineSettleContext): Promise<EngineSettlementResult>;

  // house-edge/RTP/limits config version backing this engine.
  configVersion(): string;
}

export interface EngineRoundSession {
  roundId: string;
  bettingOpensAt: Date;
  bettingEndsAt: Date;
  seedCommitment: string;          // sha256(serverSeed) published BEFORE result
  configVersion: string;
}

export interface EngineBetContext {
  roundId: string;
  playerId: string;
  optionId: string;
  amount: number;                  // Decimal-as-number; engine does NOT touch wallet
  idempotencyKey: string;
}

export interface EngineBetAcceptance {
  accepted: boolean;
  reason?: string;
  potentialPayout: number;         // amount * multiplierSnapshot
}

export interface EngineSettleContext {
  roundId: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  bets: EngineBetContext[];
  option: EngineOptionSnapshot;
}

export interface EngineSettlementResult {
  winningOptionId: string;
  winningLabel: string;
  resultData: Record<string, unknown>;   // dice faces, wheel index, card values…
  settlements: Array<{ playerId: string; betId: string; amount: number; payout: number; won: boolean }>;
  seedReveal: string;                    // revealed server seed for verification
}
```

Rule: the wallet ONLY executes what `GameEngine.settleRound` returns. The engine never credits/debits—it returns settlement intents that `WalletService` applies atomically.

---

## 6. Provably Fair RNG Module Structure

`platform/packages/provably-fair/src/`

```
provably-fair/
├── src/
│   ├── index.ts
│   ├── rng.ts              # CSPRNG for server seeds (crypto.randomBytes) — NEVER Math.random
│   ├── hmac.ts             # HMAC-SHA256 deterministic PRNG: seedHash, deriveBytes, rejection sample
│   ├── fair-outcome.ts     # outcome mapping: bytes -> outcome domain (dice, wheel slot, card, crash point)
│   ├── verification.ts     # public verify(serverSeed, clientSeed, nonce, result) using published hash
│   └── constants.ts        # RTP defaults, max payout, instant-crash modulus
└── test/
    ├── provably-fair.spec.ts
    └── verification.spec.ts
```

Core algorithm (from casino-math-engine study):
```
commitment = sha256(serverSeed)          # published before betting window opens
digest     = hmacSha256(serverSeed, `${clientSeed}:${nonce}`)
bytes      = digest.extractBytes(count)  # rejection sampling => NO modulo bias
outcome    = mapToDomain(bytes, domainConfig)
```
- Never logged/emitted: raw `serverSeed` until round settles.
- `GameSeed` persisted in DB (see schema) with `serverSeedHash`, clientSeed, nonce, status, revealedAt → full public audit trail.
- RTP configured per game config (0.96-0.99), validated at engine startup.

---

## 7. Socket.IO Event Contract

Shared via `platform/packages/shared-contracts/socket.ts`. Admin uses REST; player web + APK use Socket.IO.

### Client → Server (auth via `Authorization: Bearer <JWT>` handshake / extraHeaders)

| Event | Payload | Description |
|-------|---------|-------------|
| `bet:place` | `{ roundId, optionId, amount, idempotencyKey }` | Request bet on an open round. Server-validated; wallet debited server-side. |
| `bet:cancel` | `{ betId }` | Cancel an unsettled bet (only within cancel window). |
| `game:join` | `{ gameId }` | Join a game room (receives engine snapshots). |
| `game:leave` | `{ gameId }` | Leave game room. |
| `live:join` | `{ roomId }` | Join live room (chat/gifts). |
| `live:leave` | `{ roomId }` | Leave live room. |
| `chat:send` | `{ roomId, content }` | Send chat message (moderated server-side). |
| `gift:send` | `{ roomId?, giftId, receiverId, quantity, idempotencyKey }` | Gift another player (coins debited+credited server-side). |
| `round:subscribe` | `{ roundId }` | Subscribe to a specific round's state/bets/result. |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `round:started` | `EngineRoundSession` (includes seedCommitment) | Betting window open; publishes commitment BEFORE result. |
| `round:bettingClosed` | `{ roundId }` | Window closed; no more bets accepted. |
| `round:result` | `{ roundId, winningOptionId, winningLabel, resultData, seedReveal, clientSeed, nonce }` | Final outcome + revealed seed for verification. |
| `bet:accepted` | `{ bet }` | Bet validated + wallet debited; idempotent ack (same idempotencyKey => same bet object, no double debit). |
| `bet:rejected` | `{ idempotencyKey, reason }` | Bet refused (limits, closed window, insufficient funds). |
| `bet:settled` | `{ bet, settlement }` | Per-player payout credited. |
| `wallet:update` | `{ coinBalance, diamondBalance }` | Pushed after any balance-affecting op. |
| `live:message` | `{ roomId, message }` | Broadcast chat message. |
| `live:gift` | `{ roomId, gift, sender, receiver }` | Broadcast gift. |
| `error` | `{ code, message, ref? }` | Uniform error envelope. |

All events validated by Zod/class-validator DTOs; unknown events rejected; rate-limited via Redis.

---

## 8. Step 1 Deliverable: Complete Prisma Schema (PostgreSQL)

Implemented in `platform/apps/api/prisma/schema.prisma` (next page / committed file). Full model set:

Auth & RBAC → AdminUser, Role, Permission, AdminUserRole, RolePermission, RefreshToken, PlayerRefreshToken
Players → Player, PlayerSetting
Wallet/Ledger → WalletAccount, WalletTransaction (immutable, idempotencyKey unique)
Games → Game, GameConfiguration, GameBetConfig, GameOption, GameAsset, GameLocalization
Rounds → GameRound, GameBet, GameResult, GameSettlement, **GameSeed (provably fair)**
Economy → CoinPackage, DiamondPackage, Gift, GiftTransaction, PaymentOrder
Live → LiveRoom, RoomMember, Message
Social → Post, PostLike, PostComment, FollowRelation, BlockRelation
Agencies/Families → Agency, AgencyMember, Family, FamilyMember
Progression → Level, Medal, Reward, PlayerReward, Task, PlayerTask, Ranking, RankingEntry
Moderation → Report, ModerationAction
Ops → Notification, AuditLog, SystemSetting, FeatureFlag, DesignToken, GameBranding

> Blocker for local run: Docker is NOT installed on this machine, so Postgres+Redis
> cannot start here yet. The webapp (Express :4000 + Next :3000) keeps running on its own
> legacy SQLite store and is unaffected. Platform API targets Postgres and is stopped
> until Postgres is available.