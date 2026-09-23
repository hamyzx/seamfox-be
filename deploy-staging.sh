#!/bin/bash
set -e

echo "🚀 Starting Deployment for Seamfox API..."

APP_DIR="/home/ubuntu/seamfox-be-staging"
cd "$APP_DIR"

# Ensure Node exists
node -v
npm -v

# Safety check — build must already exist
if [ ! -f "dist/main.js" ]; then
  echo "❌ Build output missing (dist/main.js). Aborting deploy."
  exit 1
fi

echo "♻️ Reloading PM2 process..."
pm2 reload seamfox-be-staging --update-env || pm2 start dist/main.js --name "seamfox-be-staging"

pm2 save

echo "🎉 Deployment Complete!"
pm2 status seamfox-be-staging
