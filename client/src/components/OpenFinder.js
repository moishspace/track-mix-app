// components/OpenFinder.jsx
import React from "react";
import { toast } from "react-toastify";

export default function OpenFinder({ folderPath }) {
  const handleOpen = () => {
    // Check for empty, undefined, or whitespace-only folder path
    if (!folderPath || folderPath.trim() === "") {
      toast.warning("⚠️ No folder path provided.", {
        position: "top-center",
        autoClose: 3000,
        theme: "dark",
      });
      return;
    }

    // If running in Electron
    if (window?.electronAPI?.openFolder) {
      window.electronAPI.openFolder(folderPath);
    } else {
      toast.error(
        "❌ Cannot open folder. This feature is only available in the desktop app.",
        {
          position: "top-center",
          autoClose: 4000,
          theme: "dark",
        }
      );
    }
  };

  return <button className="fas fa-folder" onClick={handleOpen} />;
}
