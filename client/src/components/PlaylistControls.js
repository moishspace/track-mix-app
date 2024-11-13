// PlaylistControls.js
import React, { useState } from 'react';
import CreatePlaylistModal from './CreatePlaylistModal';

const PlaylistControls = ({
  playlists,
  selectedPlaylist,
  handlePlaylistChange,
  handleAddToPlaylist,
  handleShowPlaylist,
  handleCreatePlaylist,
  handleDeletePlaylist,
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
          {playlists.map((playlist) => (
            <option key={playlist.id} value={playlist.id}>
              {playlist.name}
            </option>
          ))}
        </select>
        <button className="action-button" onClick={handleShowPlaylist}>
          Show Playlist
        </button>
        <button className="action-button" onClick={openCreatePlaylistModal}>
          Create Playlist
        </button>
        <button
          className="action-button"
          onClick={() => openDeleteConfirm(playlists.find((p) => p.id === selectedPlaylist))}
        >
          Delete Playlist
        </button>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Confirm Delete</h3>
              <p>Are you sure you want to delete the playlist "{playlistToDelete?.name}"?</p>
              <div className="modal-buttons">
                <button onClick={handleConfirmDelete} className="action-button">
                  Yes, Delete
                </button>
                <button onClick={closeDeleteConfirm} className="action-button secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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

export default PlaylistControls;