# Building TrackMix as a Mac App

## Important Note

**PyInstaller is for Python apps!** This is an Electron/Node.js app, so we use **electron-builder** to create Mac `.app` bundles.

## Prerequisites

Your app currently runs with:
- React frontend on `localhost:8000`
- Node.js backend on `localhost:3001`
- Electron wrapper loads from localhost

For a packaged Mac app, this won't work. You have two options:

### Option 1: Simple Build (Current Setup)
Build the app as-is and manually start the backend before launching the app.

### Option 2: Full Standalone App (Recommended)
Bundle everything into a single `.app` that starts the backend automatically.

---

## Option 1: Simple Build (Quick)

This builds the Electron wrapper only. You'll need to start the backend manually.

### Steps:

1. **Build the React frontend:**
   ```bash
   cd client
   npm run build
   cd ..
   ```

2. **Build the Mac app:**
   ```bash
   npm run build:mac
   ```

3. **Find your app:**
   - Location: `dist/TrackMix.app`
   - You can drag it to `/Applications`

4. **To run it:**
   - First, start the backend: `cd server && npm start`
   - Then open the TrackMix app

**Pros:** Quick and easy
**Cons:** Requires manual backend startup

---

## Option 2: Standalone App (Recommended)

This bundles EVERYTHING including the Node.js backend into a single `.app`.

### Modifications Needed:

#### 1. Update `main.js` to start the backend automatically:

Add this at the top of `main.js`:

```javascript
const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;

function startBackend() {
  const isDev = !app.isPackaged;

  if (isDev) {
    // Development: backend runs separately
    return;
  }

  // Production: start bundled backend
  const serverPath = path.join(process.resourcesPath, 'server', 'app.js');
  serverProcess = spawn('node', [serverPath], {
    cwd: path.join(process.resourcesPath, 'server'),
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
}

// Call this in app.whenReady()
app.whenReady().then(() => {
  startBackend();
  registerLocalAudioProtocol();
  createWindow();
  // ... rest of your code
});

// Clean up on quit
app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
```

#### 2. Wait for backend to be ready before loading UI:

```javascript
const waitPort = require('wait-port');

async function createWindow() {
  // Wait for backend to be ready
  await waitPort({
    host: 'localhost',
    port: 3001,
    timeout: 10000
  });

  const win = new BrowserWindow({
    width: 1600,
    height: 1200,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load from localhost (backend serves the React app)
  win.loadURL("http://localhost:3001");
}
```

#### 3. Install wait-port dependency:

```bash
npm install wait-port
```

#### 4. Build the app:

```bash
# Build React frontend first
cd client && npm run build && cd ..

# Build Mac app with backend bundled
npm run build:mac
```

Your app will be in `dist/TrackMix.app` and can be dragged to `/Applications`!

---

## Creating an App Icon (Optional)

1. Create a 1024x1024 PNG icon
2. Convert to `.icns` format:
   ```bash
   mkdir -p assets
   # Use an online converter or macOS tool to convert PNG -> ICNS
   # Place the .icns file at: assets/icon.icns
   ```

3. Rebuild:
   ```bash
   npm run build:mac
   ```

---

## Build Commands

- `npm run build:mac` - Build `.app` and `.zip` for both Intel and Apple Silicon
- `npm run build:mac:dmg` - Build DMG installer
- `npm run dist` - Build for all configured platforms

---

## Distributing Your App

### For yourself/testing:
- Use the `.app` file from `dist/TrackMix.app`
- Drag to `/Applications`

### For others:
- Use the `.dmg` installer from `dist/`
- Users double-click the DMG and drag the app to Applications

### Code Signing (for distribution):
If you want to distribute outside the App Store, you'll need:
1. Apple Developer account ($99/year)
2. Code signing certificate
3. Notarization

This prevents "App is damaged" warnings on other Macs.

---

## Troubleshooting

### "App is damaged" warning
This happens with unsigned apps. Options:
- Right-click app → Open (bypass once)
- Or: System Settings → Privacy & Security → Allow
- Or: Code sign the app properly

### Backend not starting
Check `Console.app` for error logs from your app.

### React app not loading
Make sure you built the React app first: `cd client && npm run build`

---

## Current Status

Your app is configured for **Option 1** (simple build). The backend needs to be started separately.

To upgrade to **Option 2** (recommended), follow the "Standalone App" instructions above.
