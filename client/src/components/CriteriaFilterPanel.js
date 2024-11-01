import React, { useEffect } from 'react';
import './CriteriaFilterPanelStyle.css';

const CriteriaFilterPanel = ({ criteria, setCriteria, onUpdateSearch, initialTrackDetails }) => {
    useEffect(() => {
      if (initialTrackDetails) {
        setCriteria({
          genre: initialTrackDetails.genres ? initialTrackDetails.genres[0] : '',
          tempo: { min: initialTrackDetails.tempo - 2, max: initialTrackDetails.tempo + 2 },
          danceability: { min: initialTrackDetails.danceability - 0.1, max: initialTrackDetails.danceability + 0.1 },
          energy: { min: initialTrackDetails.energy - 0.1, max: initialTrackDetails.energy + 0.1 },
          valence: { min: initialTrackDetails.valence - 0.1, max: initialTrackDetails.valence + 0.1 },
          acousticness: { min: initialTrackDetails.acousticness - 0.1, max: initialTrackDetails.acousticness + 0.1 },
          instrumentalness: { min: initialTrackDetails.instrumentalness - 0.1, max: initialTrackDetails.instrumentalness + 0.1 },
          liveness: { min: initialTrackDetails.liveness - 0.1, max: initialTrackDetails.liveness + 0.1 },
        });
      }
    }, [initialTrackDetails, setCriteria]);
  
    const handleRangeChange = (e, type, attr) => {
      const value = parseFloat(e.target.value);
      setCriteria((prev) => ({
        ...prev,
        [attr]: {
          ...prev[attr],
          [type]: value,
        },
      }));
    };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setCriteria((prev) => ({
      ...prev,
      [name]: checked ? prev[name] || { min: 0, max: 0 } : null,
    }));
  };

  return (
    <div className="filter-panel">
      <h3>Advanced Search Criteria</h3>

      {/* Genre Input */}
      <div className="filter-item">
        <label>
          <input
            type="checkbox"
            name="genre"
            checked={!!criteria.genre}
            onChange={(e) => handleCheckboxChange(e)}
          />
          Genre
        </label>
        {criteria.genre !== null && (
          <input
            type="text"
            name="genre"
            value={criteria.genre || ''}
            onChange={(e) => setCriteria((prev) => ({ ...prev, genre: e.target.value }))}
            placeholder="Enter genre"
          />
        )}
      </div>

      {/* Range sliders for numeric criteria */}
      {['tempo', 'danceability', 'energy', 'valence', 'acousticness', 'instrumentalness', 'liveness'].map((attr) => (
        <div className="filter-item" key={attr}>
          <label>
            <input
              type="checkbox"
              name={attr}
              checked={criteria[attr] !== null}
              onChange={(e) => handleCheckboxChange(e)}
            />
            {attr.charAt(0).toUpperCase() + attr.slice(1)}
          </label>
          {criteria[attr] !== null && (
            <div className="range-wrapper">
              <div className="range-label">
                <span>Min: {typeof criteria[attr]?.min === 'number' ? criteria[attr].min.toFixed(1) : '0.0'}</span>
                <span>Max: {typeof criteria[attr]?.max === 'number' ? criteria[attr].max.toFixed(1) : '0.0'}</span>
              </div>
              <div className="sliders">
                <input
                  type="range"
                  value={criteria[attr]?.min || 0}
                  onChange={(e) => handleRangeChange(e, 'min', attr)}
                  min="-1"
                  max="1"
                  step="0.1"
                  className="range-slider"
                />
                <input
                  type="range"
                  value={criteria[attr]?.max || 0}
                  onChange={(e) => handleRangeChange(e, 'max', attr)}
                  min="-1"
                  max="1"
                  step="0.1"
                  className="range-slider"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={onUpdateSearch}>Update Search</button>
    </div>
  );
};

export default CriteriaFilterPanel;