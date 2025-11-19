// // preload.js
// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   pickFolder: async () => {
//     const result = await ipcRenderer.invoke('select-folder');
//     // Always return a consistent shape
//     return result || { files: [], folderPath: '' };
//   },
// });


const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");

contextBridge.exposeInMainWorld("electronAPI", {
  pickFolder: async () => {
    const result = await ipcRenderer.invoke("select-folder");
    return result || { files: [], folderPath: '' };
  },

  getBlobUrlFromFile: (filePath) => {
    try {
      const buffer = fs.readFileSync(filePath); // read file from disk
      const blob = new Blob([buffer], { type: "audio/flac" }); // or audio/mpeg
      return URL.createObjectURL(blob); // create usable blob URL
    } catch (err) {
      console.error("❌ Failed to read file:", err);
      return null;
    }
  },

  openFolder: (folderPath) => {
    ipcRenderer.send("open-folder", folderPath);
  },

  // File operations for save/load settings
  saveSettingsFile: (filePath, data) => {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      console.error("❌ Failed to save settings file:", err);
      return { success: false, error: err.message };
    }
  },

  loadSettingsFile: (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: "File does not exist" };
      }
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, data: JSON.parse(data) };
    } catch (err) {
      console.error("❌ Failed to load settings file:", err);
      return { success: false, error: err.message };
    }
  },

  checkFileExists: (filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch (err) {
      console.error("❌ Failed to check file existence:", err);
      return false;
    }
  },
});