import React, { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';
import { getAccessToken } from '../services/api';

const SpotifyWebPlayer = ({ trackUri }) => {
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Retrieve the access token
    const fetchToken = async () => {
      const token = await getAccessToken();
      setAccessToken(token);
    };

    fetchToken();
  }, []);

  // Ensure `trackUri` is always an array
  const uris = trackUri ? (Array.isArray(trackUri) ? trackUri : [trackUri]) : [];
  
  // Debugging: Log trackUri and uris
  // console.log('trackUri:', trackUri);  // Should log the value passed in
  // console.log('uris:', uris);          // Should always be an array

  return (
    <div>
      {accessToken ? (
        <SpotifyPlayer
          token={accessToken}
          uris={uris}
          showSaveIcon
          styles={{
            activeColor: '#1db954',
            bgColor: '#333',
            color: '#fff',
            loaderColor: '#fff',
            sliderColor: '#1db954',
            trackArtistColor: '#ccc',
            trackNameColor: '#fff',
          }}
        />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default SpotifyWebPlayer;