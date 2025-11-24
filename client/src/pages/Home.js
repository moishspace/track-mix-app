import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainDashboard from '../components/MainDashboard';
import '../styles/HomeStyle.css';
import { SiPioneerdj } from "react-icons/si";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const Home = ({ isAuthorized, setIsAuthorized }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load search history from localStorage on component mount
  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    setSearchHistory(storedHistory);
  }, []);

  // Check for the success or error parameters in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      setIsAuthorized(true);
    } else if (params.get('error')) {
      console.error('Authorization failed. Please try again.');
      toast.error('Authorization failed. Please try again.');
    }
  }, [location.search, setIsAuthorized]);

  // Close suggestions list on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [searchTerm]);

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleSearchSubmit = () => {
    if (searchTerm.trim() === '') return;

    setSubmittedTerm(searchTerm);
    setShowSuggestions(false);

    // Update search history
    const updatedHistory = [searchTerm, ...searchHistory.filter((term) => term !== searchTerm)].slice(0, 10);
    setSearchHistory(updatedHistory);

    // Save updated history to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
  };

  const handleSuggestionClick = (term) => {
    setSearchTerm(term);
    setSubmittedTerm(term);
    setShowSuggestions(false);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    setShowSuggestions(false);
  };

  const handleRemoveItem = (term) => {
    const updatedHistory = searchHistory.filter((item) => item !== term);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  const handleLogin = () => {
    window.location.href = `${API_URL}/login`;
  };

  const goToMixer = () => {
    navigate('/mixer');
  };

  return (
    <div className="home-container">
      <h1 className="title">Music Mix App</h1>
      {!isAuthorized ? (
        <p className="description">Discover music based on rhythm and style. Login to start exploring!</p>
      ) : (
        <p className="description">Search for a track by entering a track name, artist, or album below.</p>
      )}

      {!isAuthorized ? (
        <button className="login-button" onClick={handleLogin}>
          Login with Spotify
        </button>
      ) : (
        <div className="search-container">
          <div className="search-bar" style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter track, artist, or album..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="text-input"
            />
            <button onClick={handleSearchSubmit} className="search-button">
              <i className="fas fa-search"></i>
            </button>
            <button className="mix-button" onClick={goToMixer}>
              <SiPioneerdj style={{ marginRight: '6px' }} /> Mix
            </button>

            {/* Autocomplete Suggestions */}
            {showSuggestions && searchHistory.length > 0 && (
              <div className="suggestions-dropdown">
                {searchHistory.map((term, index) => (
                  <div key={index} className="suggestion-item">
                    <span onClick={() => handleSuggestionClick(term)} className="suggestion-text">
                      {term}
                    </span>
                    <i
                      className="fas fa-trash remove-icon"
                      onClick={() => handleRemoveItem(term)}
                    ></i>
                  </div>
                ))}
                <div className="clear-history" onClick={handleClearHistory}>
                  Clear List
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isAuthorized && <MainDashboard searchTerm={submittedTerm} />}
    </div>
  );
};

export default Home;