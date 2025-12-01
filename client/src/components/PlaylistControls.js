// PlaylistControls.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CreatePlaylistModal from './CreatePlaylistModal';

const PlaylistControls = ({
  playlists,
  selectedPlaylist,
  handlePlaylistChange,
  handleAddToPlaylist,
  handleShowPlaylist,
  handleCreatePlaylist,
  handleDeletePlaylist,
  handleExportPlaylist,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);

  const openCreatePlaylistModal = () => setIsModalOpen(true);
  const closeCreatePlaylistModal = () => setIsModalOpen(false);

  const openDeleteConfirm = (playlist) => {
    if (!playlist || playlist.id === "") {
      alert("Please select a playlist to delete.");
      return;
    }
    setPlaylistToDelete(playlist);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setPlaylistToDelete(null);
  };

  const handleCreatePlaylistWrapper = async (playlistData) => {
    try {
      await handleCreatePlaylist(playlistData);
      closeCreatePlaylistModal(); // Close the modal after successful creation
    } catch (error) {
      console.error("Error creating playlist:", error);
      alert("Failed to create playlist.");
    }
  };

  const handleConfirmDelete = async () => {
    if (playlistToDelete) {
      await handleDeletePlaylist(playlistToDelete);
      closeDeleteConfirm();
    }
  };

  return (
    <div className="button-container">
      <div className="button-group-container">
        <button className="action-button" onClick={handleAddToPlaylist}>
          Add to Playlist
        </button>
        <select
          className="playlist-dropdown"
          value={selectedPlaylist || ""}
          onChange={handlePlaylistChange}
        >
          <option value="" disabled>Select a Playlist</option>
          {playlists
            ?.filter((playlist) => playlist && playlist.id)
            .map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
        </select>
        <button className="action-button" onClick={handleExportPlaylist}>
          Export to CSV
        </button>

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          isOpen={isModalOpen}
          onClose={closeCreatePlaylistModal}
          onCreate={handleCreatePlaylistWrapper}
        />
      </div>
    </div>
  );
};

// Add default props to avoid errors if props are not passed
PlaylistControls.defaultProps = {
  playlists: [], // Default to an empty array if playlists is undefined
  selectedPlaylist: null,
  handlePlaylistChange: () => {},
  handleAddToPlaylist: () => {},
  handleShowPlaylist: () => {},
  handleCreatePlaylist: () => {},
  handleDeletePlaylist: () => {},
  handleExportPlaylist:  () => {},
};

// Prop types to ensure valid data is passed to the component
PlaylistControls.propTypes = {
  playlists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  selectedPlaylist: PropTypes.string,
  handlePlaylistChange: PropTypes.func,
  handleAddToPlaylist: PropTypes.func,
  handleShowPlaylist: PropTypes.func,
  handleCreatePlaylist: PropTypes.func,
  handleDeletePlaylist: PropTypes.func,
  handleExportPlaylist: PropTypes.func,
};

export default PlaylistControls;