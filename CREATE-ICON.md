# Creating a Custom App Icon for TrackMix

Your app currently shows the default Electron icon. Here's how to add a custom icon.

## What You Need

A square image (preferably 1024x1024 pixels) in PNG or JPG format.

**Icon Design Tips:**
- Use a square image (1:1 ratio)
- Recommended size: 1024x1024 pixels minimum
- Keep it simple - small details get lost at small sizes
- Use a transparent background (PNG) for best results

---

## Method 1: Using iconutil (Built into macOS) ⭐ Recommended

This uses macOS's built-in tool to create a high-quality .icns file.

### Step 1: Prepare Your Image

Make sure you have a PNG file (let's call it `icon.png`) that's 1024x1024 pixels.

### Step 2: Create Icon Set

```bash
# Navigate to your project
cd "/Users/moish/DEV/Track Mix/track-mix-app"

# Create iconset folder
mkdir icon.iconset

# Use sips to create all required sizes
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
```

### Step 3: Convert to .icns

```bash
# Convert iconset to icns
iconutil -c icns icon.iconset -o assets/icon.icns

# Clean up the iconset folder
rm -rf icon.iconset
```

Done! Your icon is now at `assets/icon.icns`

---

## Method 2: Online Converter (Easiest)

If you just want to quickly convert an image:

1. Go to: https://cloudconvert.com/png-to-icns
2. Upload your icon image (PNG or JPG)
3. Download the converted `.icns` file
4. Save it as `assets/icon.icns` in your project

---

## Method 3: Using a Script (Automated)

I can create a script that converts any image to the icon format:

```bash
# Save your image as icon-source.png in the project root
# Then run:
./create-icon.sh icon-source.png
```

Would you like me to create this script for you?

---

## After Adding the Icon

Once you have `assets/icon.icns`:

1. **Rebuild the app:**
   ```bash
   ./build-app.sh
   ```

2. **Check the new icon:**
   ```bash
   open dist/mac/TrackMix.app
   ```

The icon will appear:
- In the Dock when the app is running
- In the Applications folder
- In the DMG installer
- When viewing the app in Finder

---

## Testing the Icon

After rebuilding:

```bash
# Open the dist folder in Finder
open dist/

# You should see TrackMix.dmg and the mac folder with your custom icon
```

---

## Troubleshooting

### Icon still shows Electron logo
- Make sure the file is named exactly `icon.icns` in the `assets/` folder
- Rebuild the app with `./build-app.sh`
- Try clearing the icon cache:
  ```bash
  rm -rf dist/
  ./build-app.sh
  ```

### Icon looks blurry
- Use a higher resolution source image (1024x1024 minimum)
- Make sure your PNG has a transparent background
- Recreate the .icns file from a higher quality source

---

## Quick Start (If You Have a PNG)

If you already have `icon.png` in your project root:

```bash
cd "/Users/moish/DEV/Track Mix/track-mix-app"

# Create all sizes and convert to .icns
mkdir icon.iconset
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o assets/icon.icns
rm -rf icon.iconset

# Rebuild the app
./build-app.sh
```

Done!
