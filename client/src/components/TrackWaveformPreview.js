import { useState, useRef, useEffect } from "react";
import "../styles/TrackWaveformPreview.css";

const TrackWaveformPreview = ({
  mode = "table",
  waveformData = [],
  phraseBoundaries = [],
  trackLength = 0,
  bpm = null,
  musicalKey = null,
  camelotKey = null,
  height = 50,
  width = 300,
  interactive = false,
  currentTime = 0,
  duration = 0,
  onSeek = null,
}) => {
  // Key color mapping based on Camelot wheel
  const getKeyColor = (key) => {
    if (!key) return "#999";

    const keyColors = {
      // Major keys (outer wheel)
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

      // Minor keys (inner wheel)
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
  const [zoom, setZoom] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const scrollContainerRef = useRef(null);

  // Add global mouse up listener for when mouse is released outside the SVG
  // MUST be before any early returns (Rules of Hooks)
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging]);

  // If no waveform data, show placeholder
  if (!waveformData || !Array.isArray(waveformData) || !waveformData.length) {
    return (
      <div
        className="waveform-preview-container"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="waveform-preview-placeholder">No waveform data</div>
      </div>
    );
  }

  // Handle RGB waveform data (Rekordbox 6+ style)
  // Each point has: {amplitude, r, g, b}
  const rgbData = waveformData;

  const handleScroll = (e) => {
    const scrollElement = e.target;
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
    if (maxScroll > 0) {
      const newScrollPosition = (scrollElement.scrollLeft / maxScroll) * 100;
      setScrollPosition(newScrollPosition);
    }
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((prev) => Math.max(prev - 0.5, 1));
  };

  // Handle click on waveform to seek
  const handleWaveformClick = (e) => {
    if (!interactive || !onSeek || duration === 0) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const seekTime = clickPercent * duration;

    onSeek(seekTime);
  };

  // Handle mouse down to start dragging
  const handleMouseDown = (e) => {
    if (!interactive || !onSeek || duration === 0) return;

    e.preventDefault();
    setIsDragging(true);

    // Seek immediately on mouse down
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    const seekTime = clickPercent * duration;
    onSeek(seekTime);
  };

  // Handle mouse move while dragging
  const handleMouseMove = (e) => {
    if (!isDragging || !interactive || !onSeek || duration === 0) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const clickPercent = clickX / rect.width;
    const seekTime = clickPercent * duration;

    onSeek(seekTime);
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate SVG dimensions - using line-based rendering
  const barWidth = 0.3;
  const gap = 0.15;
  const dataLength = rgbData.length;
  const totalWidth = dataLength * (barWidth + gap);
  const centerLine = height / 2;

  // Convert phrase boundaries from milliseconds to normalized positions (0-1)
  const phrasePositions = phraseBoundaries
    .filter((timeMs) => timeMs > 0 && timeMs < trackLength)
    .map((timeMs) => (timeMs / trackLength) * totalWidth);

  // Use Camelot key if available, otherwise fall back to musical key
  const displayKey = camelotKey || musicalKey;
  const keyColor = getKeyColor(displayKey);

  // Calculate playhead position
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Calculate beat grid positions (every 4 beats = 1 bar)
  const beatPositions = [];
  if (bpm && duration > 0) {
    const beatDuration = 60 / bpm; // seconds per beat
    const barDuration = beatDuration * 4; // 4 beats per bar
    const totalBars = Math.floor(duration / barDuration);

    for (let i = 0; i <= totalBars; i++) {
      const barTime = i * barDuration;
      const barX = (barTime / duration) * totalWidth;

      beatPositions.push({
        x: barX,
        isDownbeat: true, // All lines are bar lines now
      });
    }
  }

  return (
    <div
      className="waveform-preview-container"
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
      }}
    >
      {/* BPM and Key labels */}
      <div className="waveform-preview-info">
        {bpm && (
          <span className="waveform-preview-bpm" title="BPM">
            {Math.round(bpm)}
          </span>
        )}
        {displayKey && (
          <span
            className="waveform-preview-key"
            style={{ color: keyColor }}
            title={camelotKey ? `${camelotKey} (${musicalKey})` : "Key"}
          >
            {displayKey}
          </span>
        )}
      </div>

      {/* Zoom controls */}
      <div className="waveform-preview-controls">
        <button
          className="waveform-preview-zoom-btn"
          onClick={handleZoomOut}
          disabled={zoom <= 1}
          title="Zoom out"
        >
          −
        </button>
        <span className="waveform-preview-zoom-level">{zoom.toFixed(1)}x</span>
        <button
          className="waveform-preview-zoom-btn"
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          title="Zoom in"
        >
          +
        </button>
      </div>

      {/* Scrollable waveform container */}
      <div
        className="waveform-preview-scroll"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <svg
          width={`${zoom * 100}%`}
          height={height}
          viewBox={`0 0 ${totalWidth} ${height}`}
          preserveAspectRatio="none"
          className={`waveform-preview-svg ${
            interactive ? "interactive" : ""
          } ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleWaveformClick}
          style={{
            cursor: interactive
              ? isDragging
                ? "grabbing"
                : "pointer"
              : "default",
          }}
        >
          <defs>
            <linearGradient id="waveformGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4caf50" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#4caf50" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4caf50" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="playheadGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#764ba2" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Center line */}
          <line
            x1="0"
            y1={centerLine}
            x2={totalWidth}
            y2={centerLine}
            className="waveform-preview-center-line"
          />

          {/* Beat grid lines (drawn first, underneath waveform) */}
          {beatPositions.map((beat, i) => (
            <line
              key={`beat-${i}`}
              x1={beat.x}
              y1={0}
              x2={beat.x}
              y2={height}
              className={
                beat.isDownbeat
                  ? "waveform-preview-downbeat"
                  : "waveform-preview-beat"
              }
            />
          ))}

          {/* RGB waveform bars (Rekordbox 6+ style) */}
          <g className="waveform-preview-bars-rgb">
            {rgbData.map((point, i) => {
              const barHeight = point.amplitude * (height / 2) * 0.9;
              const isPlayer = mode === "player";
              const x = isPlayer
                ? ((i / rgbData.length) * duration / duration) * totalWidth
                : i * (barWidth + gap);

              const color = `rgb(${Math.min(255, point.r * 1.05)}, ${
                point.g
              }, ${point.b})`;

              return (
                <g key={`rgb-${i}`}>
                  <line
                    x1={x + barWidth / 2}
                    y1={centerLine - barHeight}
                    x2={x + barWidth / 2}
                    y2={centerLine}
                    stroke={color}
                    strokeWidth={barWidth}
                    opacity={1}
                  />
                  <line
                    x1={x + barWidth / 2}
                    y1={centerLine}
                    x2={x + barWidth / 2}
                    y2={centerLine + barHeight}
                    stroke={color}
                    strokeWidth={barWidth}
                    opacity={0.8}
                  />
                </g>
              );
            })}
          </g>

          {/* Phrase boundary lines */}
          {phrasePositions.map((x, i) => (
            <line
              key={`phrase-${i}`}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
              className="waveform-preview-phrase-line"
            />
          ))}

          {/* Playhead (only shown in interactive mode) */}
          {interactive && duration > 0 && (
            <rect
              x={(playheadPercent / 100) * totalWidth - 0.5}
              y={0}
              width={0.5}
              height={height}
              fill="url(#playheadGradient)"
              rx={0.5}
              opacity="0.9"
              className="waveform-preview-playhead"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default TrackWaveformPreview;
