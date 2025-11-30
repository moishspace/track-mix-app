#!/bin/bash

# TrackMix Build Script
# This script builds the React frontend and packages the Electron app

set -e  # Exit on error

echo "🎵 TrackMix App Builder"
echo "======================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build React frontend
echo -e "${BLUE}Step 1/3: Building React frontend...${NC}"
cd client
npm run build
cd ..
echo -e "${GREEN}✓ React build completed${NC}"
echo ""

# Step 2: Check server dependencies
echo -e "${BLUE}Step 2/3: Checking server dependencies...${NC}"
cd server
if [ ! -d "node_modules" ]; then
  echo "Installing server dependencies..."
  npm install --production
else
  echo "Server dependencies already installed (skipping)"
fi
cd ..
echo -e "${GREEN}✓ Server dependencies ready${NC}"
echo ""

# Step 3: Package the Electron app
echo -e "${BLUE}Step 3/4: Packaging Electron app...${NC}"
npx electron-builder --mac --dir
echo -e "${GREEN}✓ Initial packaging complete${NC}"
echo ""

# Step 4: Copy server node_modules to packaged apps
echo -e "${BLUE}Step 4/4: Copying server dependencies to packaged apps...${NC}"
for app_path in "dist/mac/TrackMix.app" "dist/mac-arm64/TrackMix.app"; do
  if [ -d "$app_path/Contents/Resources/server" ]; then
    echo "  Copying to $app_path..."
    cp -R server/node_modules "$app_path/Contents/Resources/server/"
  fi
done
echo -e "${GREEN}✓ Dependencies copied${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your app is ready in the 'dist' folder:"
echo "  - TrackMix.app (ready to use)"
echo "  - TrackMix.dmg (installer for distribution)"
echo ""
echo "To test the app:"
echo "  1. Open: dist/mac/TrackMix.app"
echo "  2. Or install from: dist/TrackMix.dmg"
echo ""
