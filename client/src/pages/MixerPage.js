import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DataGridStyles.css";
import "../styles/Mixer.css";
import "../index.css";

import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FolderPicker from "../components/FolderPicker";
import FadeControls from "../components/FadeControls";
import FileList from "../components/FileList";
import MixerTrackTable from "../components/MixerTrackTable";
import MixerTrackPlayer from "../components/MixerTrackPlayer";
import OpenFinder from "../components/OpenFinder";
import { startMix, analyzeTracks } from "../services/api";

export default function MixerPage() {
  const navigate = useNavigate();
  const [folderPath, setFolderPath] = useState("./wav");
  const [outFolderPath, setOutFolderPath] = useState("");
  const [defaultFadeIn, setDefaultFadeIn] = useState(30000);
  const [defaultFadeOut, setDefaultFadeOut] = useState(30000);
  const [defaultEntrance, setDefaultEntrance] = useState(0);
  const [defaultExit, setDefaultExit] = useState(30000);
  const [tracks, setTracks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [analysisMode, setAnalysisMode] = useState("manual");
  const [mixingMode, setMixingMode] = useState("transition"); // "transition" or "overlap"
  const [previewTrack, setPreviewTrack] = useState(null); // Track currently being previewed
  const [settingsFileExists, setSettingsFileExists] = useState(false); // Track if settings file exists
  const [isFormCollapsed, setIsFormCollapsed] = useState(false); // Track if form section is collapsed

  // Get settings file path based on folder name
  const getSettingsFilePath = useCallback(() => {
    if (!folderPath) return null;
    // Extract folder name using string operations (avoid Node.js path module)
    const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop();
    const separator = folderPath.includes("\\") ? "\\" : "/";
    return `${folderPath}${separator}${folderName}_mix_settings.json`;
  }, [folderPath]);

  // Check if settings file exists when folder changes
  useEffect(() => {
    const checkSettings = () => {
      if (!folderPath) {
        setSettingsFileExists(false);
        return;
      }
      const settingsPath = getSettingsFilePath();
      if (settingsPath && window.electronAPI?.checkFileExists) {
        const exists = window.electronAPI.checkFileExists(settingsPath);
        setSettingsFileExists(exists);
      } else {
        setSettingsFileExists(false);
      }
    };
    checkSettings();
  }, [folderPath, getSettingsFilePath]);

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
              analyzedExit: analyzed.analysis.suggested_exit,

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

  const handleSaveSettings = () => {
    if (tracks.length === 0) {
      toast.warning("⚠️ No tracks to save settings for.");
      return;
    }

    const settingsPath = getSettingsFilePath();
    if (!settingsPath) {
      toast.error("❌ Invalid folder path");
      return;
    }

    const settingsData = {
      tracks: tracks.map((track) => ({
        name: track.name,
        fadeIn: track.fadeIn || defaultFadeIn,
        fadeOut: track.fadeOut || defaultFadeOut,
        entrance: track.entrance || defaultEntrance,
        exit: track.exit || defaultExit,
        // Include preview data only if it exists (analysis was run)
        ...(track.waveformData && {
          waveformData: track.waveformData,
          phraseBoundaries: track.phraseBoundaries,
          trackLength: track.trackLength,
          analyzedFadeIn: track.analyzedFadeIn,
          analyzedFadeOut: track.analyzedFadeOut,
          analyzedEntrance: track.analyzedEntrance,
          analyzedExit: track.analyzedExit,
          bpm: track.bpm,
          key: track.key,
          camelotKey: track.camelotKey,
        }),
      })),
    };

    const result = window.electronAPI.saveSettingsFile(
      settingsPath,
      settingsData
    );

    if (result.success) {
      toast.success("✅ Settings saved successfully!");
      setSettingsFileExists(true);
    } else {
      toast.error(`❌ Failed to save settings: ${result.error}`);
    }
  };

  const handleLoadSettings = () => {
    const settingsPath = getSettingsFilePath();
    if (!settingsPath) {
      toast.error("❌ Invalid folder path");
      return;
    }

    const result = window.electronAPI.loadSettingsFile(settingsPath);

    if (result.success && result.data) {
      const loadedSettings = result.data;

      // Update tracks with saved settings
      const updatedTracks = tracks.map((track) => {
        const savedTrack = loadedSettings.tracks.find(
          (t) => t.name === track.name
        );
        if (savedTrack) {
          return {
            ...track,
            fadeIn: savedTrack.fadeIn,
            fadeOut: savedTrack.fadeOut,
            entrance: savedTrack.entrance,
            exit: savedTrack.exit,
            // Restore preview data if it was saved
            ...(savedTrack.waveformData && {
              waveformData: savedTrack.waveformData,
              phraseBoundaries: savedTrack.phraseBoundaries,
              trackLength: savedTrack.trackLength,
              analyzedFadeIn: savedTrack.analyzedFadeIn,
              analyzedFadeOut: savedTrack.analyzedFadeOut,
              analyzedEntrance: savedTrack.analyzedEntrance,
              analyzedExit: savedTrack.analyzedExit,
              bpm: savedTrack.bpm,
              key: savedTrack.key,
              camelotKey: savedTrack.camelotKey,
            }),
          };
        }
        return track;
      });

      setTracks(updatedTracks);
      toast.success("✅ Settings loaded successfully!");
    } else {
      toast.error(
        `❌ Failed to load settings: ${result.error || "File not found"}`
      );
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
      const preparedTracks = tracks
        .filter((_, i) => selectedIds.includes(i))
        .map((track) => ({
          ...track,
          fadeIn: track.fadeIn || defaultFadeIn,
          fadeOut: track.fadeOut || defaultFadeOut,
          entrance: track.entrance || defaultEntrance,
          exit: track.exit || defaultExit,
        }));

      console.log("🔍 SENDING TO PYTHON:");
      preparedTracks.forEach((track, i) => {
        console.log(`Track ${i}: ${track.name}`);
        console.log(`  - fadeIn: ${track.fadeIn}ms`);
        console.log(`  - fadeOut: ${track.fadeOut}ms`);
        console.log(`  - entrance: ${track.entrance}ms`);
        console.log(`  - exit: ${track.exit}ms`);
        console.log(`  - trackLength: ${track.trackLength}ms`);
      });

      const result = await startMix({
        folderPath,
        outFolderPath,
        defaultFadeIn,
        defaultFadeOut,
        defaultEntrance,
        defaultExit,
        mixingMode,
        tracks: preparedTracks,
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

  const goBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="mixer-page">
      <div className="form-box">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h1 className="form-title">🎛️ Track Mixer</h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              className="collapse-toggle-button"
              onClick={() => setIsFormCollapsed(!isFormCollapsed)}
              title={isFormCollapsed ? "Show settings" : "Hide settings"}
            >
              {isFormCollapsed ? "▼" : "▲"}
            </button>
            <button className="action-button" onClick={goBackToHome}>
              ← go back
            </button>
          </div>
        </div>

        {!isFormCollapsed && (
          <>
            <div className="folder-pickers">
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
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div
                className="analysis-section"
                style={{ flex: "1", minWidth: "300px" }}
              >
                <h3 className="analysis-section-title">Default Settings</h3>
                <div className="analysis-controls">
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    <div className="form-group" style={{ flex: "0 0 auto" }}>
                      <label>Fade In</label>
                      <input
                        type="text"
                        value={msToMMSS(defaultFadeIn)}
                        onChange={(e) =>
                          setDefaultFadeIn(mmssToMs(e.target.value))
                        }
                        placeholder="MM:SS"
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: "0 0 auto" }}>
                      <label>Fade Out</label>
                      <input
                        type="text"
                        value={msToMMSS(defaultFadeOut)}
                        onChange={(e) =>
                          setDefaultFadeOut(mmssToMs(e.target.value))
                        }
                        placeholder="MM:SS"
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: "0 0 auto" }}>
                      <label>Entrance</label>
                      <input
                        type="text"
                        value={msToMMSS(defaultEntrance)}
                        onChange={(e) =>
                          setDefaultEntrance(mmssToMs(e.target.value))
                        }
                        placeholder="MM:SS"
                        style={{ width: "60px", textAlign: "center" }}
                      />
                    </div>
                    <div className="form-group" style={{ flex: "0 0 auto" }}>
                      <label>Exit</label>
                      <input
                        type="text"
                        value={msToMMSS(defaultExit)}
                        onChange={(e) =>
                          setDefaultExit(mmssToMs(e.target.value))
                        }
                        placeholder="MM:SS"
                        style={{ width: "60px", textAlign: "center" }}
                        m
                        c
                      />
                    </div>
                  </div>
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
                </div>
              </div>

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
                      <option value="dance">
                        Dance/Electronic (Beat-aligned)
                      </option>
                      <option value="ambient">
                        Ambient/Meditation (Phrase-based)
                      </option>
                      <option value="pop">Pop/Rock (Hybrid)</option>
                      <option value="classical">Classical/Orchestral</option>
                    </select>
                  </div>
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
                className="action-button"
                title="Open Output Folder"
                onClick={() => window.electronAPI?.openFolder?.(outFolderPath)}
                disabled={tracks.length === 0}
                style={{
                  opacity: tracks.length === 0 ? 0.5 : 1,
                  cursor: tracks.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                📂 Open
              </button>

              <button
                className="action-button"
                onClick={handleSaveSettings}
                disabled={tracks.length === 0}
                style={{
                  opacity: tracks.length === 0 ? 0.5 : 1,
                  cursor: tracks.length === 0 ? "not-allowed" : "pointer",
                }}
                title="Save track settings"
              >
                💾 Save
              </button>

              <button
                className="action-button"
                onClick={handleLoadSettings}
                disabled={!settingsFileExists}
                style={{
                  opacity: !settingsFileExists ? 0.5 : 1,
                  cursor: !settingsFileExists ? "not-allowed" : "pointer",
                }}
                title={
                  settingsFileExists
                    ? "Load saved settings"
                    : "No saved settings found"
                }
              >
                📂 Load
              </button>

              <button className="action-button" onClick={handleAnalyze}>
                Analyze Tracks
              </button>

              <button className="action-button" onClick={handleStartMix}>
                Start Mixing
              </button>
            </div>
          </>
        )}

        {/* Track Preview Player - Always visible */}
        <div style={{ marginTop: "1rem" }}>
          <MixerTrackPlayer
            track={previewTrack}
            audioFolderPath={folderPath}
            onUpdateTrack={(updatedTrack) => {
              // Find and update the track in the tracks array
              const trackIndex = tracks.findIndex(
                (t) => t.name === updatedTrack.name
              );
              if (trackIndex !== -1) {
                const newTracks = [...tracks];
                newTracks[trackIndex] = updatedTrack;
                setTracks(newTracks);
              }
            }}
            onNext={() => {
              if (!previewTrack) return;
              const currentIndex = tracks.findIndex(
                (t) => t.name === previewTrack.name
              );
              if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
                setPreviewTrack(tracks[currentIndex + 1]);
              }
            }}
            onPrevious={() => {
              if (!previewTrack) return;
              const currentIndex = tracks.findIndex(
                (t) => t.name === previewTrack.name
              );
              if (currentIndex > 0) {
                setPreviewTrack(tracks[currentIndex - 1]);
              }
            }}
            hasNext={
              previewTrack
                ? tracks.findIndex((t) => t.name === previewTrack.name) <
                  tracks.length - 1
                : false
            }
            hasPrevious={
              previewTrack
                ? tracks.findIndex((t) => t.name === previewTrack.name) > 0
                : false
            }
          />
        </div>
      </div>
      <div className="table-box">
        <MixerTrackTable
          tracks={tracks}
          setTracks={setTracks}
          defaultFadeIn={defaultFadeIn}
          defaultFadeOut={defaultFadeOut}
          defaultEntrance={defaultEntrance}
          defaultExit={defaultExit}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onTrackClick={setPreviewTrack}
          previewedTrackName={previewTrack?.name}
        />
      </div>
    </div>
  );
}
