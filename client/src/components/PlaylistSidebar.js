import React, { useState, useMemo } from "react";
import "../styles/PlaylistSidebar.css";

const PlaylistSidebar = ({
  playlists,
  selectedPlaylist,
  onPlaylistChange,
  onCreatePlaylist,
  onImportFromCSV,
  onDeletePlaylist,
  onShowPlaylist,
  onRefreshPlaylists,
  onRenamePlaylist,
  isRefreshing,
}) => {
  const [sortBy, setSortBy] = useState("date"); // 'date' or 'name'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [sortDir, setSortDir] = useState("desc"); // 'asc' or 'desc'
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState('');

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

  const handleRenameClick = (e, playlist) => {
    e.stopPropagation();
    setEditingPlaylistId(playlist.id);
    setEditingPlaylistName(playlist.name);
  };

  const handleRenameSubmit = async (playlistId) => {
    if (editingPlaylistName.trim() && editingPlaylistName !== playlists.find(p => p.id === playlistId)?.name) {
      try {
        await onRenamePlaylist(playlistId, editingPlaylistName.trim());
      } catch (error) {
        console.error('Failed to rename playlist:', error);
      }
    }
    setEditingPlaylistId(null);
    setEditingPlaylistName('');
  };

  const handleRenameCancel = () => {
    setEditingPlaylistId(null);
    setEditingPlaylistName('');
  };

  return (
    <div className="playlist-sidebar">
      <div className="sidebar-header">
        <h2>Your Playlists</h2>
        <div className="header-buttons">
          <button
            className="create-playlist-btn"
            onClick={onImportFromCSV}
            title="Import playlist from CSV"
          >
            <i className="fas fa-file-csv"></i>
          </button>
          <button
            className="create-playlist-btn"
            onClick={onCreatePlaylist}
            title="Create new playlist"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
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
        {/* <span>Sorted by:</span> */}
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
        <button
          className={`refresh-btn ${isRefreshing ? "refreshing" : ""}`}
          onClick={onRefreshPlaylists}
          disabled={isRefreshing}
          title="Refresh playlists"
        >
          <i className={`fas fa-sync-alt ${isRefreshing ? "spinning" : ""}`}></i>
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
                {playlist.images && playlist.images.length > 0 ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="playlist-image"
                  />
                ) : (
                  <div className="playlist-image-placeholder">
                    <i className="fas fa-music"></i>
                  </div>
                )}
                <div className="playlist-details">
                  {editingPlaylistId === playlist.id ? (
                    <input
                      type="text"
                      className="playlist-name-input"
                      value={editingPlaylistName}
                      onChange={(e) => setEditingPlaylistName(e.target.value)}
                      onBlur={() => handleRenameSubmit(playlist.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameSubmit(playlist.id);
                        } else if (e.key === 'Escape') {
                          handleRenameCancel();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span className="playlist-name">{playlist.name}</span>
                  )}
                  <span className="playlist-count">
                    {playlist.tracks?.total || 0} tracks
                  </span>
                </div>
              </div>
              <div className="playlist-actions">
                {playlist.id !== 'liked-songs' && (
                  <>
                    <button
                      className="action-btn rename-btn"
                      onClick={(e) => handleRenameClick(e, playlist)}
                      title="Rename playlist"
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteClick(e, playlist)}
                      title="Delete playlist"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </>
                )}
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
