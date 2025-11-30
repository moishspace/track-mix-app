const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, protocol } = require("electron");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const waitPort = require("wait-port");

let serverProcess = null;

// Find Node.js executable on the system
function findNodeExecutable() {
  // Common Node.js locations on macOS
  const commonPaths = [
    '/usr/local/bin/node',        // Homebrew Intel
    '/opt/homebrew/bin/node',     // Homebrew Apple Silicon
    '/usr/bin/node',              // System node
  ];

  // Check common paths first
  for (const nodePath of commonPaths) {
    if (fs.existsSync(nodePath)) {
      console.log(`Found Node.js at: ${nodePath}`);
      return nodePath;
    }
  }

  // Try to find node using 'which' command
  try {
    const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    if (nodePath && fs.existsSync(nodePath)) {
      console.log(`Found Node.js via 'which': ${nodePath}`);
      return nodePath;
    }
  } catch (err) {
    console.warn("Could not find node via 'which'");
  }

  // If all else fails, return 'node' and hope it's in PATH
  console.warn("Node.js not found in common locations, using 'node' from PATH");
  return 'node';
}

// Start the Node.js backend server (only when packaged)
function startBackend() {
  const isDev = !app.isPackaged;

  if (isDev) {
    console.log("Development mode: Skipping backend auto-start. Use port 8000.");
    return;
  }

  const serverPath = path.join(process.resourcesPath, "server", "app.js");
  const serverDir = path.join(process.resourcesPath, "server");
  const nodeExecutable = findNodeExecutable();

  console.log("Starting backend server...");
  console.log("Node executable:", nodeExecutable);
  console.log("Server path:", serverPath);
  console.log("Server dir:", serverDir);

  serverProcess = spawn(nodeExecutable, [serverPath], {
    cwd: serverDir,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" }
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start backend:", err);
    dialog.showErrorBox(
      "Backend Error",
      `Failed to start server: ${err.message}\n\nNode.js may not be installed. Please install Node.js from https://nodejs.org/`
    );
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend exited with code ${code}`);
    }
  });
}

async function createWindow() {
  const isDev = !app.isPackaged;

  // Only wait for backend if packaged
  if (!isDev) {
    console.log("Waiting for backend on port 3001...");
    try {
      await waitPort({
        host: "localhost",
        port: 3001,
        timeout: 15000,
        output: "silent"
      });
      console.log("Backend is ready!");
    } catch (err) {
      console.error("Backend failed to start:", err);
      dialog.showErrorBox(
        "Startup Error",
        "Failed to start the backend server. Please check if port 3001 is available."
      );
      app.quit();
      return;
    }
  }

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

  // Load from port 3001 when packaged, port 8000 when in development
  const appUrl = isDev ? "http://localhost:8000" : "http://localhost:3001";
  console.log(`Loading app from: ${appUrl}`);
  win.loadURL(appUrl);

  // Open DevTools for debugging
  // if (!app.isPackaged) {
  //   win.webContents.openDevTools({ mode: "detach" });
  // }
}

// Register custom protocol for serving local audio files
function registerLocalAudioProtocol() {
  protocol.registerFileProtocol('local-audio', (request, callback) => {
    // Remove the protocol prefix to get the actual file path
    const filePath = decodeURIComponent(request.url.replace('local-audio://', ''));

    // Security: ensure the path is absolute and exists
    if (!path.isAbsolute(filePath)) {
      console.error('Rejected relative path:', filePath);
      callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      callback({ error: -6 });
      return;
    }

    // Serve the file
    callback({ path: filePath });
  });
}

// === Handle folder picking and .wav file listing ===
ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { files: [], folderPath: '' };
  }

  const folderPath = result.filePaths[0];
  const fs = require("fs");
  const path = require("path");

  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(wav|mp3|flac)$/i.test(f))
    .map(f => ({
      fileName: f,
      fullPath: path.join(folderPath, f)
    }));

  return { files, folderPath };
});

ipcMain.on("open-folder", (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath);
  } else {
    console.warn("⚠️ Folder path does not exist:", folderPath);
  }
});

// === Electron app lifecycle ===
app.whenReady().then(() => {
  // Register custom protocol for audio files before creating window
  registerLocalAudioProtocol();

  // Start backend server (only when packaged)
  startBackend();

  // Create window (will wait for backend if packaged)
  createWindow();

  globalShortcut.register("CommandOrControl+Shift+I", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.toggleDevTools();
    }
  });

  // macOS specific: reopen window when clicking the app icon
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (except macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Clean up backend server when app quits
app.on("will-quit", () => {
  if (serverProcess) {
    console.log("Shutting down backend server...");
    serverProcess.kill();
  }
});
