#\!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/uradhura/app"
REPO_DIR="/home/uradhura/repo"

if [ \! -d "$REPO_DIR" ]; then
  echo "Repository path not found: $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR"

# Pull latest release branch or repo state
# git pull origin production/vps-live

cp -R ./gaming-platform "$APP_DIR/"

cd "$APP_DIR/gaming-platform/backend"
npm install --production
npm run build

cd "$APP_DIR/gaming-platform/frontend"
npm install --production
npm run build

pm2 reload all || pm2 start deployment/pm2.config.js

echo "Deployment script is ready for VPS execution."
