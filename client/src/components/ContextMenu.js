// src/components/ContextMenu.js
import React from 'react';

const ContextMenu = ({ contextMenu, onExport, onClose }) => {
  if (!contextMenu) return null; // Only render if contextMenu data is available

  return (
    <div
      style={{
        position: 'absolute',
        top: contextMenu.mouseY,
        left: contextMenu.mouseX,
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
        padding: '10px',
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onClick={onExport}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          color: '#333',
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
      >
        Export to CSV
      </div>
      <div
        onClick={onClose}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          color: '#333',
        }}
        onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
        onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
      >
        Close
      </div>
    </div>
  );
};

export default ContextMenu;