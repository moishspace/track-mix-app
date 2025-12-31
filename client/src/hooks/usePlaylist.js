// usePlaylist.js
import { useState, useEffect, useRef } from 'react';
import {
  fetchPlaylists,
  fetchPlaylistTracks,
  createPlaylist,
  addTracksToPlaylist,
  deletePlaylist,
  fetchAndUpdateTrackDetails,
  reorderPlaylistTracks,
  updatePlaylistDetails,
  removeTracksFromPlaylist,
  unlikeTracks,
} from '../services/api';

import useExportToCSV from './useExportToCSV';


const usePlaylist = (filteredTracks, trackDetails, setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked, setPlaylistTotal) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistFetchController, setPlaylistFetchController] = useState(null);
  const [currentlyFetchingPlaylist, setCurrentlyFetchingPlaylist] = useState(null);
  const currentlyFetchingPlaylistRef = useRef(null);
  const [playlistCache, setPlaylistCache] = useState({}); // Cache for playlist tracks
  const [isRefreshing, setIsRefreshing] = useState(false);
  const exportToCSV = useExportToCSV();

  // Load playlists function (can be called on demand)
  const loadPlaylists = async () => {
    setIsRefreshing(true);
    try {
      console.log("🔄 Refreshing playlists...");
      const fetchedPlaylists = await fetchPlaylists();
      setPlaylists(fetchedPlaylists);
      console.log(`✅ Loaded ${fetchedPlaylists.length} playlists`);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch the list of playlists when the hook is initialized
  useEffect(() => {
    loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update cache with track details as they're fetched
  // This runs when trackDetails are updated by fetchAndUpdateTrackDetails
  useEffect(() => {
    if (selectedPlaylist && filteredTracks.length > 0) {
      // Only update cache if we're not currently fetching a DIFFERENT playlist
      // (Allow updates if we're fetching the same playlist)
      if (!currentlyFetchingPlaylist || currentlyFetchingPlaylist === selectedPlaylist) {
        setPlaylistCache((prevCache) => {
          const existing = prevCache[selectedPlaylist];
          // Only update if we have meaningful data and it's for the right playlist
          if (existing && existing.tracks.length > 0) {
            return {
              ...prevCache,
              [selectedPlaylist]: {
                ...existing,
                details: trackDetails, // Update details while preserving tracks and total
                cachedAt: new Date().toISOString()
              }
            };
          }
          return prevCache;
        });
      }
    }
  }, [selectedPlaylist, filteredTracks, trackDetails, currentlyFetchingPlaylist]);

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
    const cached = playlistCache[targetPlaylist];
    const isComplete = cached && cached.total !== undefined && cached.tracks.length >= cached.total;

    // Reset or set the playlist total immediately
    if (setPlaylistTotal) {
      setPlaylistTotal(cached?.total || 0);
    }

    if (cached) {
      console.log(`✓ Loading playlist from cache: ${targetPlaylist} (${cached.tracks.length}/${cached.total || '?'} tracks)`);
      setFilteredTracks(cached.tracks);

      // Load cached details if available
      if (cached.details && Object.keys(cached.details).length > 0) {
        setTrackDetails(cached.details);
      }

      // If cache is complete, we're done
      if (isComplete) {
        console.log(`✓ Cache is complete for playlist: ${targetPlaylist}`);
        return;
      }

      // Cache is incomplete - continue loading from where we left off
      console.log(`⚠ Cache incomplete for playlist: ${targetPlaylist}, continuing from track ${cached.tracks.length}...`);
    } else {
      console.log(`⚠ Cache miss for playlist: ${targetPlaylist}, fetching from Spotify...`);
    }

    // Cancel any ongoing playlist fetch
    if (playlistFetchController) {
      playlistFetchController.abort();
    }

    // Immediately update which playlist we're fetching to prevent cross-contamination
    setCurrentlyFetchingPlaylist(targetPlaylist);
    currentlyFetchingPlaylistRef.current = targetPlaylist;

    // Create new abort controller for this fetch
    const controller = new AbortController();
    setPlaylistFetchController(controller);

    // Don't clear tracks immediately - keep old ones visible until new ones arrive
    // This provides better UX during the initial API call

    // Fetch all pages in background (non-blocking)
    const fetchAllPages = async () => {
      // Capture the playlist ID we're fetching
      const fetchingPlaylistId = targetPlaylist;

      try {
        // Start with cached tracks if available
        let allTracks = cached?.tracks || [];
        let offset = cached?.tracks.length || 0;
        const limit = 50;
        let hasMore = true;
        let totalTracks = cached?.total || 0;

        // Log if we're resuming from cache
        if (offset > 0) {
          console.log(`Resuming playlist fetch from track ${offset}...`);
        }

        // Fetch all pages of tracks
        while (hasMore && !controller.signal.aborted) {
          const response = await fetchPlaylistTracks(fetchingPlaylistId, offset, limit, controller.signal);

          // Check if cancelled after API call
          if (controller.signal.aborted) {
            console.log('Playlist fetch cancelled');
            return;
          }

          // Get total from response and set it immediately (only if not aborted)
          if (response.total !== undefined && !controller.signal.aborted) {
            // Log only when we first discover the total
            if (totalTracks === 0) {
              console.log(`Playlist total tracks: ${response.total}`);
            }

            totalTracks = response.total;

            // Update the total
            if (setPlaylistTotal) {
              setPlaylistTotal(totalTracks);
            }
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

          // Update UI immediately with current tracks (only if not cancelled AND still fetching this playlist)
          if (!controller.signal.aborted && currentlyFetchingPlaylistRef.current === fetchingPlaylistId) {
            setFilteredTracks([...allTracks]);

            // Update cache immediately with current progress
            // Note: We update trackDetails via the useEffect, not here, to avoid stale closure data
            setPlaylistCache((prevCache) => ({
              ...prevCache,
              [fetchingPlaylistId]: {
                tracks: [...allTracks],
                details: prevCache[fetchingPlaylistId]?.details || {},
                total: totalTracks,
                cachedAt: new Date().toISOString()
              }
            }));

            // Fetch additional details asynchronously
            basicTracks.forEach((track) => {
              fetchAndUpdateTrackDetails(track.id, setTrackDetails, track, controller.signal);
            });

            // Log progress
            if (totalTracks > 0) {
              console.log(`Loaded ${allTracks.length}/${totalTracks} tracks (${Math.round(allTracks.length / totalTracks * 100)}%)`);
            }
          } else if (currentlyFetchingPlaylistRef.current !== fetchingPlaylistId) {
            console.log(`Skipping update - switched from ${fetchingPlaylistId} to ${currentlyFetchingPlaylistRef.current}`);
          }

          // Check if there are more pages
          if (response.next && playlistData.length === limit) {
            offset += limit;
          } else {
            hasMore = false;
          }
        }

        // Log completion
        if (!controller.signal.aborted && allTracks.length > 0) {
          console.log(`✅ Finished loading playlist: ${allTracks.length} tracks`);
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.name === 'CanceledError' || controller.signal.aborted) {
          console.log('Playlist fetch aborted');
        } else {
          console.error("Error fetching playlist tracks:", error);
        }
      } finally {
        // Always clear the controller reference when done (whether successful, aborted, or error)
        // This ensures we can create a new controller for the next playlist
        setPlaylistFetchController((prev) => {
          // Only clear if this is still the active controller
          if (prev === controller) {
            return null;
          }
          return prev;
        });
        setCurrentlyFetchingPlaylist((prev) => {
          // Only clear if we're still fetching this playlist
          if (prev === fetchingPlaylistId) {
            currentlyFetchingPlaylistRef.current = null;
            return null;
          }
          return prev;
        });
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

  // Reorder tracks in playlist
  const handleReorderTrack = async (playlistId, fromIndex, toIndex) => {
    try {
      // Calculate insert_before based on direction
      let insertBefore = toIndex;
      if (fromIndex < toIndex) {
        // Moving down: need to add 1 because we're removing from above
        insertBefore = toIndex + 1;
      }

      // Call Spotify API to reorder
      await reorderPlaylistTracks(playlistId, fromIndex, insertBefore);

      // Optimistically update local state
      const newTracks = [...filteredTracks];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);
      setFilteredTracks(newTracks);

      // Update cache
      setPlaylistCache((prevCache) => ({
        ...prevCache,
        [playlistId]: {
          ...prevCache[playlistId],
          tracks: newTracks,
          cachedAt: new Date().toISOString()
        }
      }));

      console.log(`✅ Moved track from position ${fromIndex} to ${toIndex}`);
    } catch (error) {
      console.error("Error reordering track:", error);
      alert("Failed to reorder track. Please try again.");
      // Refresh playlist to get correct order
      handleShowPlaylist(playlistId);
    }
  };

  // Rename playlist
  const handleRenamePlaylist = async (playlistId, newName) => {
    try {
      await updatePlaylistDetails(playlistId, { name: newName });

      // Update local playlists state
      setPlaylists((prevPlaylists) =>
        prevPlaylists.map((p) =>
          p.id === playlistId ? { ...p, name: newName } : p
        )
      );

      console.log(`✅ Renamed playlist to "${newName}"`);
    } catch (error) {
      console.error("Error renaming playlist:", error);
      alert("Failed to rename playlist. Please try again.");
      throw error;
    }
  };

  // Delete tracks from playlist or unlike from Liked Songs
  const handleDeleteTracksFromPlaylist = async (playlistId, trackUris) => {
    if (!playlistId) {
      alert("No playlist selected.");
      return;
    }

    if (!trackUris || trackUris.length === 0) {
      alert("No tracks selected.");
      return;
    }

    try {
      // Handle Liked Songs differently - use unlike endpoint
      if (playlistId === 'liked-songs') {
        await unlikeTracks(trackUris);
        console.log(`✅ Unliked ${trackUris.length} track(s)`);
      } else {
        await removeTracksFromPlaylist(playlistId, trackUris);
        console.log(`✅ Deleted ${trackUris.length} track(s) from playlist`);
      }

      // Clear cache for this playlist so it gets refreshed
      setPlaylistCache((prevCache) => {
        const newCache = { ...prevCache };
        delete newCache[playlistId];
        return newCache;
      });

      // Reload the playlist to show updated tracks
      handleShowPlaylist(playlistId);
    } catch (error) {
      const action = playlistId === 'liked-songs' ? 'unlike' : 'delete';
      console.error(`Error ${action}ing tracks:`, error);
      alert(`Failed to ${action} tracks. Please try again.`);
      throw error;
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
    handleExportPlaylist,
    handleReorderTrack,
    handleRenamePlaylist,
    handleDeleteTracksFromPlaylist,
    refreshPlaylists: loadPlaylists,
    isRefreshing,
  };
};

export default usePlaylist;