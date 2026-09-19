#!/bin/bash
cd "$(dirname "$0")/platform/apps/api"
nohup node dist/main.js > /tmp/api.log 2>&1 &
echo "API started on port 4002"
disown
sleep 2
echo "Verifying..."
curl -s http://localhost:4002/api/v1/health

