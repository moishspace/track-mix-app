import React, { useEffect, useState, useRef } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import PlayIcon from './icons/Play.tsx';
import PauseIcon from './icons/Pause.tsx';
import NextIcon from './icons/Next.tsx';
import PreviousIcon from './icons/Previous.tsx';
import VolumeHighIcon from './icons/VolumeHigh.tsx';
import VolumeMidIcon from './icons/VolumeMid.tsx';
import VolumeLowIcon from './icons/VolumeLow.tsx';
import VolumeMuteIcon from './icons/VolumeMute.tsx';
import ShuffleIcon from './icons/Shuffle.tsx';
import RepeatIcon from './icons/Repeat.tsx';
import RepeatOneIcon from './icons/RepeatOne.tsx';
import '../styles/CustomPlayer.css';
import { getAccessToken } from '../services/api';

const spotifyApi = new SpotifyWebApi();

const CustomPlayer = ({ accessToken, uris = [], initialTrackIndex = 0, onPlayerInit }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const currentTrackIndexRef = useRef(initialTrackIndex);

  const initializePlayer = () => {
    const spotifyPlayer = new window.Spotify.Player({
      name: 'Custom Spotify Web Player',
      getOAuthToken: async (cb) => {
        const token = await getAccessToken();
        cb(token);
        spotifyApi.setAccessToken(token);
      },
      volume: 0.5,
    });

    spotifyPlayer.addListener('ready', ({ device_id }) => {
      setDeviceId(device_id);
      setPlayer(spotifyPlayer);

      if (onPlayerInit) {
        onPlayerInit(spotifyPlayer);
      }

      activatePlayerDevice(device_id);
    });

    spotifyPlayer.connect();
  };


  const activatePlayerDevice = async (deviceId) => {
    try {
      await spotifyApi.transferMyPlayback([deviceId], { play: false });
    } catch (error) {
      console.error('Error activating player device:', error);
    }
  };

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getAccessToken();
      spotifyApi.setAccessToken(token);
      console.log("Access token refreshed.");
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }
  }, []);

  useEffect(() => {
    let progressInterval;

    if (isPlaying) {
      progressInterval = setInterval(async () => {
        try {
          const playbackState = await spotifyApi.getMyCurrentPlaybackState();
          if (playbackState && playbackState.is_playing) {
            setProgress(playbackState.progress_ms);
          }
        } catch (error) {
          console.error('Error updating progress:', error);
        }
      }, 1000);
    }

    return () => clearInterval(progressInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (initialTrackIndex >= 0 && initialTrackIndex < uris.length) {
      currentTrackIndexRef.current = initialTrackIndex;
      setIsPlaying(false);
      loadTrack();
    }
  }, [initialTrackIndex, uris]);

  const loadTrack = async () => {
    if (!deviceId || uris.length === 0) {
      console.error("Cannot load track: Missing device ID or URIs");
      return;
    }
  
    try {
      console.log(`Loading track at index ${currentTrackIndexRef.current}`);
      await spotifyApi.transferMyPlayback([deviceId], { play: false });
  
      // Attempt to play the selected track
      await spotifyApi.play({
        device_id: deviceId,
        uris,
        offset: { position: currentTrackIndexRef.current },
      });
  
      // Try pausing the track immediately
      try {
        await spotifyApi.pause();
      } catch (error) {
        console.warn("Pause request failed. The response might not be JSON:");
        if (error.response && typeof error.response === "string") {
          console.warn("Raw response:", error.response);
        } else {
          console.error("Error object:", error);
        }
      }
  
      console.log("Track loaded but not playing.");
      fetchTrackInfo();
      setIsPlaying(false);
    } catch (error) {
      console.error("Error loading track:", error);
  
      // If the error response is a plain text or non-JSON response
      if (error.response && typeof error.response === "string") {
        console.error("Non-JSON response from Spotify API:", error.response);
      } else {
        console.error("Unexpected error object:", error);
      }
    }
  };

  const playTrack = async () => {
    if (!deviceId || !uris || uris.length === 0) {
      console.error("Cannot play track: Missing device ID or URIs");
      return;
    }

    try {
      await spotifyApi.play({
        device_id: deviceId,
        uris,
        offset: { position: currentTrackIndexRef.current },
      });
      setIsPlaying(true);
      fetchTrackInfo();
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  const togglePlayPause = async () => {
    if (!trackInfo) {
      console.warn("No track loaded. Play/Pause action ignored.");
      return;
    }

    try {
      const playbackState = await spotifyApi.getMyCurrentPlaybackState();
      if (playbackState && playbackState.is_playing) {
        await spotifyApi.pause();
        setIsPlaying(false);
      } else {
        await playTrack();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  const skipToNext = async () => {
    try {
      await spotifyApi.skipToNext();
      fetchTrackInfo();
    } catch (error) {
      console.error("Error skipping to next track:", error);
    }
  };

  const skipToPrevious = async () => {
    try {
      await spotifyApi.skipToPrevious();
      fetchTrackInfo();
    } catch (error) {
      console.error("Error skipping to previous track:", error);
    }
  };

    // Updated toggleShuffle function
    const toggleShuffle = async () => {
      if (!trackInfo) {
        console.warn("No track loaded. Shuffle action ignored.");
        return;
      }
  
      try {
        const newShuffleState = !shuffle;
        await spotifyApi.setShuffle(newShuffleState);
        setShuffle(newShuffleState);
      } catch (error) {
        console.error("Error toggling shuffle:", error);
      }
    };
  
    // Updated toggleRepeat function
    const toggleRepeat = async () => {
      if (!trackInfo) {
        console.warn("No track loaded. Repeat action ignored.");
        return;
      }
  
      try {
        const newRepeatState = repeat === 'off' ? 'context' : repeat === 'context' ? 'track' : 'off';
        await spotifyApi.setRepeat(newRepeatState);
        setRepeat(newRepeatState);
      } catch (error) {
        console.error("Error toggling repeat:", error);
      }
    };

  const handleProgressChange = async (e) => {
    if (!trackInfo) {
      console.warn("No track loaded. Progress change action ignored.");
      return;
    }

    try {
      const newProgress = parseInt(e.target.value, 10);
      setProgress(newProgress);
      await spotifyApi.seek(newProgress);
    } catch (error) {
      console.error("Error seeking track:", error);
    }
  };

  const fetchTrackInfo = async () => {
    try {
      const playbackState = await spotifyApi.getMyCurrentPlaybackState();
      if (playbackState && playbackState.item) {
        setTrackInfo(playbackState.item);
        setIsPlaying(playbackState.is_playing);
        setProgress(playbackState.progress_ms);
      }
    } catch (error) {
      console.error("Error fetching track info:", error);
    }
  };

  const renderVolumeIcon = () => {
    if (volume === 0) return <VolumeMuteIcon />;
    if (volume < 30) return <VolumeLowIcon />;
    if (volume < 70) return <VolumeMidIcon />;
    return <VolumeHighIcon />;
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };


  return (
<div className="custom-player">
  <div className="track-info">
    {trackInfo && (
      <>
        <img src={trackInfo.album.images[0]?.url} alt="Album Art" />
        <div className="track-details">
          <a href={trackInfo.album.external_urls.spotify} target="_blank" rel="noopener noreferrer">
            <h3>{trackInfo.name}</h3>
          </a>
          <a href={trackInfo.artists[0].external_urls.spotify} target="_blank" rel="noopener noreferrer">
            <p>{trackInfo.artists.map((artist) => artist.name).join(', ')}</p>
          </a>
        </div>
      </>
    )}
  </div>

  <div className="center-controls">
    <div className="player-controls">
      <ShuffleIcon onClick={toggleShuffle} className={`icon-button ${shuffle ? 'active' : ''}`} />
      <PreviousIcon onClick={skipToPrevious} className="icon-button" />
      {isPlaying ? (
        <PauseIcon onClick={togglePlayPause} className="play-button" />
      ) : (
        <PlayIcon onClick={togglePlayPause} className="play-button" />
      )}
      <NextIcon onClick={skipToNext} className="icon-button" />
      {repeat === 'off' ? (
        <RepeatIcon onClick={toggleRepeat} className="icon-button" />
      ) : repeat === 'context' ? (
        <RepeatIcon onClick={toggleRepeat} className="icon-button active" />
      ) : (
        <RepeatOneIcon onClick={toggleRepeat} className="icon-button active" />
      )}
    </div>
    <div className="progress-container">
      <span className="time">{formatTime(progress)}</span>
      <input type="range" className="progress-bar" value={progress} max={trackInfo?.duration_ms || 100} onChange={handleProgressChange} />
      <span className="time">{formatTime(trackInfo?.duration_ms || 0)}</span>
    </div>
  </div>

  <div className="volume-control">
    {renderVolumeIcon()}
    <input
      type="range"
      className="volume-slider"
      value={volume}
      max="100"
      onChange={(e) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        player?.setVolume(newVolume / 100);
      }}
    />
  </div>
</div>
  );
};

export default CustomPlayer;