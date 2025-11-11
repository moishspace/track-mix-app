#!/bin/bash

set -e

PROJECT_DIR="/Users/moish/DEV/Track Mix/track-mix-app"
cd "$PROJECT_DIR" || {
  echo "❌ Failed to cd into project directory"
  exit 1
}

# 1. Conda + NVM
echo "💻 Activating environments..."
if command -v conda >/dev/null 2>&1; then
  eval "$(conda shell.bash hook)"
  conda activate py310_env
else
  echo "⚠️ Conda not found. Skipping Python env activation."
fi

if command -v nvm >/dev/null 2>&1; then
  nvm use 20
else
  echo "⚠️ nvm not found. Skipping Node version switch."
fi

# Start Electron app
echo "⚡ Launching Electron app..."
npx electron .