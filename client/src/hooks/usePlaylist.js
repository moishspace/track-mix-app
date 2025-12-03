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


const usePlaylist = (filteredTracks, trackDetails, setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked, setPlaylistTotal) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistFetchController, setPlaylistFetchController] = useState(null);
  const [playlistCache, setPlaylistCache] = useState({}); // Cache for playlist tracks
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

  // Update cache with track details as they're fetched
  useEffect(() => {
    if (selectedPlaylist && filteredTracks.length > 0) {
      // Update the cache with current tracks and details
      setPlaylistCache((prevCache) => {
        const existing = prevCache[selectedPlaylist];
        return {
          ...prevCache,
          [selectedPlaylist]: {
            tracks: filteredTracks,
            details: trackDetails,
            total: existing?.total, // Preserve the total from initial fetch
            cachedAt: new Date().toISOString()
          }
        };
      });
    }
  }, [selectedPlaylist, filteredTracks, trackDetails]);

  // Handle playlist selection change
  const handlePlaylistChange = (event) => {
    const newPlaylistId = event.target.value;
    setSelectedPlaylist(newPlaylistId);
  };

  // Show the selected playlist and update the track details
  const handleShowPlaylist = (playlistId = null) => {
    // Use provided playlistId or fall back to selectedPlaylist state
    const targetPlaylist = playlistId || selectedPlaylist;

    if (!targetPlaylist) {
      alert("Please select a playlist to show.");
      return;
    }

    // Clear tracks first when switching playlists to avoid showing old data
    setFilteredTracks([]);
    setTrackDetails({});

    // Check if playlist is already in cache
    if (playlistCache[targetPlaylist]) {
      console.log(`✓ Loading playlist from cache: ${targetPlaylist}`);
      const cached = playlistCache[targetPlaylist];
      setFilteredTracks(cached.tracks);

      // Set the total from cache
      if (cached.total !== undefined && setPlaylistTotal) {
        setPlaylistTotal(cached.total);
      }

      // Load cached details if available
      if (cached.details && Object.keys(cached.details).length > 0) {
        setTrackDetails(cached.details);
      }
      return;
    }

    console.log(`⚠ Cache miss for playlist: ${targetPlaylist}, fetching from Spotify...`);

    // Cancel any ongoing playlist fetch
    if (playlistFetchController) {
      playlistFetchController.abort();
    }

    // Create new abort controller for this fetch
    const controller = new AbortController();
    setPlaylistFetchController(controller);

    // Don't clear tracks immediately - keep old ones visible until new ones arrive
    // This provides better UX during the initial API call

    // Fetch all pages in background (non-blocking)
    const fetchAllPages = async () => {
      try {
        let allTracks = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;
        let totalTracks = 0;

        // Fetch all pages of tracks
        while (hasMore && !controller.signal.aborted) {
          const response = await fetchPlaylistTracks(targetPlaylist, offset, limit);

          // Check if cancelled after API call
          if (controller.signal.aborted) {
            console.log('Playlist fetch cancelled');
            return;
          }

          // Get total from first response and set it immediately
          if (offset === 0 && response.total !== undefined) {
            totalTracks = response.total;
            if (setPlaylistTotal) {
              setPlaylistTotal(totalTracks);
            }
            console.log(`Playlist total tracks: ${totalTracks}`);

            // Update cache with the total immediately
            setPlaylistCache((prevCache) => ({
              ...prevCache,
              [targetPlaylist]: {
                tracks: [],
                details: {},
                total: totalTracks,
                cachedAt: new Date().toISOString()
              }
            }));
          }

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

          // Update UI immediately with current tracks (only if not cancelled)
          if (!controller.signal.aborted) {
            setFilteredTracks([...allTracks]);

            // Fetch additional details asynchronously
            basicTracks.forEach((track) => {
              fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
            });
          }

          // Check if there are more pages
          if (response.next && playlistData.length === limit) {
            offset += limit;
          } else {
            hasMore = false;
          }
        }
        // Cache will be automatically updated by the useEffect
      } catch (error) {
        if (error.name === 'AbortError' || controller.signal.aborted) {
          console.log('Playlist fetch aborted');
        } else {
          console.error("Error fetching playlist tracks:", error);
        }
      }
    };

    // Start fetching in background (don't await)
    fetchAllPages();
  };

  // Create a new playlist
  const handleCreatePlaylist = async (playlistData) => {
    try {
      const newPlaylist = await createPlaylist(playlistData);
      setPlaylists((prevPlaylists) => [newPlaylist, ...prevPlaylists]);
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
  const handleDeletePlaylist = async (playlistId) => {
    try {
      await deletePlaylist(playlistId);
      const updatedPlaylists = playlists.filter((p) => p.id !== playlistId);
      setPlaylists(updatedPlaylists);

      // Update the selected playlist if the current one was deleted
      if (selectedPlaylist === playlistId) {
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