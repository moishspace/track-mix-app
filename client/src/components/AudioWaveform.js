import React, { useCallback, useState, useEffect } from 'react';
import '../styles/AudioWaveformStyle.css';

const AudioWaveform = ({ 
  selectedTrack, 
  trackProgress, 
  onSeek
}) => {

  const [renderedTrack, setRenderedTrack] = useState(null);

  const handleWaveformClick = useCallback((event) => {
    if (!trackProgress.duration) return;

    const svgElement = event.currentTarget;
    const rect = svgElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPercentage = clickX / rect.width;
    
    // Calculate new position in milliseconds
    const newPosition = Math.floor(clickPercentage * trackProgress.duration);

    if (onSeek) onSeek(newPosition);

  }, [trackProgress.duration, onSeek]);

  useEffect(() => {
    if (selectedTrack) {
      console.debug('AudioWaveform: Rendering new track:', selectedTrack);
      setRenderedTrack(selectedTrack);
    }
  }, [selectedTrack]);

  if (!selectedTrack || !selectedTrack.segments || !selectedTrack.tatums) {
    return <div className="waveform-container">No audio analysis data available</div>;
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
    const normalized = (loudness + 60) / 60;
    const amplified = Math.pow(normalized, 1.2) * 0.8;
    return Math.max(0.15, Math.min(0.8, amplified));
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const barWidth = 0.4;
  const gap = 0.2;
  const totalWidth = segments.length * (barWidth + gap);

  return (
    <div className="waveform-container"
      onMouseDown={(e) => e.preventDefault()} 
      onMouseUp={(e) => e.preventDefault()}  
    >
      <div className="waveform-time-left">
        {formatTime(trackProgress.position)}
      </div>

      <div className="waveform-time-right">
        {formatTime(trackProgress.duration)}
      </div>

      <svg
        width="100%"
        height={waveHeight}
        viewBox={`0 0 ${totalWidth} ${waveHeight}`}
        preserveAspectRatio="none"
        className="waveform-svg"
        onClick={handleWaveformClick}
        style={{ cursor: 'pointer' }} // Add pointer cursor
      >
        {/* Background bars */}
        <g>
          {segments.map((_, i) => {
            const height = getBarHeight(i) * (waveHeight / 2);
            const x = i * (barWidth + gap);
            
            return (
              <g key={`bg-bar-${i}`}>
                <rect
                  x={x}
                  y={centerLine - (height * 1.2)}
                  width={barWidth}
                  height={height * 1.2}
                  className="waveform-bar waveform-bar-top"
                />
                <rect
                  x={x}
                  y={centerLine}
                  width={barWidth}
                  height={height * 0.8}
                  className="waveform-bar waveform-bar-bottom"
                />
              </g>
            );
          })}
        </g>

        {/* Progress bars */}
        <g>
          {segments.map((_, i) => {
            if (i > currentSegmentIndex) return null;
            
            const height = getBarHeight(i) * (waveHeight / 2);
            const x = i * (barWidth + gap);
            
            return (
              <g key={`progress-bar-${i}`}>
                <rect
                  x={x}
                  y={centerLine - (height * 1.2)}
                  width={barWidth}
                  height={height * 1.2}
                  className="waveform-progress-bar waveform-progress-bar-top"
                />
                <rect
                  x={x}
                  y={centerLine}
                  width={barWidth}
                  height={height * 0.8}
                  className="waveform-progress-bar waveform-progress-bar-bottom"
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
  );
};

export default AudioWaveform;