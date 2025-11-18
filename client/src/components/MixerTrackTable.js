import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  TextField,
} from "@mui/material";
import TrackWaveformPreview from "./TrackWaveformPreview";

export default function MixerTrackTable({
  tracks = [],
  setTracks,
  defaultFadeIn = 30000,
  defaultFadeOut = 30000,
  defaultEntrance = 30000,
  defaultExit = 30000,
  selectedIds = [],
  setSelectedIds = () => {},
  onTrackClick = null,
}) {
  const [usedSuggestionIds, setUsedSuggestionIds] = React.useState([]);
  const [originalValues, setOriginalValues] = React.useState({});

  // Key color mapping based on Camelot wheel (same as TrackWaveformPreview)
  const getKeyColor = (key) => {
    if (!key) return "#999";

    const keyColors = {
      // Major keys
      "8B": "#FF6B6B",
      C: "#FF6B6B",
      "3B": "#FF8E53",
      Db: "#FF8E53",
      "C#": "#FF8E53",
      "10B": "#FFB84D",
      D: "#FFB84D",
      "5B": "#FFD93D",
      Eb: "#FFD93D",
      "D#": "#FFD93D",
      "12B": "#6BCF7F",
      E: "#6BCF7F",
      "7B": "#4ECDC4",
      F: "#4ECDC4",
      "2B": "#45B7D1",
      Gb: "#45B7D1",
      "F#": "#45B7D1",
      "9B": "#5B9BD5",
      G: "#5B9BD5",
      "4B": "#7B68EE",
      Ab: "#7B68EE",
      "G#": "#7B68EE",
      "11B": "#B565D8",
      A: "#B565D8",
      "6B": "#E066A5",
      Bb: "#E066A5",
      "A#": "#E066A5",
      "1B": "#FF6B9D",
      B: "#FF6B9D",

      // Minor keys
      "5A": "#C23B22",
      Cm: "#C23B22",
      "12A": "#D45E1F",
      Dbm: "#D45E1F",
      "C#m": "#D45E1F",
      "7A": "#E67E22",
      Dm: "#E67E22",
      "2A": "#F39C12",
      Ebm: "#F39C12",
      "D#m": "#F39C12",
      "9A": "#27AE60",
      Em: "#27AE60",
      "4A": "#16A085",
      Fm: "#16A085",
      "11A": "#2980B9",
      Gbm: "#2980B9",
      "F#m": "#2980B9",
      "6A": "#3498DB",
      Gm: "#3498DB",
      "1A": "#5B4FB9",
      Abm: "#5B4FB9",
      "G#m": "#5B4FB9",
      "8A": "#8E44AD",
      Am: "#8E44AD",
      "3A": "#C0392B",
      Bbm: "#C0392B",
      "A#m": "#C0392B",
      "10A": "#E91E63",
      Bm: "#E91E63",
    };

    return keyColors[key] || "#999";
  };

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

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(tracks.map((_, i) => i));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (index) => {
    if (selectedIds.includes(index)) {
      setSelectedIds(selectedIds.filter((i) => i !== index));
    } else {
      setSelectedIds([...selectedIds, index]);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const updated = Array.from(tracks);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setTracks(updated);
  };

  const handleFadeChange = (id, field, value) => {
    // Convert MM:SS to milliseconds
    const ms = mmssToMs(value);
    const updated = tracks.map((t, i) =>
      i === id ? { ...t, [field]: ms } : t
    );
    setTracks(updated);
  };

  const handleUseSuggested = (index, event) => {
    const track = tracks[index];
    const isChecked = event.target.checked;

    if (isChecked) {
      // Save original values before applying suggestions
      if (
        track.analyzedFadeIn ||
        track.analyzedFadeOut ||
        track.analyzedEntrance ||
        track.analyzedExit
      ) {
        setOriginalValues({
          ...originalValues,
          [index]: {
            fadeIn: track.fadeIn || defaultFadeIn,
            fadeOut: track.fadeOut || defaultFadeOut,
            entrance: track.entrance || defaultEntrance,
            exit: track.exit || defaultExit,
          },
        });

        const updated = tracks.map((t, i) =>
          i === index
            ? {
                ...t,
                fadeIn: t.analyzedFadeIn || t.fadeIn,
                fadeOut: t.analyzedFadeOut || t.fadeOut,
                entrance: t.analyzedEntrance || t.entrance,
                exit: t.analyzedExit || t.exit,
              }
            : t
        );
        setTracks(updated);
        setUsedSuggestionIds([...usedSuggestionIds, index]);
      }
    } else {
      // Restore original values
      if (originalValues[index]) {
        const updated = tracks.map((t, i) =>
          i === index
            ? {
                ...t,
                fadeIn: originalValues[index].fadeIn,
                fadeOut: originalValues[index].fadeOut,
                entrance: originalValues[index].entrance,
                exit: originalValues[index].exit,
              }
            : t
        );
        setTracks(updated);
        setUsedSuggestionIds(usedSuggestionIds.filter((id) => id !== index));
      }
    }
  };

  const handleSelectAllSuggestions = (event) => {
    if (event.target.checked) {
      // Apply all suggestions
      const newOriginalValues = { ...originalValues };
      const newUsedIds = [];

      const updated = tracks.map((track, i) => {
        if (
          track.analyzedFadeIn ||
          track.analyzedFadeOut ||
          track.analyzedEntrance ||
          track.analyzedExit
        ) {
          // Save original values
          newOriginalValues[i] = {
            fadeIn: track.fadeIn || defaultFadeIn,
            fadeOut: track.fadeOut || defaultFadeOut,
            entrance: track.entrance || defaultEntrance,
            exit: track.exit || defaultExit,
          };
          newUsedIds.push(i);

          return {
            ...track,
            fadeIn: track.analyzedFadeIn || track.fadeIn,
            fadeOut: track.analyzedFadeOut || track.fadeOut,
            entrance: track.analyzedEntrance || track.entrance,
            exit: track.analyzedExit || track.exit,
          };
        }
        return track;
      });

      setOriginalValues(newOriginalValues);
      setUsedSuggestionIds(newUsedIds);
      setTracks(updated);
    } else {
      // Restore all original values
      const updated = tracks.map((track, i) => {
        if (originalValues[i]) {
          return {
            ...track,
            fadeIn: originalValues[i].fadeIn,
            fadeOut: originalValues[i].fadeOut,
            entrance: originalValues[i].entrance,
            exit: originalValues[i].exit,
          };
        }
        return track;
      });

      setTracks(updated);
      setUsedSuggestionIds([]);
    }
  };

  return (
    <div style={{ backgroundColor: "#121212", color: "#eee" }}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="trackTable">
          {(provided) => (
            <Table
              {...provided.droppableProps}
              ref={provided.innerRef}
              sx={{
                "& .MuiTableCell-root": { color: "#eee", borderColor: "#333" },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedIds.length > 0 &&
                        selectedIds.length < tracks.length
                      }
                      checked={
                        tracks.length > 0 &&
                        selectedIds.length === tracks.length
                      }
                      onChange={handleSelectAll}
                      sx={{
                        color: "#eee",
                        "&.Mui-checked": { color: "#aba30f" },
                      }}
                    />
                  </TableCell>
                  <TableCell>#</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Waveform</TableCell>
                  <TableCell>BPM</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Fade In</TableCell>
                  <TableCell>Fade Out</TableCell>
                  <TableCell>Entrance</TableCell>
                  <TableCell>Exit</TableCell>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        usedSuggestionIds.length > 0 &&
                        usedSuggestionIds.length <
                          tracks.filter(
                            (t) =>
                              t.analyzedFadeIn ||
                              t.analyzedFadeOut ||
                              t.analyzedEntrance ||
                              t.analyzedExit
                          ).length
                      }
                      checked={
                        tracks.filter(
                          (t) =>
                            t.analyzedFadeIn ||
                            t.analyzedFadeOut ||
                            t.analyzedEntrance ||
                            t.analyzedExit
                        ).length > 0 &&
                        usedSuggestionIds.length ===
                          tracks.filter(
                            (t) =>
                              t.analyzedFadeIn ||
                              t.analyzedFadeOut ||
                              t.analyzedEntrance ||
                              t.analyzedExit
                          ).length
                      }
                      onChange={handleSelectAllSuggestions}
                      sx={{
                        color: "#eee",
                        "&.Mui-checked": { color: "#4caf50" },
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: "100px", textAlign: "center" }}>
                    Sug. In
                  </TableCell>
                  <TableCell sx={{ width: "100px", textAlign: "center" }}>
                    Sug. Out
                  </TableCell>
                  <TableCell sx={{ width: "100px", textAlign: "center" }}>
                    Sug. Ent
                  </TableCell>
                  <TableCell sx={{ width: "100px", textAlign: "center" }}>
                    Sug. Exit
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {tracks.map((track, i) => (
                  <Draggable key={i} draggableId={`track-${i}`} index={i}>
                    {(provided) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        hover
                        onClick={() =>
                          onTrackClick &&
                          onTrackClick({
                            ...track,
                            name: track.name,
                            analysis: {
                              waveform_data: track.waveformData,
                              bpm: track.bpm,
                              key: track.key,
                              camelot_key: track.camelotKey,
                            },
                          })
                        }
                        sx={{
                          backgroundColor: selectedIds.includes(i)
                            ? "#2a2a2a"
                            : "#1c1c1c",
                          cursor: onTrackClick ? "pointer" : "default",
                        }}
                      >
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedIds.includes(i)}
                            onChange={() => handleSelectRow(i)}
                            sx={{
                              color: "#eee",
                              "&.Mui-checked": { color: "#0f86abff" },
                            }}
                          />
                        </TableCell>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{track.name}</TableCell>
                        <TableCell>
                          <TrackWaveformPreview
                            mode="table"
                            waveformData={track.waveformData}
                            phraseBoundaries={track.phraseBoundaries}
                            trackLength={track.trackLength}
                            bpm={track.bpm}
                            musicalKey={track.key}
                            camelotKey={track.camelotKey}
                            width={250}
                            height={50}
                          />
                        </TableCell>
                        <TableCell>
                          {track.bpm ? (
                            <span style={{ color: "#fff", fontWeight: "600" }}>
                              {Math.round(track.bpm)}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {track.camelotKey ? (
                            <span
                              style={{
                                color: getKeyColor(track.camelotKey),
                                fontWeight: "700",
                                textShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
                              }}
                            >
                              {track.camelotKey}
                            </span>
                          ) : track.key ? (
                            <span
                              style={{
                                color: getKeyColor(track.key),
                                fontWeight: "700",
                                textShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
                              }}
                            >
                              {track.key}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                        <TableCell>{track.length || "-"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            type="text"
                            size="small"
                            value={msToMMSS(track.fadeIn || defaultFadeIn)}
                            onChange={(e) =>
                              handleFadeChange(i, "fadeIn", e.target.value)
                            }
                            placeholder="MM:SS"
                            inputProps={{ style: { color: "#eee" } }}
                            sx={{
                              input: { backgroundColor: "#2a2a2a" },
                              width: "80px",
                            }}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            type="text"
                            size="small"
                            value={msToMMSS(track.fadeOut || defaultFadeOut)}
                            onChange={(e) =>
                              handleFadeChange(i, "fadeOut", e.target.value)
                            }
                            placeholder="MM:SS"
                            inputProps={{ style: { color: "#eee" } }}
                            sx={{
                              input: { backgroundColor: "#2a2a2a" },
                              width: "80px",
                            }}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            type="text"
                            size="small"
                            value={msToMMSS(track.entrance || defaultEntrance)}
                            onChange={(e) =>
                              handleFadeChange(i, "entrance", e.target.value)
                            }
                            placeholder="MM:SS"
                            inputProps={{ style: { color: "#eee" } }}
                            sx={{
                              input: { backgroundColor: "#2a2a2a" },
                              width: "80px",
                            }}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <TextField
                            type="text"
                            size="small"
                            value={msToMMSS(track.exit || defaultExit)}
                            onChange={(e) =>
                              handleFadeChange(i, "exit", e.target.value)
                            }
                            placeholder="MM:SS"
                            inputProps={{ style: { color: "#eee" } }}
                            sx={{
                              input: { backgroundColor: "#2a2a2a" },
                              width: "80px",
                            }}
                          />
                        </TableCell>
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={usedSuggestionIds.includes(i)}
                            disabled={
                              !track.analyzedFadeIn &&
                              !track.analyzedFadeOut &&
                              !track.analyzedEntrance &&
                              !track.analyzedExit
                            }
                            onChange={(e) => handleUseSuggested(i, e)}
                            sx={{
                              color: "#eee",
                              "&.Mui-checked": { color: "#4caf50" },
                              "&.Mui-disabled": { color: "#444" },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {track.analyzedFadeIn ? (
                            <span
                              style={{ color: "#4caf50", fontWeight: "bold" }}
                            >
                              {msToMMSS(track.analyzedFadeIn)}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {track.analyzedFadeOut ? (
                            <span
                              style={{ color: "#4caf50", fontWeight: "bold" }}
                            >
                              {msToMMSS(track.analyzedFadeOut)}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {track.analyzedEntrance ? (
                            <span
                              style={{ color: "#4caf50", fontWeight: "bold" }}
                            >
                              {msToMMSS(track.analyzedEntrance)}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {track.analyzedExit ? (
                            <span
                              style={{ color: "#4caf50", fontWeight: "bold" }}
                            >
                              {msToMMSS(track.analyzedExit)}
                            </span>
                          ) : (
                            <span style={{ color: "#666" }}>-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </TableBody>
            </Table>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
