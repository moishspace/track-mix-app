import React, { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { getAccessToken } from '../services/api';

const SpotifyWebPlayer = ({ playlistUris = [], initialTrackIndex = 0 }) => { // Default to empty array if undefined
  const [accessToken, setAccessToken] = useState(null);
  const [play, setPlay] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialTrackIndex);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getAccessToken();
      setAccessToken(token);
    };
    fetchToken();
  }, []);

  const uris = Array.isArray(playlistUris) ? playlistUris : [];

  useEffect(() => {
    if (currentTrackIndex !== initialTrackIndex) {
      setPlay(false); // Prevents autoplay when switching tracks
    }
    setCurrentTrackIndex(initialTrackIndex); // Update to the new track
  }, [playlistUris, initialTrackIndex]);

  return (
    <div className="spotify-player-wrapper"
        onMouseDown={(e) => e.preventDefault()} // Prevents focus on mouse click
        onMouseUp={(e) => e.preventDefault()}   // Prevents selection on mouse up
      >   
      {accessToken ? (
        <SpotifyPlayer
          token={accessToken}
          uris={uris} // Use the verified array
          offset={initialTrackIndex}
          play={play} // Controlled playback state
          showSaveIcon
          styles={{
            activeColor: '#1db954',
            bgColor: '#333',
            color: '#fff',
            loaderColor: '#fff',
            sliderColor: '#1db954',
            trackArtistColor: '#ccc',
            trackNameColor: '#fff',
            cursor: 'default',
          }}
          callback={(state) => {
            // Set play state only if the user interacts with the player controls
            if (state.isPlaying && !play) {
              setPlay(true);
            } else if (!state.isPlaying && play) {
              setPlay(false);
            }
          }}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default SpotifyWebPlayer;