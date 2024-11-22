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
import { render } from '@testing-library/react';

const spotifyApi = new SpotifyWebApi();

const CustomPlayer = ({ accessToken, trackList = [], initialTrackIndex = 0, onPlayerInit }) => {
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(50);
  const [trackInfo, setTrackInfo] = useState(null);
  const currentTrackIndexRef = useRef(initialTrackIndex);
  const trackListUrisRef = useRef([]);

  // Initialize the Spotify Player
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
      console.log('Spotify player is ready:', device_id);

      if (onPlayerInit) {
        onPlayerInit(spotifyPlayer);
      }
    });

    spotifyPlayer.connect();
  };

  useEffect(() => {
    if (window.Spotify) {
      initializePlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initializePlayer;
    }
  }, []);

  useEffect(() => {
    const loadSelectedTrack = async () => {
      if (initialTrackIndex >= 0 && initialTrackIndex < trackList.length) {
        console.log(`Loading track info for index ${initialTrackIndex}`);
        currentTrackIndexRef.current = initialTrackIndex;
        fetchTrackInfo();
  
        setProgress(0);

        // Check playback state
        const playbackState = await spotifyApi.getMyCurrentPlaybackState();
  
        if (playbackState?.is_playing) {
          const currentTrackUri = playbackState?.item?.uri;
          const selectedTrackUri = trackListUrisRef.current[currentTrackIndexRef.current];
  
          if (currentTrackUri !== selectedTrackUri) {
            console.log("Switching to a new track:", selectedTrackUri);
            await spotifyApi.play({
              device_id: deviceId,
              uris: trackListUrisRef.current,
              offset: { position: currentTrackIndexRef.current },
            });
            setIsPlaying(true);
          }
        } else {
          setIsPlaying(false);
        }
      }
  
      // Update the track URIs reference
      trackListUrisRef.current = trackList.map((track) => track.uri);
    };
  
    loadSelectedTrack();
  }, [initialTrackIndex, trackList]);

  useEffect(() => {
    let progressInterval;
    if (isPlaying && trackInfo) {
      progressInterval = setInterval(updateProgress, 1000);
    }
    return () => clearInterval(progressInterval);
  }, [isPlaying, trackInfo ]);


  // Fetch Track Info
  const fetchTrackInfo = () => {
    const track = trackList[currentTrackIndexRef.current];
    if (track) {
      console.log('Fetching track info:', track);
      setTrackInfo({
        name: track.name,
        album: track.album,
        duration_ms: track.duration_ms,
      });
    } else {
      setTrackInfo(null);
    }
  };

  const updateProgress = async () => {
    try {
      const playbackState = await spotifyApi.getMyCurrentPlaybackState();
  
      if (playbackState && playbackState.item) {
        const currentTrackUri = playbackState.item.uri;
        const selectedTrackUri = trackListUrisRef.current[currentTrackIndexRef.current];
  
        // Ensure the progress is updated only for the correct track
        if (currentTrackUri === selectedTrackUri) {
          const currentProgress = playbackState.progress_ms || 0;
          const trackDuration = playbackState.item.duration_ms || 1; // Prevent division by zero
  
          if (currentProgress <= trackDuration) {
            setProgress(currentProgress);
            setTrackInfo({
              name: playbackState.item.name,
              album: playbackState.item.album,
              duration_ms: trackDuration,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const togglePlayPause = async () => {
    if (!trackInfo) {
      console.warn("No track loaded. Play/Pause action ignored.");
      return;
    }
  
    try {
      const playbackState = await spotifyApi.getMyCurrentPlaybackState();
      const currentTrackUri = playbackState?.item?.uri;
      const selectedTrackUri = trackListUrisRef.current[currentTrackIndexRef.current];
  
      if (currentTrackUri !== selectedTrackUri) {
        console.log("Switching to a new track:", selectedTrackUri);
  
        // Load the selected track before playing
        await spotifyApi.play({
          device_id: deviceId,
          uris: trackListUrisRef.current,
          offset: { position: currentTrackIndexRef.current },
        });
        setIsPlaying(true);
      } else {
        if (playbackState?.is_playing) {
          console.log("Pausing the current track");
          try {
            await spotifyApi.pause();
            console.log("Pause response successful");
            setIsPlaying(false);
          } catch (pauseError) {
            console.error("Error during pause:", pauseError);
          }
        } else {
          console.log("Resuming playback");
          try {
            await spotifyApi.play();
            console.log("Play response successful");
            setIsPlaying(true);
          } catch (playError) {
            console.error("Error during play:", playError);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  };

  // Handle Progress Change
  const handleProgressChange = async (e) => {
    if (!trackInfo) {
      console.warn("No track loaded. Progress change ignored.");
      return;
    }

    try {
      const newProgress = parseInt(e.target.value, 10);
      setProgress(newProgress);
      await spotifyApi.seek(newProgress);
      console.log("Seeked to:", newProgress);
    } catch (error) {
      console.error("Error seeking track:", error);
    }
  };

  const renderTrackInfo = () => {
    if (trackInfo) {
      const albumImageUrl = trackInfo?.album?.images?.[0]?.url || '';
      const albumUrl = trackInfo?.album?.external_urls?.spotify || '#';
      const artistNames = trackInfo?.album?.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist';
  
      return (
        <>
          <img src={albumImageUrl} alt="Album Art" />
          <div className="track-details">
            <a href={albumUrl} target="_blank" rel="noopener noreferrer">
              <h3>{trackInfo.name || 'Unknown Track'}</h3>
            </a>
            <p>
              {trackInfo?.album?.artists?.map((artist, index) => (
                <a
                  key={index}
                  href={artist?.external_urls?.spotify || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginRight: '5px' }}
                >
                  {artist.name}
                </a>
              ))}
            </p>
          </div>
        </>
      );
    } else {
      return <p>No track loaded</p>;
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
        {renderTrackInfo()}
      </div>
    
      <div className="center-controls">
        <div className="player-controls">
          {isPlaying ? (
            <PauseIcon onClick={togglePlayPause} className="play-button" />
          ) : (
            <PlayIcon onClick={togglePlayPause} className="play-button" />
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