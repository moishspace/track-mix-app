import { useEffect } from 'react';
import { searchSimilarTracks, fetchAndUpdateTrackDetails } from '../services/api';

const useSimilarTracks = (selectedTrack, criteria, setFilteredTracks, setTrackDetails) => {
  // Define the searchSimilar function
  const searchSimilar = async () => {
    if (!selectedTrack) {
      alert("Please select a track to find similar tracks.");
      return;
    }

    try {
      const trackId = selectedTrack.id;
      const trackData = setTrackDetails[trackId] || {};
      // Construct criteria parameters
      const criteriaParams = {
        trackId,
        genre: criteria?.genre || trackData?.genres,
        min_tempo: criteria?.tempo?.min,
        max_tempo: criteria?.tempo?.max,
        min_danceability: criteria?.danceability?.min,
        max_danceability: criteria?.danceability?.max,
        min_energy: criteria?.energy?.min,
        max_energy: criteria?.energy?.max,
        min_valence: criteria?.valence?.min,
        max_valence: criteria?.valence?.max,
        min_acousticness: criteria?.acousticness?.min,
        max_acousticness: criteria?.acousticness?.max,
        min_instrumentalness: criteria?.instrumentalness?.min,
        max_instrumentalness: criteria?.instrumentalness?.max,
        min_liveness: criteria?.liveness?.min,
        max_liveness: criteria?.liveness?.max,
      };

      // Fetch similar tracks based on the provided criteria
      const basicSimilarTracks = await searchSimilarTracks(criteriaParams);
      const trackIds = basicSimilarTracks.map((track) => track.id);

      // Update UI immediately with basic similar tracks
      setFilteredTracks(basicSimilarTracks);

      // Fetch additional details for each similar track and update the state
      basicSimilarTracks.forEach((track) => {
        fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
      });
    } catch (error) {
      console.error("Error fetching similar tracks:", error);
      alert("Failed to fetch similar tracks. Please try again.");
    }
  };

  // Return the searchSimilar function from the hook
  return { searchSimilar };
};

export default useSimilarTracks;