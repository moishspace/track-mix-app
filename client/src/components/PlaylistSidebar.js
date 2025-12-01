import React, { useState, useMemo } from "react";
import "../styles/PlaylistSidebar.css";

const PlaylistSidebar = ({
  playlists,
  selectedPlaylist,
  onPlaylistChange,
  onCreatePlaylist,
  onDeletePlaylist,
  onShowPlaylist,
}) => {
  const [sortBy, setSortBy] = useState("date"); // 'date' or 'name'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [sortDir, setSortDir] = useState("desc"); // 'asc' or 'desc'

  const sortedPlaylists = useMemo(() => {
    const copy = [...playlists];

    if (sortBy === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }

    // reverse if descending (since Spotify already gives newest first)
    if (sortDir === "asc") copy.reverse();

    return copy;
  }, [playlists, sortBy, sortDir]);

  const handleDeleteClick = (e, playlist) => {
    e.stopPropagation();
    setPlaylistToDelete(playlist);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (playlistToDelete) {
      onDeletePlaylist(playlistToDelete.id);
      setShowDeleteConfirm(false);
      setPlaylistToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPlaylistToDelete(null);
  };

  return (
    <div className="playlist-sidebar">
      <div className="sidebar-header">
        <h2>Your Playlists</h2>
        <button
          className="create-playlist-btn"
          onClick={onCreatePlaylist}
          title="Create new playlist"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="sort-controls">
        <i
          className={`fas ${
            sortDir === "asc" ? "fa-sort-amount-up" : "fa-sort-amount-down"
          } sort-icon`}
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          title={`Click to toggle sort direction (${
            sortDir === "asc" ? "Ascending" : "Descending"
          })`}
        ></i>
        <span>Sorted by:</span>
        <button
          className={`sort-btn ${sortBy === "date" ? "active" : ""}`}
          onClick={() => setSortBy("date")}
        >
          Date
        </button>
        <button
          className={`sort-btn ${sortBy === "name" ? "active" : ""}`}
          onClick={() => setSortBy("name")}
        >
          Name
        </button>
      </div>

      <div className="playlist-list">
        {sortedPlaylists.length === 0 ? (
          <div className="empty-playlists">
            <p>No playlists yet</p>
            <p className="hint">Create one to get started!</p>
          </div>
        ) : (
          sortedPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              className={`playlist-item ${
                selectedPlaylist === playlist.id ? "active" : ""
              }`}
              onClick={() => {
                // Only fetch if it's a different playlist
                if (selectedPlaylist !== playlist.id) {
                  onPlaylistChange({ target: { value: playlist.id } });
                  // Pass the playlist ID directly to avoid state timing issues
                  onShowPlaylist(playlist.id);
                }
              }}
            >
              <div className="playlist-info">
                <i className="fas fa-music playlist-icon"></i>
                <div className="playlist-details">
                  <span className="playlist-name">{playlist.name}</span>
                  <span className="playlist-count">
                    {playlist.tracks?.total || 0} tracks
                  </span>
                </div>
              </div>
              <div className="playlist-actions">
                <button
                  className="action-btn delete-btn"
                  onClick={(e) => handleDeleteClick(e, playlist)}
                  title="Delete playlist"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Playlist</h3>
            <p>Are you sure you want to delete "{playlistToDelete?.name}"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-buttons">
              <button onClick={handleConfirmDelete} className="confirm-btn">
                Yes, Delete
              </button>
              <button onClick={handleCancelDelete} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistSidebar;
