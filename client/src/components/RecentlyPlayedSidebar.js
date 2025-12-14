import React, { useState, useEffect } from 'react';
import { getRecentlyPlayedTracks } from '../services/api';
import '../styles/RecentlyPlayedSidebar.css';

const RecentlyPlayedSidebar = ({ onTrackClick }) => {
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecentlyPlayed();
  }, []);

  const loadRecentlyPlayed = async () => {
    try {
      setLoading(true);
      const data = await getRecentlyPlayedTracks(50);
      console.log('🎵 Recently played data:', data);
      setRecentlyPlayed(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error loading recently played tracks:', err);

      // Check if it's a permission/scope error
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError('Please re-login to Spotify to enable Recently Played');
      } else if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError('Failed to load recently played tracks');
      }
    } finally {
      setLoading(false);
    }
  };

  // Group tracks by date
  const groupByDate = (items) => {
    const groups = {};

    items.forEach((item) => {
      const playedAt = new Date(item.played_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey;
      if (playedAt.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (playedAt.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        // Format as "Mon, Jan 15"
        dateKey = playedAt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  };

  const groupedTracks = groupByDate(recentlyPlayed);

  return (
    <div className="recently-played-sidebar">
      <div className="recently-played-header">
        <h2>Recently Played</h2>
        <button
          className="refresh-btn"
          onClick={loadRecentlyPlayed}
          disabled={loading}
          title="Refresh recently played"
        >
          <i className={`fas fa-sync-alt ${loading ? 'spinning' : ''}`}></i>
        </button>
      </div>

      {loading && recentlyPlayed.length === 0 ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button onClick={loadRecentlyPlayed} className="retry-btn">
            Retry
          </button>
        </div>
      ) : recentlyPlayed.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-music"></i>
          <p>No recently played tracks</p>
        </div>
      ) : (
        <div className="recently-played-list">
          {Object.entries(groupedTracks).map(([date, tracks]) => (
            <div key={date} className="date-group">
              <div className="date-header">{date}</div>
              <div className="tracks-in-date">
                {tracks.map((item, index) => {
                  const track = item.track;
                  const playedAt = new Date(item.played_at);
                  const timeStr = playedAt.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <div
                      key={`${item.played_at}-${index}`}
                      className="track-item"
                      onClick={() => onTrackClick?.(track)}
                      style={{ cursor: onTrackClick ? 'pointer' : 'default' }}
                    >
                      <div className="track-image-container">
                        {track.album?.images?.[0]?.url ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.name}
                            className="track-image"
                          />
                        ) : (
                          <div className="track-image-placeholder">
                            <i className="fas fa-music"></i>
                          </div>
                        )}
                      </div>
                      <div className="track-info">
                        <div className="track-name" title={track.name}>
                          {track.name}
                        </div>
                        <div className="track-artist" title={track.artists?.map(a => a.name).join(', ')}>
                          {track.artists?.map(a => a.name).join(', ')}
                        </div>
                        <div className="track-time">{timeStr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyPlayedSidebar;
