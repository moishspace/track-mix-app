import React, { useCallback, useState, useEffect, useRef } from 'react';
import '../styles/AudioWaveformStyle.css';

const AudioWaveform = ({ 
  selectedTrack, 
  trackProgress, 
  onSeek
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef(null);

  // Auto-scroll as track plays
  useEffect(() => {
    if (!trackProgress?.duration || !scrollContainerRef.current) return;
    
    const progressPercentage = (trackProgress.position / trackProgress.duration);
    if (progressPercentage > (scrollPosition / 100 + 1/zoomLevel)) {
      const newScrollPos = Math.min(100 * (1 - 1/zoomLevel), progressPercentage * 100);
      setScrollPosition(newScrollPos);
      
      // Update horizontal scroll position
      const scrollElement = scrollContainerRef.current;
      scrollElement.scrollLeft = (newScrollPos / 100) * (scrollElement.scrollWidth - scrollElement.clientWidth);
    }
  }, [trackProgress.position, trackProgress.duration, zoomLevel, scrollPosition]);

  // Handle scroll events
  const handleScroll = (e) => {
    const scrollElement = e.target;
    const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
    const newScrollPosition = (scrollElement.scrollLeft / maxScroll) * 100 * (1 - 1/zoomLevel);
    setScrollPosition(newScrollPosition);
  };

  const handleWaveformClick = useCallback((event) => {
    if (!trackProgress.duration) return;

    const svgElement = event.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPercentage = (clickX / rect.width) * zoomLevel + (scrollPosition / 100);
    
    const newPosition = Math.floor(clickPercentage * trackProgress.duration);
    if (onSeek) onSeek(newPosition);
  }, [trackProgress.duration, onSeek, zoomLevel, scrollPosition]);

  const handleZoom = (direction) => {
    setZoomLevel(prev => {
      // Define round zoom levels
      const zoomLevels = [100, 150, 200, 300, 400, 500, 750, 1000];
      const currentZoomPercent = prev * 100;
      
      // Find next zoom level
      if (direction === 'in') {
        const nextZoom = zoomLevels.find(zoom => zoom > currentZoomPercent) || currentZoomPercent;
        return nextZoom / 100;
      } else {
        const nextZoom = [...zoomLevels].reverse().find(zoom => zoom < currentZoomPercent) || 100;
        return nextZoom / 100;
      }
    });
  };

  if (!selectedTrack || !selectedTrack.segments || !selectedTrack.tatums) {
    return (
      <div className="waveform-container">
        <div className="waveform-background" />
        <div className="waveform-empty">No audio analysis data available</div>
      </div>
    );
  }

  const segments = selectedTrack.segments;
  const waveHeight = 100;
  const centerLine = waveHeight / 2;

  const progressPercent = trackProgress?.duration > 0
    ? Math.min(trackProgress.position / trackProgress.duration, 1)
    : 0;

  const currentSegmentIndex = Math.floor(progressPercent * segments.length);

  const getBarHeight = (index) => {
    const segment = segments[index];
    if (!segment) return 0.15;
    
    const loudness = segment.loudness_start ?? -60;
    const normalized = Math.pow((loudness + 60) / 60, 1.5);
    return Math.max(0.05, Math.min(0.95, normalized));
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const barWidth = 0.2;
  const gap = 0.1;
  const totalWidth = segments.length * (barWidth + gap);

  // Calculate grid lines based on visible area
  const gridLineInterval = Math.floor((segments.length / zoomLevel) / 10);
  const firstVisibleSegment = Math.floor((segments.length * scrollPosition) / 100);
  const gridLines = Array.from(
    { length: 11 }, 
    (_, i) => firstVisibleSegment + (i * gridLineInterval)
  ).filter(i => i < segments.length);

  return (
    <div className="waveform-container">
      <div className="waveform-background" />
      <div className="waveform-controls">
        <div className="waveform-time-container">
          <div className="waveform-time waveform-time-left">
            {formatTime(trackProgress.position)}
          </div>
          <div className="waveform-zoom-controls">
            <button 
              className="waveform-zoom-button" 
              onClick={() => handleZoom('out')}
              disabled={zoomLevel <= 1}
            >
              -
            </button>
            <span className="waveform-zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button 
              className="waveform-zoom-button" 
              onClick={() => handleZoom('in')}
              disabled={zoomLevel >= 10}
            >
              +
            </button>
          </div>
          <div className="waveform-time waveform-time-right">
            {formatTime(trackProgress.duration)}
          </div>
        </div>
      </div>

      <div 
        className="waveform-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <svg
          width={`${zoomLevel * 100}%`}
          height={waveHeight}
          viewBox={`0 0 ${totalWidth} ${waveHeight}`}
          preserveAspectRatio="none"
          className="waveform-svg"
          onClick={handleWaveformClick}
          style={{ "--zoom-level": zoomLevel }}
        >
          <defs>
            <linearGradient id="progressGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--waveform-progress-color)" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="var(--waveform-progress-color)" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="var(--waveform-progress-color)" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="normalGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--waveform-color)" stopOpacity="0.4"/>
              <stop offset="50%" stopColor="var(--waveform-color)" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="var(--waveform-color)" stopOpacity="0.3"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g>
            {gridLines.map((index) => (
              <line
                key={`grid-${index}`}
                x1={index * (barWidth + gap)}
                y1="0"
                x2={index * (barWidth + gap)}
                y2={waveHeight}
                className="waveform-grid-line"
              />
            ))}
          </g>

          {/* Center divider line */}
          <line
            x1="0"
            y1={centerLine}
            x2={totalWidth}
            y2={centerLine}
            className="waveform-center-line"
          />

          {/* Background lines */}
          <g>
            {segments.map((_, i) => {
              const height = getBarHeight(i) * (waveHeight / 2);
              const x = i * (barWidth + gap);
              
              return (
                <g key={`bg-bar-${i}`}>
                  <line
                    x1={x + barWidth/2}
                    y1={centerLine - height}
                    x2={x + barWidth/2}
                    y2={centerLine}
                    className="waveform-line waveform-line-top"
                    style={{ strokeWidth: barWidth }}
                  />
                  <line
                    x1={x + barWidth/2}
                    y1={centerLine}
                    x2={x + barWidth/2}
                    y2={centerLine + height}
                    className="waveform-line waveform-line-bottom"
                    style={{ strokeWidth: barWidth }}
                  />
                </g>
              );
            })}
          </g>

          {/* Progress lines */}
          <g>
            {segments.map((_, i) => {
              if (i > currentSegmentIndex) return null;
              
              const height = getBarHeight(i) * (waveHeight / 2);
              const x = i * (barWidth + gap);
              
              return (
                <g key={`progress-bar-${i}`}>
                  <line
                    x1={x + barWidth/2}
                    y1={centerLine - height}
                    x2={x + barWidth/2}
                    y2={centerLine}
                    className="waveform-line-progress waveform-line-progress-top"
                    style={{ strokeWidth: barWidth }}
                  />
                  <line
                    x1={x + barWidth/2}
                    y1={centerLine}
                    x2={x + barWidth/2}
                    y2={centerLine + height}
                    className="waveform-line-progress waveform-line-progress-bottom"
                    style={{ strokeWidth: barWidth }}
                  />
                </g>
              );
            })}
          </g>

          {/* Progress line */}
          {progressPercent > 0 && (
            <line
              x1={currentSegmentIndex * (barWidth + gap)}
              y1="0"
              x2={currentSegmentIndex * (barWidth + gap)}
              y2={waveHeight}
              className="waveform-progress-line"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default AudioWaveform;