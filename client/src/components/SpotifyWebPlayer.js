import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import SpotifyPlayer, { spotifyApi } from 'react-spotify-web-playback';
import { getAccessToken } from '../services/api';

const SpotifyWebPlayer = forwardRef(({ playlistUris = [], initialTrackIndex = 0, onProgress, onPlayerInit, onTrackChange }, ref) => {
  const [accessToken, setAccessToken] = useState(null);
  const [play, setPlay] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(initialTrackIndex);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrackUri, setCurrentTrackUri] = useState(initialTrackIndex);

  const prevTrackIndexRef = useRef(initialTrackIndex);
  const playerInitializedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    handleSeek: async (position) => {
      if (accessToken && deviceId) {
        try {
          await spotifyApi.seek(accessToken, position, deviceId);
        } catch (error) {
          console.error('Error seeking:', error);
        }
      }
    },
  }));

  // Fetch access token
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getAccessToken();
      setAccessToken(token);
    };
    fetchToken();
  }, []);

  // Handle track index change
  useEffect(() => {
    if (prevTrackIndexRef.current !== initialTrackIndex) {
      setPlay(false);
      setCurrentTrackIndex(initialTrackIndex);
      prevTrackIndexRef.current = initialTrackIndex;
    }
  }, [initialTrackIndex]);

  useEffect(() => {
    console.log('Play', play);
  }, [play]);

  // Handle the player callback
  const handlePlayerCallback = (state) => {
    if (!state) {
      console.warn('Player state is null or undefined.');
      return;
    }
  
    // Update play state
    if (state.isPlaying !== play) {
      setPlay(state.isPlaying);
    }
  
    // Update progress
    if (state.position && state.duration && onProgress) {
      onProgress(state.position, state.duration);
    }
  
    // Initialize player if not already done
    if (!playerInitializedRef.current && state.deviceId) {
      playerInitializedRef.current = true;
      setDeviceId(state.deviceId);
      onPlayerInit?.(state.deviceId);
    }
  
    // Detect track change
    if (state.track?.currentTrackUri && state.track.currentTrackUri !== currentTrackUri) {
      setCurrentTrackUri(state.track.currentTrackUri);
  
      // Notify parent about track change
      if (onTrackChange) {
        onTrackChange(state.track.currentTrackUri);
      }
    }
  };

  // Poll playback state at regular intervals
  useEffect(() => {
    let pollInterval = null;
  
    const pollPlaybackState = async () => {
      try {
        const state = await spotifyApi.getPlaybackState(accessToken);
        
        if (state?.progress_ms != null && state?.item?.duration_ms != null) {
          onProgress(state.progress_ms, state.item.duration_ms);
        }
      } catch (error) {
        console.error('Error polling playback state:', error);
      }
    };
  
    if (play && accessToken) {
      pollInterval = setInterval(pollPlaybackState, 1000);
      pollPlaybackState();
    }
  
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [play, accessToken, onProgress]);

  return (
    <div className="spotify-player-wrapper"
        onMouseDown={(e) => e.preventDefault()} // Prevents focus on mouse click
        onMouseUp={(e) => e.preventDefault()}   // Prevents selection on mouse up
      >   
      {accessToken ? (
        <SpotifyPlayer
          token={accessToken}
          uris={playlistUris}
          offset={currentTrackIndex}
          play={play}
          showSaveIcon
          styles={{
            activeColor: '#1db954',
            bgColor: '#333',
            color: '#fff',
            loaderColor: '#fff',
            sliderColor: '#1db954',
            sliderHandleColor: '#ffffff',
            trackArtistColor: '#ccc',
            trackNameColor: '#fff',
          }}
          layout={'responsive'}
          autoPlay={true}
          callback={handlePlayerCallback}
        />
      ) : (
        <p>Loading Spotify Web Player...</p>
      )}
    </div>
  );
});

export default SpotifyWebPlayer;