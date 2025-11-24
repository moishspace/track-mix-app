// TrackPlayer.js
import React, { useRef, forwardRef, useImperativeHandle, memo } from 'react';
import SpotifyWebPlayer from './SpotifyWebPlayer';

const TrackPlayer = memo(forwardRef(({ processedTracks, selectedTrack, currentTrackIndex = 0, setCurrentTrackIndex, onProgress, onTrackChange }, ref) => {
  const spotifyPlayerRef = useRef();

  // Use `useImperativeHandle` to expose `handleSeek`
  useImperativeHandle(ref, () => ({
    handleSeek: (position) => {
      spotifyPlayerRef.current?.handleSeek(position); // Forward to SpotifyWebPlayer
    },
  }));

  const trackIndex = processedTracks.findIndex(track => track.id === selectedTrack?.id);
  return (
    <SpotifyWebPlayer
      ref={spotifyPlayerRef}
      processedTracks={processedTracks}
      playlistUris={processedTracks.map(track => `spotify:track:${track.id}`)}
      initialTrackIndex={trackIndex}
      currentTrackIndex={trackIndex}
      setCurrentTrackIndex={setCurrentTrackIndex}
      onProgress = {onProgress}
      onTrackChange={onTrackChange}
    />
  );
}), (prevProps, nextProps) => {
  // Custom comparison: only re-render if these specific props change
  return (
    prevProps.selectedTrack?.id === nextProps.selectedTrack?.id &&
    prevProps.currentTrackIndex === nextProps.currentTrackIndex &&
    prevProps.processedTracks.length === nextProps.processedTracks.length
  );
});

export default TrackPlayer;
