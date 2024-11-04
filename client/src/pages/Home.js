// // Home.js
// import React, { useState, useEffect } from 'react';
// import TrackSearch from '../components/TrackSearch';
// import { useLocation } from 'react-router-dom';

// const Home = ({ isAuthorized, setIsAuthorized }) => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [submittedTerm, setSubmittedTerm] = useState('');

//   const location = useLocation();

//   // Check for the success or error parameters in URL
//   useEffect(() => {
//     const params = new URLSearchParams(location.search);
//     if (params.get('success') === 'true') {
//       setIsAuthorized(true);
//     } else if (params.get('error')) {
//       console.error('Authorization failed. Please try again.');
//       alert('Authorization failed. Please try again.');
//     }
//   }, [location.search, setIsAuthorized]);

//   const handleInputChange = (e) => setSearchTerm(e.target.value);

//   const handleSearchSubmit = () => setSubmittedTerm(searchTerm);

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter') handleSearchSubmit();
//   };

//   const handleLogin = () => {
//     window.location.href = 'http://localhost:3001/api/login';
//   };

//   return (
//     <div>
//       <h1 className="title">Welcome to Track Similarity App</h1>
//       <p className="description">Search for tracks by entering a track name, artist, or album below.</p>

//       {!isAuthorized ? (
//         <button className="login-button" onClick={handleLogin}>
//           Login with Spotify
//         </button>
//       ) : (
//         <div className="search-container">
//           <div className="search-bar">
//             <input
//               type="text"
//               placeholder="Enter track, artist, or album..."
//               value={searchTerm}
//               onChange={handleInputChange}
//               onKeyDown={handleKeyDown}
//               className="text-input"
//             />
//             <button onClick={handleSearchSubmit} className="search-button">
//               Search
//             </button>
//           </div>
//         </div>
//       )}

//       {isAuthorized && (
//         <TrackSearch searchTerm={submittedTerm} />
//       )}
//     </div>
//   );
// };

// export default Home;

// Home.js
import React, { useState, useEffect } from 'react';
import TrackSearch from '../components/TrackSearch';
import { useLocation } from 'react-router-dom';

const Home = ({ isAuthorized, setIsAuthorized }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedTerm, setSubmittedTerm] = useState('');

  const location = useLocation();

  // Check for the success or error parameters in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('success') === 'true') {
      setIsAuthorized(true);
    } else if (params.get('error')) {
      console.error('Authorization failed. Please try again.');
      alert('Authorization failed. Please try again.');
    }
  }, [location.search, setIsAuthorized]);

  const handleInputChange = (e) => setSearchTerm(e.target.value);

  const handleSearchSubmit = () => setSubmittedTerm(searchTerm);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearchSubmit();
  };

  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/api/login';
  };

  return (
    <div>
      <h1 className="title">Music Similarity App</h1>
      {!isAuthorized ? (
      <p className="description">Discover music based on rhythm and style. Login to start exploring!</p>
      ) : (<p className="description">Search for track by entering a track name, artist, or album below.</p>) }

      {!isAuthorized ? (
        <button className="login-button" onClick={handleLogin}>
          Login with Spotify
        </button>
      ) : (
        <div className="search-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Enter track, artist, or album..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="text-input"
            />
            <button onClick={handleSearchSubmit} className="search-button">
              Search
            </button>
          </div>
        </div>
      )}

      {isAuthorized && <TrackSearch searchTerm={submittedTerm} />}
    </div>
  );
};

export default Home;