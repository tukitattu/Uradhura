# Uradhura — SaaS Gaming + Social Platform

Production-ready SaaS gaming + social platform. One shared backend serves all
channels: **Admin Web**, **Player Web**, and the **Android APK**.

## Delivery channels (all on ONE backend)

| Channel | Tech | Location | Local URL |
|---|---|---|---|
| Backend API | NestJS + Prisma + Socket.IO | `platform/apps/api` | http://localhost:4002 |
| Admin Web | Next.js 14 (App Router) + shadcn/ui | `platform/apps/admin` | http://localhost:3001 |
| Player Web | Next.js 14 + Tailwind + PWA-ready | `platform/apps/player-web` → currently `gaming-platform/frontend` | http://localhost:3000 |
| Player APK | React Native (Expo SDK 50) | `platform/apps/player` | Expo dev build |

> Legacy Express stack lives under `gaming-platform/` (backend :4000, frontend :3000).
> It shares the same SQLite-era Prisma schema; keep port `4000` reserved for it.

## Stack

- **Backend**: NestJS 10, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16 (prod, via Docker) / SQLite (local dev fallback)
- **Realtime**: Socket.IO (namespaces `/game`, `/live`, `/chat`)
- **Admin**: Next.js 14, shadcn/ui, Tailwind, React Query
- **Mobile**: Expo managed workflow → EAS Build → APK/AAB

## Quick start (local dev)

```bash
# 1. Infra (Postgres + Redis)
docker compose -f platform/docker/docker-compose.yml up -d postgres redis

# 2. Backend API (port 4002)
cd platform/apps/api
npm install
npx prisma migrate dev
npx prisma db seed        # creates roles + superadmin ONLY — no fake data
npm run start:dev

# 3. Admin Web (port 3001)
cd platform/apps/admin
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:4002/api/v1
npm install
npm run dev

# 4. Player Web (port 3000)
cd gaming-platform/frontend
cp .env.example .env.local
npm install
npm run dev
```

Local super admin (seed): `admin@gaming.com` / `Pjokjict4@#$%` — change in production.

## Docs

- `docs/DEPLOYMENT.md` — production deployment (Docker/VPS/Nginx/SSL)
- `docs/API.md` — API reference (Swagger at `/api/docs`)
- `docs/PLAYSTORE_CHECKLIST.md` — Play Store submission guide
- `docs/SOURCE_HANDOVER.md` — architecture, versions, handover package
- `.github/workflows/` — CI/CD

## License

See [LICENSE](LICENSE).