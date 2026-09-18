# VPS Production Deployment Checklist

This branch is for production deployment of the live app on a VPS.

## Required production environment

- Node.js 20+
- PostgreSQL or SQLite-compatible database
- Nginx or Caddy reverse proxy
- PM2 or systemd process manager
- SSL certificate via Let's Encrypt
- Domain pointing to the VPS
- environment secrets in `.env.production`

## Recommended application layout

```bash
/home/uradhura/
  gaming-platform/
  backend/
  frontend/
  .env.production
  logs/
  releases/
```

## Backend requirements

- `JWT_SECRET`
- `DATABASE_URL`
- `PORT=4000`
- `NODE_ENV=production`
- secure CORS whitelist

## Frontend requirements

- `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`
- production build: `npm run build`
- start via `next start` or PM2

## Nginx example

```nginx
server {
  listen 80;
  server_name app.yourdomain.com api.yourdomain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Process management

```bash
pm2 start "cd /home/uradhura/gaming-platform/backend && npm run start" --name uradhura-backend
pm2 start "cd /home/uradhura/gaming-platform/frontend && npm run start" --name uradhura-frontend
```

## Production checks

- app loads on HTTPS
- backend API responds on the production domain
- admin login works for approved roles only
- game API and live feature endpoints are healthy
- logs and restarts are monitored
- backups are scheduled for the database
