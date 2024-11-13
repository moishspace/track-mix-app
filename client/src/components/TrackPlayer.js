// TrackPlayer.js
import React from 'react';
import SpotifyWebPlayer from './SpotifyWebPlayer';

const TrackPlayer = ({ filteredTracks, selectedTrack }) => (
  <SpotifyWebPlayer
    playlistUris={filteredTracks.map(track => `spotify:track:${track.id}`)}
    initialTrackIndex={filteredTracks.findIndex(track => track.id === selectedTrack?.id)}
  />
);

export default TrackPlayer;