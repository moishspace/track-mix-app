// CreatePlaylistModal.js
import React, { useState } from 'react';
import '../styles/CreatePlaylistModalStyle.css';

const CreatePlaylistModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = () => {
    onCreate({ name, description, public: isPublic });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create New Playlist</h3>
        <div className="modal-body">
          <label>
            Name:
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Description:
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="checkbox-container">
            <span>Public:</span>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}/>
          </div>
        </div>
        <div className="modal-buttons">
          <button onClick={handleCreate} className="confirm-btn create">Create</button>
          <button onClick={onClose} className="cancel-btn secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;