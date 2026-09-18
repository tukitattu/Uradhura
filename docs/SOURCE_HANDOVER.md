# Source Handover — Uradhura

## Architecture

One shared NestJS backend (REST + Socket.IO) consumed by Admin Web, Player Web,
and the Expo mobile app. DB access via Prisma; Postgres in prod, SQLite for
lightweight local runs. Outcome generation uses a crypto commitment-scheme RNG
(`modules/games/rng.service.ts`, HMAC-SHA256) — **no `Math.random()` in game
outcomes**.

```
platform/
├── apps/
│   ├── api/            NestJS 10 · Prisma · Socket.IO
│   ├── admin/          Next.js 14 · shadcn/ui · React Query
│   └── player/         Expo SDK 50 (React Native 0.73) → APK/AAB
├── packages/           (shared types/events/api — see roadmap)
├── docker/             Postgres16+Redis7 compose, Dockerfiles, nginx
gaming-platform/        Legacy Express+SQLite stack (backend :4000, frontend :3000)
docs/                   API, deployment, handover, Play Store, VPS guides
.github/workflows/      CI/CD
```

## Versions (verified working in local dev)

| Component | Version |
|---|---|
| Node | 20 (`.nvmrc`) / 22 tested |
| NestJS | 10.x |
| Next.js (admin) | 14.0.4 |
| Next.js (player web) | 14.1.0 |
| Prisma | 5.x |
| Expo | SDK 50 (RN 0.73) |

## Port map (local)

| Port | Service |
|---|---|
| 4000 | Legacy Express backend (`gaming-platform`) |
| 4002 | NestJS API (`platform/apps/api`) |
| 3000 | Player web |
| 3001 | Admin web |

## Build / run commands

```bash
# API
cd platform/apps/api && npm install && npx prisma generate && npm run build && npm run start:prod   # :4002
# Admin
cd platform/apps/admin && npm install && npm run build && npx next start -p 3001
# Player web
cd gaming-platform/frontend && npm install && npm run build && npm run start
# Mobile
cd platform/apps/player && npx expo start          # dev
# eas build --platform android --profile production # APK/AAB
```

## Credential & secret map

| Secret | Location (git-ignored) |
|---|---|
| `DATABASE_URL`, `REDIS_URL` | `platform/apps/api/.env` / `platform/docker/.env` |
| `JWT_SECRET` family | API `.env` |
| `NEXT_PUBLIC_API_URL` / `WS_URL` | Admin + Player web `.env.local` |
| Keystore + signing keys | Secure handover (never git) |

Local super admin seed: `admin@gaming.com` / `Pjokjict4@#$%` (change in prod).

## Data integrity guarantees (server-authoritative)

- Bets: unique `idempotencyKey`, atomic `$transaction` (debit + bet + round total)
- Settlement: `GameSettlement.betId` unique → no double payout
- Ledger: append-only `WalletTransaction` with `balanceBefore/After`
- Admin actions: `AuditLog` with before/after snapshots + requestId
- RBAC enforced by guards on every protected route

## Handover package contents

- [x] Full git repo · README · LICENSE
- [x] `docs/API.md` (Swagger at `/api/docs`)
- [x] `docs/DEPLOYMENT.md` + `docker-compose` (1-command local boot)
- [x] `docs/PLAYSTORE_CHECKLIST.md`
- [x] `.env.example` per app, migration files, super-admin-only seed
- [x] CI/CD workflow (`.github/workflows/production-release.yml`)
- [ ] Keystore + signed AAB (build step, secure handover)
- [ ] Live domain + SSL (post-provision)

## Roadmap (explicit, not yet shipped)

- Redis/BullMQ adapter for Socket.IO scaling + queue
- Reconcile `gaming-platform/` SQLite era into the `platform/` Nest stack
- Package the shared packages/ (`shared-types`, `shared-events`, `shared-api`)
- Automated UAT across all 3 channels in CI