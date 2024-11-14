import { useState, useEffect } from 'react';
import { searchTracks, fetchAndUpdateTrackDetails } from '../services/api';

const useTrackSearch = (searchTerm) => {
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});

  useEffect(() => {
    if (searchTerm) {
      (async () => {
        try {
          // Step 1: Fetch basic track data
          const basicTracks = await searchTracks(searchTerm);

          // Step 2: Update UI immediately with basic track data
          setFilteredTracks(basicTracks);

          // Step 3: Fetch additional details and update state directly
          basicTracks.forEach((track) => {
            fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
          });
        } catch (error) {
          console.error("Error fetching search tracks:", error);
        }
      })();
    }
  }, [searchTerm]);

  return {
    filteredTracks,
    trackDetails,
    setFilteredTracks,
    setTrackDetails,
  };
};

export default useTrackSearch;