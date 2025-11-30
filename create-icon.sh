#!/bin/bash

# TrackMix Icon Creator
# Converts a source image to macOS .icns format

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🎨 TrackMix Icon Creator${NC}"
echo "========================"
echo ""

# Check for source image argument
if [ -z "$1" ]; then
  echo -e "${RED}Error: No source image provided${NC}"
  echo ""
  echo "Usage:"
  echo "  ./create-icon.sh <image-file>"
  echo ""
  echo "Example:"
  echo "  ./create-icon.sh my-logo.png"
  echo "  ./create-icon.sh ~/Downloads/icon.jpg"
  echo ""
  exit 1
fi

SOURCE_IMAGE="$1"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
  echo -e "${RED}Error: File not found: $SOURCE_IMAGE${NC}"
  exit 1
fi

echo -e "${BLUE}Source image: $SOURCE_IMAGE${NC}"
echo ""

# Create assets directory if it doesn't exist
mkdir -p assets

# Create temporary iconset directory
ICONSET_DIR="icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir "$ICONSET_DIR"

echo -e "${BLUE}Creating icon sizes...${NC}"

# Generate all required icon sizes
sips -z 16 16     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16.png" > /dev/null 2>&1
sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16@2x.png" > /dev/null 2>&1
sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32.png" > /dev/null 2>&1
sips -z 64 64     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32@2x.png" > /dev/null 2>&1
sips -z 128 128   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128.png" > /dev/null 2>&1
sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128@2x.png" > /dev/null 2>&1
sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256.png" > /dev/null 2>&1
sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256@2x.png" > /dev/null 2>&1
sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512.png" > /dev/null 2>&1
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512@2x.png" > /dev/null 2>&1

echo -e "${GREEN}✓ All sizes created${NC}"

# Convert to icns
echo -e "${BLUE}Converting to .icns format...${NC}"
iconutil -c icns "$ICONSET_DIR" -o assets/icon.icns

echo -e "${GREEN}✓ Icon created: assets/icon.icns${NC}"

# Clean up
rm -rf "$ICONSET_DIR"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Icon created successfully! 🎉${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Preview the icon: open assets/icon.icns"
echo "  2. Rebuild your app: ./build-app.sh"
echo "  3. Check the new icon: open dist/mac/TrackMix.app"
echo ""
