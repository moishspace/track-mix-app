# TrackMix - Build & Distribution Guide

This guide explains how to build the TrackMix app for macOS and how to continue using the development workflow.

## 🎯 Two Ways to Run TrackMix

### Option 1: Development Mode (Individual Components)
Perfect for development and testing changes quickly.

```bash
# Terminal 1: Start both backend & React dev server
./start-app.sh

# Terminal 2: Start Electron
./start-electron.sh
```

In development mode:
- Backend runs on port 3001
- React dev server runs on port 8000
- Electron loads from port 8000
- Hot reload enabled for React
- You can see live code changes without rebuilding

### Option 2: Packaged App (Production)
A standalone `.app` file that runs everything automatically.

```bash
# Just double-click TrackMix.app
# or
open dist/mac/TrackMix.app
```

In production mode:
- Electron auto-starts the backend server
- Backend serves the built React app on port 3001
- Everything runs from a single .app file
- No manual setup needed

---

## 🏗️ Building the App

### Quick Build (Recommended)

```bash
./build-app.sh
```

This script will:
1. Build the React frontend (`npm run build` in client/)
2. Install production server dependencies
3. Package everything into a Mac app

The build outputs to the `dist` folder:
- **TrackMix.app** - The application (can be copied to /Applications)
- **TrackMix.dmg** - Installer for distribution
- **TrackMix-{version}-mac.zip** - Compressed app

### Manual Build Steps

If you prefer to build manually:

```bash
# 1. Build React frontend
cd client
npm run build
cd ..

# 2. Install server dependencies (production)
cd server
npm install --production
cd ..

# 3. Package the app
npm run build:mac
```

---

## 🔄 Development Workflow

When you update your code:

1. **Make changes** to your code
2. **Test in development mode** (see changes live):
   ```bash
   ./start-app.sh      # Terminal 1: Backend + React (with hot reload)
   ./start-electron.sh # Terminal 2: Electron window
   ```
3. **When ready to package**, rebuild:
   ```bash
   ./build-app.sh
   ```
   Or simply:
   ```bash
   npm run build
   ```
4. **Test the packaged app**:
   ```bash
   open dist/mac/TrackMix.app
   ```

---

## 📦 What Gets Packaged

The packaged app includes:

```
TrackMix.app/
├── Contents/
│   ├── MacOS/
│   │   └── TrackMix (Electron executable)
│   ├── Resources/
│   │   ├── app.asar (main.js, preload.js)
│   │   ├── server/ (Backend server + node_modules + .env)
│   │   └── client/build/ (Built React app)
```

**How it works:**
- When you launch TrackMix.app, Electron starts
- Electron automatically starts the Node.js backend from `Resources/server/app.js`
- Backend serves the React app from `Resources/client/build/`
- Everything runs on port 3001
- When you quit, the backend shuts down automatically

---

## 🚀 Distribution

### For yourself
Just copy `TrackMix.app` to your `/Applications` folder:
```bash
cp -r dist/mac/TrackMix.app /Applications/
```

### For others
Share the `.dmg` file:
```bash
# The DMG is in dist/
# Users can download it, open it, and drag TrackMix to Applications
```

⚠️ **Note:** macOS may show a security warning for unsigned apps. Users need to:
1. Right-click the app → "Open"
2. Click "Open" in the security dialog

---

## 🔧 Troubleshooting

### Build fails with "command not found"
Make sure you have all dependencies installed:
```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### Packaged app won't start
Check if port 3001 is available:
```bash
lsof -i :3001
# If something is using it, kill that process or change the PORT in server/.env
```

### Development mode not working
Make sure all servers are running:
1. Start backend & React: `./start-app.sh` (should see "Server is running on http://localhost:3001" and webpack compiled)
2. Start Electron: `./start-electron.sh` (window should open)

### Need to rebuild after code changes
Always rebuild when you make changes:
```bash
./build-app.sh
```

The app doesn't auto-update - you need to rebuild and replace the old version.

---

## 📋 Build Configuration

The build is configured in [package.json](package.json):

- **appId**: `com.trackmix.app`
- **Product Name**: `TrackMix`
- **Output**: `dist/` folder
- **Targets**: DMG, ZIP for x64 and arm64 (Apple Silicon)

---

## 🎨 Adding a Custom App Icon

Currently, your app shows the default Electron icon. To add your own:

### Quick Method (Using the Script)

```bash
# If you have an image file (PNG, JPG, etc.)
./create-icon.sh path/to/your-icon.png

# Then rebuild
./build-app.sh
```

### What This Does
1. Converts your image to all required macOS icon sizes
2. Creates `assets/icon.icns`
3. The build automatically uses it

### Manual Method

See [CREATE-ICON.md](CREATE-ICON.md) for detailed instructions on:
- Using macOS's built-in `iconutil` command
- Converting icons online
- Icon design best practices

---

## 🎵 Happy Mixing!

You now have:
- ✅ Development mode for quick testing
- ✅ Production build for a polished app
- ✅ Simple rebuild workflow with `./build-app.sh`

Questions? Check the main README or create an issue.
