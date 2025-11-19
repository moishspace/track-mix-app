import React, { useState, useRef, useEffect } from 'react';
import './MixerTrackPlayer.css';
import TrackWaveformPreview from './TrackWaveformPreview';

const MixerTrackPlayer = ({ track, audioFolderPath, onUpdateTrack }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Construct file path for Electron using custom protocol
  const audioPath = track && audioFolderPath && track.name
    ? (() => {
        // Normalize path separators
        const folder = audioFolderPath.replace(/\\/g, '/');
        const file = track.name;

        // Build full path
        const fullPath = `${folder}/${file}`;

        // Use custom local-audio:// protocol registered in Electron main process
        // This protocol handles file access securely
        return `local-audio://${encodeURIComponent(fullPath)}`;
      })()
    : null;

  // Debug logging
  useEffect(() => {
    if (audioPath) {
      console.log('Audio path:', audioPath);
    }
  }, [audioPath]);

  // Reset player when track changes
  useEffect(() => {
    if (audioRef.current && audioPath) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoading(true);
    } else if (!audioPath) {
      // No track selected, reset loading state
      setIsLoading(false);
    }
  }, [audioPath]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current || !audioPath) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Playback error:', error);
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
      console.log('Audio loaded, duration:', audioRef.current.duration);
    }
  };

  // Handle loading errors
  const handleError = (e) => {
    console.error('Audio loading error:', e);
    console.error('Error target:', e.target);
    console.error('Error code:', e.target?.error?.code);
    console.error('Error message:', e.target?.error?.message);
    console.error('Failed audio path:', audioPath);
    setIsLoading(false);
    // Show user-friendly error
    alert(`Failed to load audio file:\n${audioPath}\n\nMake sure the file exists and is accessible.`);
  };

  // Handle waveform click to seek
  const handleWaveformSeek = (seekTime) => {
    if (audioRef.current && !isNaN(seekTime)) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Handle track ended
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // If no track selected
  if (!track || !audioPath) {
    return (
      <div className="mixer-track-player">
        <div className="player-placeholder">
          <div className="player-placeholder-icon">🎵</div>
          <div className="player-placeholder-text">Select a track to preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mixer-track-player">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioPath}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onCanPlay={() => {
          setIsLoading(false);
          console.log('Audio can play');
        }}
      />

      {/* Track info */}
      <div className="player-track-info">
        <div className="player-track-name">{track.name}</div>
        {track.analysis?.bpm && track.analysis?.key && (
          <div className="player-track-meta">
            {Math.round(track.analysis.bpm)} BPM • {track.analysis.key}
            {track.analysis.camelot_key && ` (${track.analysis.camelot_key})`}
          </div>
        )}
      </div>

      {/* Waveform with playhead */}
      <div className="player-waveform-container">
        <TrackWaveformPreview
          mode="player"
          waveformData={track.analysis?.waveform_data}
          phraseBoundaries={track.analysis?.phrase_boundaries}
          trackLength={track.trackLength}
          bpm={track.analysis?.bpm}
          musicalKey={track.key}
          camelotKey={track.analysis?.camelot_key || track.camelotKey}
          width="100%"
          height={120}
          interactive={true}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleWaveformSeek}
          onSetEntrance={
            onUpdateTrack
              ? (timeMs) => {
                  onUpdateTrack({ ...track, entrance: timeMs });
                }
              : null
          }
          onSetExit={
            onUpdateTrack
              ? (timeFromEnd) => {
                  onUpdateTrack({ ...track, exit: timeFromEnd });
                }
              : null
          }
        />
      </div>

      {/* Controls */}
      <div className="player-controls">
        <button
          className="player-play-button"
          onClick={handlePlayPause}
          disabled={isLoading}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="player-time-display">
          <span className="player-time-current">{formatTime(currentTime)}</span>
          <span className="player-time-separator">/</span>
          <span className="player-time-total">{formatTime(duration)}</span>
        </div>

        {/* Progress bar */}
        <div className="player-progress-bar">
          <div
            className="player-progress-fill"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default MixerTrackPlayer;
