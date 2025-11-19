import React from "react";

function FolderPicker({
  folderPath,
  setFolderPath,
  title = "Audio Folder Path",
  setTracks = null,
  defaultFadeIn = 30000,
  defaultFadeOut = 30000,
  defaultEntrance = 0,
  defaultExit = 30000,
}) {
  const handleBrowse = async () => {
    if (!window.electronAPI?.pickFolder) {
      alert("This feature is only available in the Electron app.");
      return;
    }

    const result = await window.electronAPI.pickFolder();

    if (setTracks === null && result) {
      setFolderPath(result.folderPath);
      return;
    }

    if (!result || result.length === 0) {
      alert("No files were found in the selected folder.");
      return;
    }

    const getDuration = async (filePath) => {
      return new Promise((resolve) => {
        const blobUrl = window.electronAPI.getBlobUrlFromFile(filePath);

        if (!blobUrl) {
          console.warn(`[ERROR] Could not generate blob URL for ${filePath}`);
          return resolve(null);
        }

        const audio = new Audio(blobUrl);

        audio.onloadedmetadata = () => {
          resolve(Math.round(audio.duration));
        };

        audio.onerror = (e) => {
          console.warn(`[AUDIO] Error loading audio ${filePath}`, e);
          resolve(null);
        };
      });
    };

    const tracks = await Promise.all(
      result.files.map(async (file, index) => {
        const duration = await getDuration(file.fullPath);

        return {
          id: index + 1,
          selected: true,
          name: file.fileName,
          bpm: "",
          key: "",
          length: duration
            ? `${Math.floor(duration / 60)}:${(duration % 60)
                .toString()
                .padStart(2, "0")}`
            : "-",
          trackLength: duration ? duration * 1000 : null, // Add trackLength in milliseconds
          fadeIn: defaultFadeIn,
          fadeOut: defaultFadeOut,
          entrance: defaultEntrance,
          exit: defaultExit,
        };
      })
    );

    setTracks(tracks);
    setFolderPath(result.folderPath);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <label
        style={{
          marginBottom: "6px",
          color: "#f7f7f7",
          fontWeight: "bold",
          fontSize: "1rem",
        }}
      >
        {title}
      </label>

      {/* Outer wrapper with white border */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "10px",
          overflow: "hidden",
          height: "36px",
        }}
      >
        <input
          type="text"
          value={folderPath}
          readOnly
          style={{
            padding: "10px",
            backgroundColor: "#1e1e2f",
            color: "#fff",
            width: "300px",
            fontSize: "0.8rem",
            border: "none",
            outline: "none",
          }}
        />
        <button
          onClick={handleBrowse}
          style={{
            backgroundColor: "#aba30f",
            border: "none",
            padding: "0 20px",
            cursor: "pointer",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.3s ease",
          }}
        >
          <i
            className="fas fa-folder"
            style={{ color: "white", fontSize: "18px" }}
          ></i>
        </button>
      </div>
    </div>
  );
}

export default FolderPicker;
