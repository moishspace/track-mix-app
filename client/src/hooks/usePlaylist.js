// usePlaylist.js
import { useState, useEffect } from 'react';
import {
  fetchPlaylists,
  fetchPlaylistTracks,
  createPlaylist,
  addTracksToPlaylist,
  deletePlaylist,
  fetchAndUpdateTrackDetails,
} from '../services/api';

import useExportToCSV from './useExportToCSV';


const usePlaylist = (filteredTracks, trackDetails, setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const exportToCSV = useExportToCSV();

  // Fetch the list of playlists when the hook is initialized
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const fetchedPlaylists = await fetchPlaylists();
        setPlaylists(fetchedPlaylists);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };
    loadPlaylists();
  }, []);

  // Handle playlist selection change
  const handlePlaylistChange = (event) => {
    const newPlaylistId = event.target.value;
    setSelectedPlaylist(newPlaylistId);
  };

  // Show the selected playlist and update the track details
  const handleShowPlaylist = async () => {
    if (!selectedPlaylist) {
      alert("Please select a playlist to show.");
      return;
    }

    try {
      let allTracks = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      // Fetch all pages of tracks
      while (hasMore) {
        const response = await fetchPlaylistTracks(selectedPlaylist, offset, limit);
        const playlistData = response.items || [];

        if (playlistData.length === 0) {
          hasMore = false;
          break;
        }

        // Process the tracks from this page
        const basicTracks = playlistData.map((item, index) => {
          const track = item.track || {};
          const artistsArray = track.artists || [];
          const artistsName = artistsArray.map((artist) => artist.name).join(', ');

          return {
            id: track.id || `unknown-id-${offset + index}`,
            name: track.name || 'Unknown Track',
            artistsName: artistsName || 'Unknown Artist',
            album: track.album || {},
            duration_ms: track.duration_ms || null,
            preview_url: track.preview_url || null,
          };
        });

        allTracks = allTracks.concat(basicTracks);

        // Update UI immediately with current tracks
        setFilteredTracks([...allTracks]);

        // Fetch additional details asynchronously
        basicTracks.forEach((track) => {
          fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
        });

        // Check if there are more pages
        if (response.next && playlistData.length === limit) {
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      // Update the selected track IDs based on the current playlist
      const trackIds = allTracks.map((track) => track.id);
      const selectedIdsInPlaylist = trackIds.filter((id) => selectedTrackIds.includes(id));
      setSelectedTrackIds(selectedIdsInPlaylist);
      setSelectAllChecked(selectedIdsInPlaylist.length === trackIds.length);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  };

  // Create a new playlist
  const handleCreatePlaylist = async (playlistData) => {
    try {
      const newPlaylist = await createPlaylist(playlistData);
      setPlaylists((prevPlaylists) => [...prevPlaylists, newPlaylist]);
      setSelectedPlaylist(newPlaylist.id);
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  // Add selected tracks to the current playlist
  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist) {
      alert("Please select a playlist.");
      return;
    }
    if (selectedTrackIds.length === 0) {
      alert("Please select at least one track to add.");
      return;
    }

    try {
      await addTracksToPlaylist(selectedPlaylist, selectedTrackIds);
      alert("Tracks added to playlist successfully!");
    } catch (error) {
      console.error("Error adding tracks to playlist:", error);
      alert("Failed to add tracks to playlist.");
    }
  };

  // Delete a playlist
  const handleDeletePlaylist = async (playlist) => {
    try {
      await deletePlaylist(playlist.id);
      const updatedPlaylists = playlists.filter((p) => p.id !== playlist.id);
      setPlaylists(updatedPlaylists);

      // Update the selected playlist if the current one was deleted
      if (selectedPlaylist === playlist.id) {
        setSelectedPlaylist(updatedPlaylists.length > 0 ? updatedPlaylists[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      alert("Failed to delete playlist.");
    }
  };

  // Export to CSV
  const handleExportPlaylist = () => {
    if (!selectedPlaylist) {
      alert("Please select a playlist to export.");
      return;
    }
  
    if (!filteredTracks || filteredTracks.length === 0) {
      alert("No tracks available in the selected playlist.");
      return;
    }
    exportToCSV(filteredTracks);
  };

  return {
    playlists,
    selectedPlaylist,
    handlePlaylistChange,
    handleShowPlaylist,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
    handleExportPlaylist,
  };
};

export default usePlaylist;