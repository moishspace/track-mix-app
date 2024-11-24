import { useRef, useState, useCallback } from 'react';

const useTrackPlayer = (filteredTracks, setSelectedTrack, currentTrackIndex, setCurrentTrackIndex) => {
  const playerRef = useRef(null);
  const [trackProgress, setTrackProgress] = useState({ position: 0, duration: 0 });

  const handleProgressUpdate = useCallback((position, duration) => {
    setTrackProgress({ position, duration });
  }, []);

  const handleSeek = useCallback((position) => {
    if (playerRef.current?.handleSeek) {
      playerRef.current.handleSeek(position);
    } else {
      console.warn('handleSeek not available in playerRef.current');
    }
  }, []);

  const handleTrackChange = useCallback(
    (trackUri) => {
      const newTrackIndex = filteredTracks.findIndex(track => `spotify:track:${track.id}` === trackUri);
      if (newTrackIndex !== -1) {
        setCurrentTrackIndex(newTrackIndex);
        setSelectedTrack(filteredTracks[newTrackIndex]);
      }
    },
    [filteredTracks, setSelectedTrack]
  );

  return {
    playerRef,
    trackProgress,
    handleProgressUpdate,
    handleSeek,
    handleTrackChange,
  };
};

export default useTrackPlayer;