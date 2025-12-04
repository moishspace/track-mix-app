import React, { useState, useRef, useEffect } from 'react';
import '../styles/MixerTrackPlayer.css';
import TrackWaveformPreview from './TrackWaveformPreview';

const MixerTrackPlayer = ({ track, audioFolderPath, onUpdateTrack, onNext, onPrevious, hasNext, hasPrevious }) => {
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
    const audio = audioRef.current;
    if (!audio) return;

    if (audioPath) {
      // Set the source and load the new track
      audio.src = audioPath;
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setIsLoading(true);
    } else {
      // No track selected, reset loading state
      audio.src = '';
      setIsLoading(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
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
        {track.bpm && track.key && (
          <div className="player-track-meta">
            {Math.round(track.bpm)} BPM • {track.key}
            {track.camelotKey && ` (${track.camelotKey})`}
          </div>
        )}
      </div>

      {/* Waveform with playhead */}
      <div className="player-waveform-container">
        <TrackWaveformPreview
          mode="player"
          waveformData={track.waveformData}
          phraseBoundaries={track.phraseBoundaries}
          trackLength={track.trackLength}
          bpm={track.bpm}
          musicalKey={track.key}
          camelotKey={track.camelotKey}
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
        {/* Previous button */}
        <button
          className="player-skip-button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          title="Previous track"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        {/* Play/Pause button */}
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

        {/* Next button */}
        <button
          className="player-skip-button"
          onClick={onNext}
          disabled={!hasNext}
          title="Next track"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
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
