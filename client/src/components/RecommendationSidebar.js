import React, { useState } from "react";
import {
  CircularProgress,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  Tooltip,
} from "@mui/material";
import { RECOMMENDATION_MODES } from "../utils/recommendationEngine";
import "../styles/RecommendationSidebar.css";

const RecommendationSidebar = ({
  selectedTracks = [],
  onGetRecommendations,
  loading = false,
}) => {
  const [selectedModes, setSelectedModes] = useState({
    SIMILAR: true,
    POPULAR: false,
    DISCOVERY: false,
    DEEP_CUTS: false,
  });

  const [includeLatestReleases, setIncludeLatestReleases] = useState(false);
  const [excludeSeedArtists, setExcludeSeedArtists] = useState(true);
  const [mixedPlaylistsOnly, setMixedPlaylistsOnly] = useState(true);

  const handleModeChange = (mode) => {
    setSelectedModes((prev) => ({
      ...prev,
      [mode]: !prev[mode],
    }));
  };

  const handleGetRecommendations = () => {
    const activeModes = Object.entries(selectedModes)
      .filter(([_, isActive]) => isActive)
      .map(([mode, _]) => mode);

    if (activeModes.length === 0) {
      alert("Please select at least one recommendation mode");
      return;
    }

    onGetRecommendations({
      modes: activeModes,
      includeLatestReleases,
      excludeSeedArtists,
      mixedPlaylistsOnly,
    });
  };

  const hasSelectedTracks = selectedTracks.length > 0;

  return (
    <div className="recommendation-sidebar">
      <div className="recommendation-header">
        <h2>Get Recommendations</h2>
      </div>
      <div>
        <span className="track-count">
          {selectedTracks.length} track{selectedTracks.length !== 1 ? "s" : ""}{" "}
          selected
        </span>
      </div>
      {/* Selected Artists Display */}
      {hasSelectedTracks && (
        <div className="selected-artists">
          <h3>Artists</h3>
          <div className="artist-list">
            {getUniqueArtists(selectedTracks).map((artist, index) => (
              <div key={index} className="artist-item">
                <div className="artist-avatar">
                  {artist.images && artist.images.length > 0 ? (
                    <img src={artist.images[0].url} alt={artist.name} />
                  ) : (
                    <div className="artist-placeholder">
                      <i className="fas fa-user"></i>
                    </div>
                  )}
                </div>
                <span className="artist-name">{artist.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation Modes */}
      <div className="recommendation-modes">
        <h3>Recommendation Modes</h3>
        <FormGroup>
          {Object.entries(RECOMMENDATION_MODES).map(([key, mode]) => (
            <div key={key} className="mode-item">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedModes[key]}
                    onChange={() => handleModeChange(key)}
                    disabled={loading}
                  />
                }
                label={mode.name}
              />
              <p className="mode-description">{mode.description}</p>
            </div>
          ))}
        </FormGroup>
      </div>

      {/* Additional Options */}
      <div className="recommendation-options">
        <h3>Options</h3>
        <FormGroup>
          <Tooltip
            title="Exclude tracks by the same artists you selected (find new artists)"
            placement="left"
            arrow
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={excludeSeedArtists}
                  onChange={(e) => setExcludeSeedArtists(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Exclude Selected Artists"
            />
          </Tooltip>
          <Tooltip
            title="Only use playlists with 10-70% seed artist (avoid dedicated artist playlists)"
            placement="left"
            arrow
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={mixedPlaylistsOnly}
                  onChange={(e) => setMixedPlaylistsOnly(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Mixed Playlists Only"
            />
          </Tooltip>
          <Tooltip
            title="Sort by release date and return the 50 most recent tracks"
            placement="left"
            arrow
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeLatestReleases}
                  onChange={(e) => setIncludeLatestReleases(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Latest Releases Only"
            />
          </Tooltip>
        </FormGroup>
      </div>

      {/* Get Recommendations Button */}
      <div className="recommendation-action">
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleGetRecommendations}
          disabled={!hasSelectedTracks || loading}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Loading...
            </>
          ) : (
            <>Get Recommendations</>
          )}
        </Button>

        {!hasSelectedTracks && (
          <p className="help-text">
            Select one or more tracks from the table to get recommendations
          </p>
        )}
      </div>

      {/* Info Panel */}
      {/* <div className="recommendation-info">
        <h4>How it works</h4>
        <ul>
          <li>Searches public Spotify playlists for similar artists</li>
          <li>Analyzes tracks that appear together in playlists</li>
          <li>Finds tracks with similar characteristics</li>
          <li>Check "Exclude Selected Artists" to discover new artists</li>
          <li>Returns up to 50 recommended tracks</li>
        </ul>
      </div> */}
    </div>
  );
};

// Helper function to extract unique artists from selected tracks
const getUniqueArtists = (tracks) => {
  const artistMap = new Map();

  tracks.forEach((track) => {
    const artists = track.artists || [];
    artists.forEach((artist) => {
      if (!artistMap.has(artist.id)) {
        artistMap.set(artist.id, artist);
      }
    });
  });

  return Array.from(artistMap.values());
};

export default RecommendationSidebar;
