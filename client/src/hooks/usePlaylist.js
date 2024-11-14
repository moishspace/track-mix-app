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

const usePlaylist = (setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

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
      const playlistData = await fetchPlaylistTracks(selectedPlaylist);
  
      // Step 1: Process the basic track data
      const basicTracks = playlistData.map((item, index) => {
        const track = item.track || {};
        const artistsArray = track.artists || [];
        const artistsName = artistsArray.map((artist) => artist.name).join(', ');
  
        return {
          id: track.id || `unknown-id-${index}`,
          name: track.name || 'Unknown Track',
          artistsName: artistsName || 'Unknown Artist',
          album: track.album || {},
          duration_ms: track.duration_ms || null,
          preview_url: track.preview_url || null,
        };
      });
  
      // Step 2: Update UI immediately with basic track data
      setFilteredTracks(basicTracks);
  
      // Step 3: Fetch additional details asynchronously and update state
      basicTracks.forEach((track) => {
        fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
      });
  
      // Step 4: Update the selected track IDs based on the current playlist
      const trackIds = basicTracks.map((track) => track.id);
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

  return {
    playlists,
    selectedPlaylist,
    handlePlaylistChange,
    handleShowPlaylist,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
  };
};

export default usePlaylist;