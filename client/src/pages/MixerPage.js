import React, { useState, useEffect } from "react";
import "../styles/DataGridStyles.css";
import "../styles/Mixer.css";
import "../index.css";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FolderPicker from "../components/FolderPicker";
import FadeControls from "../components/FadeControls";
import FileList from "../components/FileList";
import MixerTrackTable from "../components/MixerTrackTable";
import OpenFinder from "../components/OpenFinder";
import { startMix, analyzeTracks } from "../services/api";

export default function MixerPage() {
  const [folderPath, setFolderPath] = useState("./wav");
  const [outFolderPath, setOutFolderPath] = useState("");
  const [defaultFadeIn, setDefaultFadeIn] = useState(30000);
  const [defaultFadeOut, setDefaultFadeOut] = useState(30000);
  const [defaultEntrance, setDefaultEntrance] = useState(30000);
  const [tracks, setTracks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [analysisMode, setAnalysisMode] = useState("manual");
  const [mixingMode, setMixingMode] = useState("transition"); // "transition" or "overlap"

  // Convert milliseconds to MM:SS format
  const msToMMSS = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Convert MM:SS format to milliseconds
  const mmssToMs = (mmss) => {
    const parts = mmss.split(":");
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return (minutes * 60 + seconds) * 1000;
  };

  const handleAnalyze = async () => {
    if (selectedIds.length === 0) {
      toast.warning("⚠️ No tracks selected to analyze.");
      return;
    }

    const toastId = toast.loading("🔬 Analyzing tracks...");

    try {
      const selectedTracks = tracks.filter((_, i) => selectedIds.includes(i));

      const result = await analyzeTracks({
        folderPath,
        tracks: selectedTracks,
        analysisMode,
      });

      if (result.success && result.results) {
        // Update tracks with analyzed values - ONLY update the suggestion columns, NOT the editable values
        const updatedTracks = [...tracks];
        result.results.forEach((analyzed) => {
          const trackIndex = tracks.findIndex((t) => t.name === analyzed.name);
          if (trackIndex !== -1) {
            updatedTracks[trackIndex] = {
              ...updatedTracks[trackIndex],
              // Only store in analyzed fields for display in suggestion columns
              // Do NOT update fadeIn, fadeOut, entrance - those are user-controlled
              analyzedFadeIn: analyzed.analysis.suggested_fade_in,
              analyzedFadeOut: analyzed.analysis.suggested_fade_out,
              analyzedEntrance: analyzed.analysis.suggested_entrance,
              // Add waveform visualization data
              waveformData: analyzed.analysis.waveform_data,
              phraseBoundaries: analyzed.analysis.phrase_boundaries,
              trackLength: analyzed.analysis.track_length,
              // Add BPM and key data
              bpm: analyzed.analysis.bpm,
              key: analyzed.analysis.key,
              camelotKey: analyzed.analysis.camelot_key,
            };
          }
        });
        setTracks(updatedTracks);

        toast.update(toastId, {
          render: "✅ Analysis complete! Parameters updated.",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.update(toastId, {
        render: `❌ Analysis failed: ${error.message || "Unknown error"}`,
        type: "error",
        isLoading: false,
        autoClose: 6000,
      });
    }
  };

  const handleStartMix = async () => {
    // 1️⃣ Filter and prepare selected tracks
    const selectedTracks = tracks
      .filter((_, i) => selectedIds.includes(i))
      .map((track) => ({
        ...track,
        fadeIn: track.fadeIn || defaultFadeIn,
        fadeOut: track.fadeOut || defaultFadeOut,
      }));

    if (selectedTracks.length === 0) {
      toast.warning("⚠️ No tracks selected to mix.");
      return;
    }

    // 2️⃣ Notify start
    const toastId = toast.loading("🎧 Starting mix process...");

    try {
      const result = await startMix({
        folderPath,
        outFolderPath,
        defaultFadeIn,
        defaultFadeOut,
        defaultEntrance,
        mixingMode,
        tracks: tracks
          .filter((_, i) => selectedIds.includes(i))
          .map((track) => ({
            ...track,
            fadeIn: track.fadeIn || defaultFadeIn,
            fadeOut: track.fadeOut || defaultFadeOut,
            entrance: track.entrance || defaultEntrance,
          })),
      });

      // 3️⃣ Success
      toast.update(toastId, {
        render: result.message || "✅ Mixing complete!",
        type: "success",
        isLoading: false,
        autoClose: 4000,
      });
    } catch (error) {
      // 4️⃣ Error
      console.error("Mixing failed:", error);
      toast.update(toastId, {
        render: `❌ Mix failed: ${error.message || "Unknown error"}`,
        type: "error",
        isLoading: false,
        autoClose: 6000,
      });
    }
  };

  return (
    <div className="mixer-page">
      <div className="form-box">
        <h1 className="form-title">🎛️ Track Mixer</h1>

        <div className="form-fields">
          <div className="form-group">
            <FolderPicker
              folderPath={folderPath}
              setFolderPath={setFolderPath}
              setTracks={setTracks}
            />
          </div>
          <div className="form-group">
            <FolderPicker
              folderPath={outFolderPath}
              setFolderPath={setOutFolderPath}
              title="Export to Folder"
            />
          </div>
          <div className="form-group">
            <label>Default Fade In</label>
            <input
              type="text"
              value={msToMMSS(defaultFadeIn)}
              onChange={(e) => setDefaultFadeIn(mmssToMs(e.target.value))}
              placeholder="MM:SS"
            />
          </div>
          <div className="form-group">
            <label>Default Fade Out</label>
            <input
              type="text"
              value={msToMMSS(defaultFadeOut)}
              onChange={(e) => setDefaultFadeOut(mmssToMs(e.target.value))}
              placeholder="MM:SS"
            />
          </div>
          <div className="form-group">
            <label>Default Entrance</label>
            <input
              type="text"
              value={msToMMSS(defaultEntrance)}
              onChange={(e) => setDefaultEntrance(mmssToMs(e.target.value))}
              placeholder="MM:SS"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div
            className="analysis-section"
            style={{ flex: "1", minWidth: "300px" }}
          >
            <h3 className="analysis-section-title">Track Analysis</h3>
            <div className="analysis-controls">
              <div className="form-group">
                <label>Analysis Mode</label>
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value)}
                >
                  <option value="manual">Manual (Loudness-based)</option>
                  <option value="dance">Dance/Electronic (Beat-aligned)</option>
                  <option value="ambient">
                    Ambient/Meditation (Phrase-based)
                  </option>
                  <option value="pop">Pop/Rock (Hybrid)</option>
                  <option value="classical">Classical/Orchestral</option>
                </select>
              </div>
              <button className="action-button" onClick={handleAnalyze}>
                Analyze Tracks
              </button>
            </div>
          </div>

          <div
            className="analysis-section"
            style={{ flex: "1", minWidth: "300px" }}
          >
            <h3 className="analysis-section-title">Mixing Settings</h3>
            <div className="analysis-controls">
              <div className="form-group">
                <label>Mixing Mode</label>
                <select
                  value={mixingMode}
                  onChange={(e) => setMixingMode(e.target.value)}
                >
                  <option value="transition">
                    Transition Mode (Entrance = Fade Start)
                  </option>
                  <option value="overlap">
                    Overlap Mode (Full Entrance Duration)
                  </option>
                </select>
              </div>
              {/* <div className="form-group" style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                <strong>Transition Mode:</strong> T2 starts at entrance point, T1 fade-out begins at same moment.<br/>
                <strong>Overlap Mode:</strong> T2 starts entrance duration before end, with full overlap.
              </div> */}
            </div>
          </div>
        </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: "1rem",
          gap: "8px",
        }}
      >
        <button
          className="open-finder-button"
          title="Open Output Folder"
          onClick={() => window.electronAPI?.openFolder?.(outFolderPath)}
        >
          📂
        </button>

        <button
          className="action-button start-mix-button"
          onClick={handleStartMix}
        >
          Start Mixing
        </button>
      </div>
      </div>
      <div className="table-box">
        <MixerTrackTable
          tracks={tracks}
          setTracks={setTracks}
          defaultFadeIn={defaultFadeIn}
          defaultFadeOut={defaultFadeOut}
          defaultEntrance={defaultEntrance}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
        />
      </div>
    </div>
  );
}
