import { useState, useEffect } from 'react';
import {
  fetchPlaylists,
  createPlaylist,
  addTracksToPlaylist,
  deletePlaylist,
  fetchPlaylistTracks,
  fetchDetailsWithDelays,
} from '../services/api';

const usePlaylist = () => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);

  // Fetch playlists on component mount
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const fetchedPlaylists = await fetchPlaylists();
        setPlaylists(fetchedPlaylists);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    loadPlaylists();
  }, []);

  // Create a new playlist
  const handleCreatePlaylist = async (playlistData) => {
    try {
      const newPlaylist = await createPlaylist(playlistData);
      setPlaylists((prevPlaylists) => [...prevPlaylists, newPlaylist]);
      setSelectedPlaylist(newPlaylist.id);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  // Add tracks to the selected playlist
  const handleAddToPlaylist = async (trackIds) => {
    if (!selectedPlaylist) {
      alert('Please select a playlist.');
      return;
    }

    if (trackIds.length === 0) {
      alert('Please select at least one track to add.');
      return;
    }

    try {
      await addTracksToPlaylist(selectedPlaylist, trackIds);
      alert('Tracks added to playlist successfully!');
    } catch (error) {
      console.error('Error adding tracks to playlist:', error);
      alert('Failed to add tracks to playlist.');
    }
  };

  // Delete a playlist
  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist(playlistToDelete.id);
      setPlaylists((prevPlaylists) =>
        prevPlaylists.filter((playlist) => playlist.id !== playlistToDelete.id)
      );
      setPlaylistToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Failed to delete playlist.');
    }
  };

  // Fetch tracks from the selected playlist
  const handleShowPlaylist = async (setFilteredTracks, setTrackDetails) => {
    if (!selectedPlaylist) {
      alert('Please select a playlist to show.');
      return;
    }

    try {
      const playlistData = await fetchPlaylistTracks(selectedPlaylist);
      const processedTracks = playlistData.map((item) => ({
        id: item.track?.id || 'unknown-id',
        name: item.track?.name || '',
        artistsName: item.track?.artists
          ? item.track.artists.map((artist) => artist.name).join(', ')
          : '',
        albumName: item.track?.album?.name || '',
        releaseDate: item.track?.album?.release_date || '',
        preview_url: item.track?.preview_url || null,
        albumImageUrl: item.track?.album?.images[0]?.url || null,
      }));

      setFilteredTracks(processedTracks);

      // Fetch detailed track information
      const trackIds = processedTracks.map((track) => track.id);
      const detailsObject = await fetchDetailsWithDelays(trackIds);
      setTrackDetails((prevDetails) => ({ ...prevDetails, ...detailsObject }));
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (playlist) => {
    setPlaylistToDelete(playlist);
    setShowDeleteConfirm(true);
  };

  // Close delete confirmation modal
  const closeDeleteConfirm = () => {
    setPlaylistToDelete(null);
    setShowDeleteConfirm(false);
  };

  return {
    playlists,
    selectedPlaylist,
    setSelectedPlaylist,
    showDeleteConfirm,
    playlistToDelete,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
    handleShowPlaylist,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
};

export default usePlaylist;