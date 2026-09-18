# API Reference — Uradhura

Base URL: `/api/v1` · Interactive docs: `GET /api/docs` (Swagger UI)
Realtime: Socket.IO on `http://<host>:<port>` with namespaces `/game`, `/live`, `/chat`.

## Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Player register (email + password) |
| POST | `/auth/login` | Login → access + refresh JWT |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Invalidate session |

All protected routes require `Authorization: Bearer <token>`. RBAC enforced
server-side via `JwtAuthGuard` + `RolesGuard` (`@Roles(...)`).

## Games

| Method | Path | Description |
|---|---|---|
| GET | `/games` | Active games list |
| GET | `/games/:id` | Game detail + branding |
| GET | `/games/:id/config` | Live configuration |
| GET | `/games/:id/rounds/current` | Current round + options |
| POST | `/games/:id/rounds` | Start round (admin) |
| POST | `/games/:id/settle` | Force settle (admin) |
| POST | `/games/:id/options` | Manage options (admin) |

See `src/modules/games/` — engine (`game-engine.service.ts`), round lifecycle
(`round-lifecycle.service.ts`), RNG (`rng.service.ts`, **crypto-based
commitment scheme — no `Math.random()` in outcome generation**).

## Wallet

| Method | Path | Description |
|---|---|---|
| GET | `/wallet` | Balance (coins/diamonds) |
| GET | `/wallet/transactions` | Immutable ledger |
| POST | `/wallet/adjust` | Admin adjustment (audited, idempotent) |

Ledger: `WalletTransaction` with unique `idempotencyKey`, `balanceBefore/After`.
Bets and settlements are atomic `$transaction`s; `GameSettlement.betId` unique
constraint prevents double payout.

## Players / Economy / Social / Moderation / Settings

| Module | Routes |
|---|---|
| Players | `GET/PATCH /players`, `GET /players/:id` (admin) |
| Economy | `/economy` packages, gifts, coin/diamond transactions |
| Live | `/live/rooms`, room members |
| Chat | `/chat` DMs + room messages |
| Social | `/social/posts`, likes, comments, follows, blocks |
| Moderation | `/moderation/reports`, actions |
| Notifications | `/notifications` |
| Settings | `/settings` flags, branding, design tokens |
| Audit | `/audit` logs (immutable admin trail) |
| Health | `GET /health`, `GET /api/v1/health` |

## Socket.IO events (server → client)

- `round:start`, `round:betting`, `round:result`, `round:settled` — `/game`
- `room:update`, `member:joined`, `gift:sent` — `/live`
- `message:new`, `typing` — `/chat`

Client sends `place_bet` (`gameId`, `optionId`, `amount`, `idempotencyKey`).
Missing idempotency key is generated server-side (CSPRNG UUID).