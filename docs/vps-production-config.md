# VPS Production Deployment Config

## Purpose
This branch is reserved for the live production deployment on a VPS.

## Server requirements
- Ubuntu 22.04+
- Node.js 20+
- Nginx
- PM2
- PostgreSQL or SQLite-compatible persistent database
- Domain + HTTPS
- Monthly storage + backup plan

## Recommended folder layout
```bash
/home/uradhura
  ├── app
  │   └── gaming-platform
  ├── releases
  ├── logs
  └── .env.production
```

## Environment values
```env
NODE_ENV=production
JWT_SECRET=replace_with_secure_secret
DATABASE_URL=file:./prisma/dev.db
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
PORT=4000
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## PM2 process commands
```bash
pm2 start "cd /home/uradhura/app/gaming-platform/backend && npm run start" --name uradhura-backend
pm2 start "cd /home/uradhura/app/gaming-platform/frontend && npm run start" --name uradhura-frontend
pm2 save
```

## Nginx sample config
```nginx
server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name yourdomain.com www.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## API backend proxy
```nginx
server {
  listen 443 ssl;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Production checklist
- HTTPS and domain configured
- `NEXT_PUBLIC_API_URL` points to the production API
- database is persistent and backed up
- admin only routes are protected
- logs are monitored
- failover and restart process is documented
