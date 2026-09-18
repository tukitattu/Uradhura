# Deployment — Uradhura (production)

## Topology

```
                        ┌──────────────┐
    Player APK  ──────▶ │              │
    Player Web  ──────▶ │   Nginx :443 │ ──▶ Admin Web (:3001) /api → API
    Admin Web   ──────▶ │   (TLS/SSL)  │ ──▶ Player Web (:3000) /api → API
                        └──────┬───────┘
                               │
                       ┌───────▼───────┐
                       │   API :4002   │
                       └───┬───────┬───┘
                           │       │
                    Postgres 16   Redis 7
```

## Requirements

- VPS: Ubuntu 22.04, 4 vCPU / 16 GB RAM / 100 GB SSD (see `docs/vps-production-config.md`)
- Node 20, Docker + Compose v2, Nginx, Let's Encrypt certbot
- Domains: `api.`, `admin.`, `play.` → your platform domain

## Option A — Docker Compose (recommended)

```bash
cd platform/docker
cp .env.example .env            # set real values (DB, secrets)
nano nginx/nginx.conf           # server names + SSL paths
docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.yml` provisions `postgres:16-alpine` + `redis:7-alpine` with
healthchecks; `Dockerfile.api` runs `prisma migrate deploy` then `node dist/main`.

## Option B — VPS / PM2 + system Postgres + Redis

```bash
# deploy script (already in repo — adjust paths/domain)
./deployment/deploy.sh
pm2 start deployment/pm2.config.js
```

## Required env vars

| Var | Where |
|---|---|
| `DATABASE_URL` | API (postgres://user:pass@host:5432/gaming_platform) |
| `REDIS_URL` | API (redis://host:6379) |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRATION` | API |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | Admin + Player Web |
| `CORS_ORIGIN` | API (comma-separated frontend origins) |

**Secrets never committed.** `.env*` is git-ignored.

## Database migrations

```bash
npx prisma migrate deploy    # apply on deploy (CI or entrypoint)
npx prisma db seed           # SUPER ADMIN only — no demo/fake data
```

## HTTPS / SSL

1. Point `api.`/`admin.`/`play.` DNS records at the VPS.
2. `certbot --nginx -d api.YOURDOMAIN -d admin.YOURDOMAIN -d play.YOURDOMAIN`
3. Nginx (see `platform/docker/nginx/nginx.conf`) proxies:
   - `/` admin → `http://admin:3001`
   - `/` play → `http://player:3000`
   - `/api` + WS → `http://api:4002`

## Backup & recovery

- Postgres: nightly `pg_dump` → S3/object storage; retention ≥ 7 days (runbook
  in `docs/vps-production-checklist.md`)
- Restore: `pg_restore`, re-apply migrations, restart API.
- Redis: RDB/AOF persistence + `CONFIG SET appendonly yes`.

## Rollback

- Docker: keep last known-good image tag; `docker compose up -d <tag>`.
- DB rollback: restore dump, deploy previous API version.