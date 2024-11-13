// useTrackSearch.js
import { useState, useEffect } from 'react';
import { searchTracks, fetchDetailsWithDelays } from '../services/api';

const useTrackSearch = (searchTerm) => {
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});

  useEffect(() => {
    if (searchTerm) {
      (async () => {
        try {
          const tracks = await searchTracks(searchTerm);
          const trackIds = tracks.map((track) => track.id);
          const details = await fetchDetailsWithDelays(trackIds);
          const updatedTracks = tracks.map((track) => ({ ...track, ...details[track.id] }));
          setFilteredTracks(updatedTracks);
          setTrackDetails(details);
        } catch (error) {
          console.error('Error fetching tracks:', error);
        }
      })();
    }
  }, [searchTerm]);

  return { filteredTracks, trackDetails };
};

export default useTrackSearch;