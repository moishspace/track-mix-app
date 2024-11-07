import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../services/api';
import { Typography, Slider, IconButton, Box } from '@mui/material';
import { SkipNext, SkipPrevious, PlayArrow, Pause } from '@mui/icons-material';

const SpotifyPlayer = ({ trackUri, trackInfo, onTrackEnd }) => {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [deviceId, setDeviceId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("0:00");

  useEffect(() => {
    const initializeSpotifySDK = async () => {
      const accessToken = await getAccessToken();
  
      if (!window.Spotify) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        script.onload = () => {
          window.onSpotifyWebPlaybackSDKReady = () => setupPlayer(accessToken);
        };
        document.body.appendChild(script);
      } else {
        setupPlayer(accessToken);
      }
    };
  
    const setupPlayer = (accessToken) => {
      if (window.Spotify && !player) {
        const spotifyPlayer = new window.Spotify.Player({
          name: 'Web Playback SDK',
          getOAuthToken: cb => cb(accessToken),
        });
  
        spotifyPlayer.addListener('ready', ({ device_id }) => {
          console.log('Spotify Player Ready with Device ID', device_id);
          setDeviceId(device_id);
        });
  
        spotifyPlayer.addListener('player_state_changed', (state) => {
          if (!state) return;
          setIsPlaying(!state.paused);
          setDuration(state.duration);
          setProgress(state.position);
          setElapsedTime(formatTime(state.position));
          if (state.paused && !state.track_window.next_tracks.length) {
            onTrackEnd();
          }
        });
  
        spotifyPlayer.connect().then(success => {
          if (success) {
            console.log('Player successfully connected to Spotify!');
            setPlayer(spotifyPlayer);
          }
        });
      }
    };
  
    initializeSpotifySDK();
  
    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [player]);

  const playTrack = async () => {
    if (trackUri && deviceId) {
      try {
        const accessToken = await getAccessToken();
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          body: JSON.stringify({ uris: [trackUri] }),
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        });
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing track:', error);
      }
    } else {
      console.log('Device ID or track URI not set');
    }
  };

  const pauseTrack = async () => {
    if (deviceId) {
      try {
        const accessToken = await getAccessToken();
        await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing track:', error);
      }
    }
  };

  const seekToPosition = async (position) => {
    if (deviceId) {
      try {
        const accessToken = await getAccessToken();
        const roundedPosition = Math.round(position);
        await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${roundedPosition}&device_id=${deviceId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (error) {
        console.error('Error seeking track position:', error);
      }
    }
  };

  const handleSliderChange = (event, newValue) => {
    setProgress(newValue);
  };

  const handleSliderCommit = () => {
    const newPosition = (progress / 100) * duration;
    setProgress(newPosition);
    seekToPosition(newPosition);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  };

  return (
    <div className="spotify-player-container">
      <Typography
        variant="h6"
        className="track-title"
        sx={{ color: '#093218', fontSize: '1.2rem', fontWeight: 'bold' }}
      >
        {trackInfo?.name || 'No Track Playing'} - {trackInfo?.artistsName || 'Unknown Artist'}
      </Typography>

      <div className="time-slider-container">
        <Box component="span" sx={{ color: '#999', mr: 1 }}>{elapsedTime}</Box>
        <Slider 
          value={(progress / duration) * 100} 
          onChange={handleSliderChange} 
          onChangeCommitted={handleSliderCommit}
          aria-labelledby="track-progress" 
          sx={{ width: '60%', mx: 1, color: '#999' }}
        />
        <Box component="span" sx={{ color: '#999', ml: 1 }}>{formatTime(duration)}</Box>
      </div>

      <div className="player-controls">
        <IconButton onClick={() => console.log('Previous track')}>
          <SkipPrevious />
        </IconButton>
        <IconButton onClick={isPlaying ? pauseTrack : playTrack}>
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        <IconButton onClick={() => console.log('Next track')}>
          <SkipNext />
        </IconButton>
      </div>
    </div>
  );
};

export default SpotifyPlayer;