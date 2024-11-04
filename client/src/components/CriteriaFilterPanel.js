import React, { useEffect } from 'react';
import './CriteriaFilterPanelStyle.css';

const CriteriaFilterPanel = ({ criteria, setCriteria, onUpdateSearch, initialTrackDetails }) => {
  useEffect(() => {
    console.log('initialTrackDetails', initialTrackDetails)
    if (initialTrackDetails) {
      setCriteria({
        genre: initialTrackDetails.genre || '', 
        tempo: { 
          min: initialTrackDetails.tempo ? initialTrackDetails.tempo - 2 : 80, 
          max: initialTrackDetails.tempo ? initialTrackDetails.tempo + 2 : 120, 
          active: true 
        },
        danceability: { 
          min: initialTrackDetails.danceability ? initialTrackDetails.danceability - 0.1 : 0, 
          max: initialTrackDetails.danceability ? initialTrackDetails.danceability + 0.1 : 1, 
          active: true 
        },
        energy: { 
          min: initialTrackDetails.energy ? initialTrackDetails.energy - 0.1 : 0, 
          max: initialTrackDetails.energy ? initialTrackDetails.energy + 0.1 : 1, 
          active: true 
        },
        valence: { 
          min: initialTrackDetails.valence ? initialTrackDetails.valence - 0.1 : 0, 
          max: initialTrackDetails.valence ? initialTrackDetails.valence + 0.1 : 1, 
          active: true 
        },
        acousticness: { 
          min: initialTrackDetails.acousticness ? initialTrackDetails.acousticness - 0.1 : 0, 
          max: initialTrackDetails.acousticness ? initialTrackDetails.acousticness + 0.1 : 1, 
          active: true 
        },
        instrumentalness: { 
          min: initialTrackDetails.instrumentalness ? initialTrackDetails.instrumentalness - 0.1 : 0, 
          max: initialTrackDetails.instrumentalness ? initialTrackDetails.instrumentalness + 0.1 : 1, 
          active: true 
        },
        liveness: { 
          min: initialTrackDetails.liveness ? initialTrackDetails.liveness - 0.1 : 0, 
          max: initialTrackDetails.liveness ? initialTrackDetails.liveness + 0.1 : 1, 
          active: true 
        },
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
        [name]: {
          ...prev[name],
          active: checked,
        },
      }));
    };


  return (
    <div className="filter-panel">
      <h3>Similarity Criteria</h3>
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
        checked={criteria[attr]?.active || false} // Bind to criteria[attr].active
        onChange={(e) => handleCheckboxChange(e)}
      />
      {attr.charAt(0).toUpperCase() + attr.slice(1)}
    </label>
    <div className="range-wrapper">
      <div className="range-labels">
        <span>Min: {typeof criteria[attr]?.min === 'number' ? criteria[attr].min.toFixed(1) : '0.0'}</span>
        <span>Max: {typeof criteria[attr]?.max === 'number' ? criteria[attr].max.toFixed(1) : '0.0'}</span>
      </div>
      <div className="sliders">
        <input
          type="range"
          value={criteria[attr]?.min || 0}
          onChange={(e) => handleRangeChange(e, 'min', attr)}
          min={attr === 'tempo' ? 80 : -1}
          max={attr === 'tempo' ? 200 : 1}
          step={attr === 'tempo' ? 1 : 0.1}
          className="range-slider"
        />
        <input
          type="range"
          value={criteria[attr]?.max || 0}
          onChange={(e) => handleRangeChange(e, 'max', attr)}
          min={attr === 'tempo' ? 80 : -1}
          max={attr === 'tempo' ? 200 : 1}
          step={attr === 'tempo' ? 1 : 0.1}
          className="range-slider"
        />
      </div>
    </div>
  </div>
))}

      <button onClick={onUpdateSearch}>Search Similar</button>
    </div>
  );
};

export default CriteriaFilterPanel;