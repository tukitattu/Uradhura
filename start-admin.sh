#!/bin/bash
cd "$(dirname "$0")/platform/apps/admin"
nohup npx next dev -p 3001 > /tmp/admin.log 2>&1 &
echo "Admin panel starting on port 3001"
disown
sleep 8
echo "Verifying..."
curl -s http://localhost:3001