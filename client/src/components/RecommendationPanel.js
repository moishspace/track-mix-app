/**
 * Recommendation Panel Component
 *
 * Displays music recommendations based on selected tracks
 * Shows "People also listen to..." style recommendations
 */

import React, { useState } from 'react';
import useRecommendations from '../hooks/useRecommendations';
import '../styles/RecommendationPanel.css';

const RecommendationPanel = ({ selectedTracks, onAddTrack, artistsData }) => {
  const {
    recommendations,
    loading,
    error,
    getRecommendations,
    getRecommendationsByMode,
    clearRecommendations,
    modes
  } = useRecommendations();

  const [selectedMode, setSelectedMode] = useState('SIMILAR');
  const [customQueries, setCustomQueries] = useState('');

  const handleGetRecommendations = async () => {
    if (customQueries.trim()) {
      // Use custom search queries
      const queries = customQueries.split(',').map(q => q.trim());
      await getRecommendations(selectedTracks, {
        searchQueries: queries,
        artistsData
      });
    } else {
      // Use preset mode
      await getRecommendationsByMode(selectedTracks, selectedMode, { artistsData });
    }
  };

  return (
    <div className="recommendation-panel">
      <div className="recommendation-header">
        <h3>🎵 Discover Similar Music</h3>
        <p className="subtitle">
          {selectedTracks.length > 0
            ? `Based on ${selectedTracks.length} selected track${selectedTracks.length > 1 ? 's' : ''}`
            : 'Select tracks to get recommendations'}
        </p>
      </div>

      <div className="recommendation-controls">
        {/* Mode Selector */}
        <div className="mode-selector">
          <label>Recommendation Mode:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            disabled={loading}
          >
            {Object.entries(modes).map(([key, mode]) => (
              <option key={key} value={key}>
                {mode.name} - {mode.description}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Search Queries */}
        <div className="custom-queries">
          <label>Custom Searches (optional):</label>
          <input
            type="text"
            placeholder="e.g., workout, chill, rock (comma-separated)"
            value={customQueries}
            onChange={(e) => setCustomQueries(e.target.value)}
            disabled={loading}
          />
          <small>Leave empty to auto-generate from selected tracks</small>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="get-recs-btn"
            onClick={handleGetRecommendations}
            disabled={loading || selectedTracks.length === 0}
          >
            {loading ? '🔄 Finding Similar Tracks...' : '🔍 Get Recommendations'}
          </button>

          {recommendations.length > 0 && (
            <button
              className="clear-recs-btn"
              onClick={clearRecommendations}
              disabled={loading}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {/* Recommendations List */}
      {recommendations.length > 0 && (
        <div className="recommendations-list">
          <div className="list-header">
            <h4>People also listen to:</h4>
            <span className="count">{recommendations.length} tracks found</span>
          </div>

          <div className="tracks">
            {recommendations.map((rec, index) => {
              const track = rec.track;
              if (!track) return null;

              return (
                <div key={track.id || index} className="recommendation-item">
                  <div className="track-info">
                    <div className="rank">#{index + 1}</div>

                    {track.album?.images?.[0] && (
                      <img
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        className="album-art"
                      />
                    )}

                    <div className="track-details">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">
                        {track.artists?.map(a => a.name).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="track-meta">
                    <div className="relevance-score" title="Relevance score">
                      {Math.round(rec.score)}
                    </div>

                    {track.popularity && (
                      <div className="popularity" title="Popularity">
                        <i className="fas fa-fire"></i>
                        {track.popularity}
                      </div>
                    )}
                  </div>

                  <button
                    className="add-track-btn"
                    onClick={() => onAddTrack && onAddTrack(track)}
                    title="Add to playlist"
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && selectedTracks.length > 0 && (
        <div className="empty-state">
          <i className="fas fa-music"></i>
          <p>Click "Get Recommendations" to discover similar tracks</p>
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
