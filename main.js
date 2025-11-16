const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
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

  // Load your React app
  win.loadURL("http://localhost:8000"); // use loadFile() for production build

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
