#!/bin/bash
set -e

# 🌍 Detect environment based on app directory location
if [ -d "/home/ubuntu/apps/seamfox-be" ] && [ "$(pwd)" = "/home/ubuntu/apps/seamfox-be" ]; then
  ENVIRONMENT="production"
  APP_DIR="/home/ubuntu/apps/seamfox-be"
  PM2_NAME="seamfox-backend"
else
  ENVIRONMENT="staging"
  APP_DIR="/home/ubuntu/seamfox-be"
  PM2_NAME="seamfox-be"
  
  # 🔑 Load NVM for staging environment only
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  
  echo "🟢 Switching to Node 24..."
  nvm use 24 || nvm install 24
fi

echo "🚀 Starting Deployment for Seamfox API ($ENVIRONMENT)..."
echo "📂 App Directory: $APP_DIR"
echo "🏷️  PM2 Process: $PM2_NAME"

cd "$APP_DIR"

# 🛑 Safety check — build must already exist (workflow already builds it)
if [ ! -f "dist/main.js" ]; then
  echo "❌ Build output missing (dist/main.js). Aborting deploy."
  exit 1
fi

echo "♻️ Reloading PM2 process..."
pm2 reload $PM2_NAME --update-env || pm2 start dist/main.js --name "$PM2_NAME"

pm2 save

echo "🎉 Deployment Complete!"
pm2 status $PM2_NAME
