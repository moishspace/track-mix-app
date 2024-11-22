// TrackPlayer.js
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import SpotifyWebPlayer from './SpotifyWebPlayer';

const TrackPlayer = forwardRef(({ filteredTracks, selectedTrack, onProgress, onTrackChange }, ref) => {
  const spotifyPlayerRef = useRef();

  // Use `useImperativeHandle` to expose `handleSeek`
  useImperativeHandle(ref, () => ({
    handleSeek: (position) => {
      spotifyPlayerRef.current?.handleSeek(position); // Forward to SpotifyWebPlayer
    },
  }));

  return (
    <SpotifyWebPlayer
      ref={spotifyPlayerRef}
      playlistUris={filteredTracks.map(track => `spotify:track:${track.id}`)}
      initialTrackIndex={filteredTracks.findIndex(track => track.id === selectedTrack?.id)}
      onProgress = {onProgress}
      onTrackChange={onTrackChange}
    />
  );
});

export default TrackPlayer;