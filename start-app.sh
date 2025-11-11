#!/bin/bash

cd "/Users/moish/DEV/Track Mix/track-mix-app" || {
  echo "❌ Failed to cd into project directory"
  exit 1
}

# ⏱ Optional environment setup
echo "🐍 Activating conda env: py310_env"
if command -v conda >/dev/null 2>&1; then
  eval "$(conda shell.bash hook)"
  conda activate py310_env
else
  echo "⚠️ Conda not found. Skipping Python env activation."
fi

# Optional NVM
echo "🧠 Activating Node.js 20 (nvm)..."
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 20
else
  echo "⚠️ NVM not found. Skipping Node version setup."
fi

# Ensure logs folder exists
mkdir -p logs

# 2. Start React frontend
echo "🔧 Starting React frontend..."
cd client
npm start > ../logs/client.log 2>&1 &
cd ..

# 1. Start Node.js backend
echo "🧠 Starting Node.js backend..."
cd server
npm start
# npm start > ../logs/backend.log 2>&1 &


echo "🚀 All apps launched."