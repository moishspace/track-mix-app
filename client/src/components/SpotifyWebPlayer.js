import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import SpotifyPlayer, { spotifyApi } from 'react-spotify-web-playback';
import { getAccessToken } from '../services/api';

// Detect if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' &&
    (window.process?.type === 'renderer' ||
     window.navigator?.userAgent?.toLowerCase().includes('electron'));
};

const SpotifyWebPlayer = forwardRef(({ processedTracks, playlistUris = [], initialTrackIndex = 0, currentTrackIndex = 0, setCurrentTrackIndex, onProgress, onPlayerInit }, ref) => {
  const [accessToken, setAccessToken] = useState(null);
  const [play, setPlay] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrackUri, setCurrentTrackUri] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Electron/Connect specific state
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(50);
  const [showDevices, setShowDevices] = useState(false);

  const playerInitializedRef = useRef(false);
  const runningInElectron = isElectron();

  useImperativeHandle(ref, () => ({
    handleSeek: async (position) => {
      if (accessToken) {
        try {
          if (runningInElectron && selectedDevice) {
            await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
          } else if (deviceId) {
            await spotifyApi.seek(accessToken, position, deviceId);
          }
        } catch (error) {
          // Silent fail
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

  // Fetch available devices (for Electron/Connect mode)
  const fetchDevices = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      setDevices(data.devices || []);

      // Auto-select first active device or first available
      if (data.devices?.length > 0 && !selectedDevice) {
        const activeDevice = data.devices.find(d => d.is_active) || data.devices[0];
        setSelectedDevice(activeDevice.id);
        setIsReady(true);
        onPlayerInit?.(activeDevice.id);
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Fetch devices on mount and periodically (Electron mode)
  useEffect(() => {
    if (runningInElectron && accessToken) {
      fetchDevices();
      const interval = setInterval(fetchDevices, 5000);
      return () => clearInterval(interval);
    }
  }, [accessToken, runningInElectron]);

  // Play track on selected device (Electron/Connect mode)
  const playOnDevice = async (trackUri, deviceId) => {
    if (!accessToken || !deviceId) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: playlistUris,
          offset: { uri: trackUri }
        })
      });
      setPlay(true);
    } catch (error) {
      // Silent fail
    }
  };

  // Pause playback (Electron/Connect mode)
  const pausePlayback = async () => {
    if (!accessToken) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setPlay(false);
    } catch (error) {
      // Silent fail
    }
  };

  // Resume playback (Electron/Connect mode)
  const resumePlayback = async () => {
    if (!accessToken) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setPlay(true);
    } catch (error) {
      // Silent fail
    }
  };

  // Skip to next track
  const skipToNext = async () => {
    if (!accessToken) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (error) {
      // Silent fail
    }
  };

  // Skip to previous track
  const skipToPrevious = async () => {
    if (!accessToken) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } catch (error) {
      // Silent fail
    }
  };

  // Set volume
  const setPlayerVolume = async (volumePercent) => {
    if (!accessToken) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setVolume(volumePercent);
    } catch (error) {
      // Silent fail
    }
  };

  // Seek to position
  const seekToPosition = async (positionMs) => {
    if (!accessToken) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setCurrentPosition(positionMs);
    } catch (error) {
      // Silent fail
    }
  };

  // Poll playback state (Electron/Connect mode)
  useEffect(() => {
    if (!runningInElectron || !accessToken) return;

    const pollPlaybackState = async () => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.status === 204) return;

        const state = await response.json();

        if (state) {
          setCurrentPosition(state.progress_ms || 0);
          setDuration(state.item?.duration_ms || 0);
          setPlay(state.is_playing);
          setCurrentTrack(state.item);
          setVolume(state.device?.volume_percent || 50);

          if (onProgress && state.progress_ms != null && state.item?.duration_ms) {
            onProgress(state.progress_ms, state.item.duration_ms);
          }

          if (state.item?.id && state.item.id !== currentTrackUri) {
            setCurrentTrackUri(state.item.id);
            const trackIndex = processedTracks.findIndex(track => track.id === state.item.id);
            if (trackIndex !== -1 && trackIndex !== currentTrackIndex) {
              setCurrentTrackIndex(trackIndex);
            }
          }
        }
      } catch (error) {
        // Silent fail
      }
    };

    pollPlaybackState();
    const interval = setInterval(pollPlaybackState, 1000);
    return () => clearInterval(interval);
  }, [runningInElectron, accessToken, currentTrackUri, processedTracks, currentTrackIndex, setCurrentTrackIndex, onProgress]);

  // Handle track selection change (Electron mode)
  useEffect(() => {
    if (runningInElectron && accessToken && selectedDevice && playlistUris[initialTrackIndex]) {
      playOnDevice(playlistUris[initialTrackIndex], selectedDevice);
    }
  }, [initialTrackIndex, runningInElectron, selectedDevice]);

  // Handle the player callback (Web Playback SDK mode)
  const handlePlayerCallback = (state) => {
    if (!state) return;

    if (state.status === 'READY' && !isReady) {
      setIsReady(true);
    }

    if (state.isPlaying !== undefined && state.isPlaying !== play) {
      setPlay(state.isPlaying);
    }

    if (state.progressMs !== undefined && state.durationMs && onProgress) {
      onProgress(state.progressMs, state.durationMs);
    }

    if (!playerInitializedRef.current && state.deviceId) {
      playerInitializedRef.current = true;
      setDeviceId(state.deviceId);
      onPlayerInit?.(state.deviceId);
    }

    if (state.track?.id && state.track.id !== currentTrackUri) {
      const newTrackId = state.track.id;
      setCurrentTrackUri(newTrackId);

      const trackIndex = processedTracks.findIndex((track) => track.id === state.track.id);
      if (trackIndex !== -1 && trackIndex !== currentTrackIndex && trackIndex < processedTracks.length) {
        setCurrentTrackIndex(trackIndex);
      }
    }
  };

  // Poll playback state for Web SDK mode
  useEffect(() => {
    if (runningInElectron) return;

    let pollInterval = null;

    const pollPlaybackState = async () => {
      try {
        const state = await spotifyApi.getPlaybackState(accessToken);
        if (state?.progress_ms != null && state?.item?.duration_ms != null) {
          onProgress(state.progress_ms, state.item.duration_ms);
        }
      } catch (error) {
        // Silent fail
      }
    };

    if (play && accessToken) {
      pollInterval = setInterval(pollPlaybackState, 500);
      pollPlaybackState();
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [play, accessToken, onProgress, runningInElectron]);

  const validOffset = initialTrackIndex >= 0 && initialTrackIndex < playlistUris.length
    ? initialTrackIndex
    : 0;

  const hasValidUris = playlistUris.length > 0;

  // Format time for display
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Electron/Connect mode - Spotify-like player UI
  if (runningInElectron) {
    const selectedDeviceName = devices.find(d => d.id === selectedDevice)?.name || 'No device';

    return (
      <div style={{
        backgroundColor: '#282828',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '80px',
        boxSizing: 'border-box',
        borderRadius: '8px'
      }}>
        {/* Left: Track Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 30%', minWidth: 0 }}>
          {currentTrack?.album?.images?.[2] ? (
            <img
              src={currentTrack.album.images[2].url}
              alt=""
              style={{ width: '56px', height: '56px', borderRadius: '4px' }}
            />
          ) : (
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#333',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#b3b3b3">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px'
            }}>
              {currentTrack?.name || 'No track selected'}
            </div>
            <div style={{
              color: '#b3b3b3',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px'
            }}>
              {currentTrack?.artists?.map(a => a.name).join(', ') || '—'}
            </div>
          </div>
        </div>

        {/* Center: Controls & Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 40%', gap: '4px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={skipToPrevious}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b3b3b3',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#b3b3b3'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.576a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"/>
              </svg>
            </button>
            <button
              onClick={play ? pausePlayback : resumePlayback}
              style={{
                backgroundColor: '#fff',
                border: 'none',
                color: '#000',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {play ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"/>
                </svg>
              )}
            </button>
            <button
              onClick={skipToNext}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b3b3b3',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e) => e.currentTarget.style.color = '#b3b3b3'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"/>
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '400px' }}>
            <span style={{ fontSize: '11px', color: '#b3b3b3', minWidth: '40px', textAlign: 'right' }}>
              {formatTime(currentPosition)}
            </span>
            <div
              style={{
                flex: 1,
                height: '4px',
                backgroundColor: '#4d4d4d',
                borderRadius: '2px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const newPosition = Math.floor(percent * duration);
                seekToPosition(newPosition);
              }}
            >
              <div style={{
                width: duration > 0 ? `${(currentPosition / duration) * 100}%` : '0%',
                height: '100%',
                backgroundColor: '#1db954',
                borderRadius: '2px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  right: '-6px',
                  top: '-4px',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#fff',
                  borderRadius: '50%',
                  opacity: 0,
                  transition: 'opacity 0.1s'
                }} />
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#b3b3b3', minWidth: '40px' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Device */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', flex: '0 0 30%' }}>
          {/* Device selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { fetchDevices(); setShowDevices(!showDevices); }}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: devices.length > 0 ? '#1db954' : '#b3b3b3',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={selectedDeviceName}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15h-6.5A1.75 1.75 0 0 1 6 13.25V2.75zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25h-6.5zm-6 0a.25.25 0 0 0-.25.25v6.5c0 .138.112.25.25.25H4V11H1.75A1.75 1.75 0 0 1 0 9.25v-6.5C0 1.784.784 1 1.75 1H4v1.5H1.75zM4 15H1.75A1.75 1.75 0 0 1 0 13.25v-1.5h1.5v1.5c0 .138.112.25.25.25H4V15z"/>
              </svg>
            </button>
            {showDevices && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                marginBottom: '8px',
                backgroundColor: '#282828',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '8px 0',
                minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 1000
              }}>
                <div style={{ padding: '8px 16px', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                  Connect to a device
                </div>
                {devices.length === 0 ? (
                  <div style={{ padding: '12px 16px', color: '#b3b3b3', fontSize: '12px' }}>
                    No devices found. Open Spotify on another device.
                  </div>
                ) : (
                  devices.map(device => (
                    <div
                      key={device.id}
                      onClick={() => { setSelectedDevice(device.id); setShowDevices(false); }}
                      style={{
                        padding: '8px 16px',
                        color: device.id === selectedDevice ? '#1db954' : '#fff',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15h-6.5A1.75 1.75 0 0 1 6 13.25V2.75z"/>
                      </svg>
                      {device.name}
                      {device.is_active && <span style={{ color: '#1db954', fontSize: '10px' }}>(Active)</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Volume */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setPlayerVolume(volume === 0 ? 50 : 0)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#b3b3b3',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06z"/>
                  <path d="M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.642 3.642 0 0 0-1.33 4.967 3.639 3.639 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.73 4.73 0 0 1-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"/>
                </svg>
              ) : volume < 50 ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a2.999 2.999 0 0 1 0 5.175v1.649z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setPlayerVolume(parseInt(e.target.value))}
              style={{
                width: '80px',
                height: '4px',
                WebkitAppearance: 'none',
                backgroundColor: '#4d4d4d',
                borderRadius: '2px',
                cursor: 'pointer',
                accentColor: '#1db954'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Browser mode - Web Playback SDK
  return (
    <div className="spotify-player-wrapper"
        onMouseDown={(e) => e.preventDefault()}
        onMouseUp={(e) => e.preventDefault()}
      >
      {accessToken && hasValidUris ? (
        <SpotifyPlayer
          token={accessToken}
          uris={playlistUris}
          offset={validOffset}
          play={play}
          name="Track Mix Player"
          showSaveIcon
          persistDeviceSelection
          syncExternalDevice
          magnifySliderOnHover
          initialVolume={0.5}
          styles={{
            activeColor: '#1db954',
            bgColor: '#282828',
            color: '#fff',
            loaderColor: '#fff',
            sliderColor: '#1db954',
            sliderHandleColor: '#ffffff',
            trackArtistColor: '#b3b3b3',
            trackNameColor: '#fff',
            height: 80,
          }}
          layout={'responsive'}
          callback={handlePlayerCallback}
        />
      ) : !accessToken ? (
        <p style={{ color: '#b3b3b3', textAlign: 'center', padding: '20px' }}>Loading Spotify Web Player...</p>
      ) : (
        <p style={{ color: '#b3b3b3', textAlign: 'center', padding: '20px' }}>No tracks available to play</p>
      )}
    </div>
  );
});

export default SpotifyWebPlayer;
