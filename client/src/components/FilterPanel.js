// FilterPanel.js
import React from "react";
import "../styles/FilterPanel.css";


const FilterPanel = ({ filters, onFilterChange, genres, keys }) => {
  const handleInputChange = (filterType, value) => {
    onFilterChange({ ...filters, [filterType]: value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      title: "",
      genre: "",
      key: "",
      bpmMin: 0,
      bpmMax: 200,
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-group title-group">
        <label htmlFor="title-filter">Title:</label>
        <input
          id="title-filter"
          type="text"
          placeholder="Search by title or artist..."
          value={filters.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="genre-filter">Genre:</label>
        <select
          id="genre-filter"
          value={filters.genre}
          onChange={(e) => handleInputChange("genre", e.target.value)}
          className="filter-select"
        >
          <option value="">All Genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="key-filter">Key:</label>
        <select
          id="key-filter"
          value={filters.key}
          onChange={(e) => handleInputChange("key", e.target.value)}
          className="filter-select"
        >
          <option value="">All Keys</option>
          {keys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group bpm-group">
        <label htmlFor="bpm-filter">BPM:</label>
        <div className="bpm-sliders">
          <span className="bpm-value">{filters.bpmMin || 0}</span>
          <input
            id="bpm-min"
            type="range"
            min="0"
            max="200"
            value={filters.bpmMin}
            onChange={(e) => handleInputChange("bpmMin", e.target.value)}
            className="bpm-slider"
          />
          <span className="bpm-separator">-</span>
          <input
            id="bpm-max"
            type="range"
            min="0"
            max="200"
            value={filters.bpmMax}
            onChange={(e) => handleInputChange("bpmMax", e.target.value)}
            className="bpm-slider"
          />
          <span className="bpm-value">{filters.bpmMax || 200}</span>
        </div>
      </div>

<button className="clear-filters-icon" title="Clear Filters" onClick={handleClearFilters}> X
  <i className="fa fa-times"></i>
</button>
    </div>
  );
};

export default FilterPanel;
