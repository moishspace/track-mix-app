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
});