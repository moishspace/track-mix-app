// api.js
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    console.error("No refresh token available.");
    return null;
  }
  try {
    const response = await axios.post('http://localhost:3001/api/refresh-token', { refresh_token: refreshToken });
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    return access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
};

export const exchangeToken = async (code) => {
  try {
    const response = await axios.post(`${API_URL}/exchange-token`, { code });
    return response.data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

export const searchTracks = async (query) => {
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error("No access token found for searchTracks.");
    return [];
  }

  try {
    const response = await axios.get(`${API_URL}/search-tracks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { query },
    });
    // console.log("Search response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return [];
  }
};

// export const getTrackDetails = async (trackId) => {
//   try {
//     const response = await axios.get(`${API_URL}/track-details`, { params: { trackId } });
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching track details:', error);
//     throw error;
//   }
// };

export const getTrackDetails = async (trackId) => {
  const response = await fetch(`/api/track-details-with-retry?trackId=${trackId}`);
  if (!response.ok) throw new Error('Failed to fetch track details');
  return response.json();
};

export const searchSimilarTracks = async (criteria) => {
  try {
    const response = await axios.get(`${API_URL}/search-similar-tracks`, {
      params: criteria, // criteria will hold details like tempo, genre, etc.
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching similar tracks:', error);
    return [];
  }
};


export const getTrackWithGenre = async (trackId) => {
  let accessToken = localStorage.getItem('access_token');
  
  if (!accessToken) {
    console.error("No access token found.");
    return null;
  }

  try {
    // Initial request for audio features
    const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Request to fetch track and artist details
    const trackResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const artistId = trackResponse.data.artists[0].id;

    const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const genres = artistResponse.data.genres;

    return { ...featuresResponse.data, genres };

  } catch (error) {
    if (error.response?.status === 401) {
      console.warn("Access token expired. Refreshing token...");
      const newAccessToken = await refreshAccessToken();
      
      if (newAccessToken) {
        try {
          // Retry fetching with the new access token
          const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });

          const trackResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });
          const artistId = trackResponse.data.artists[0].id;

          const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: { Authorization: `Bearer ${newAccessToken}` },
          });
          const genres = artistResponse.data.genres;

          return { ...featuresResponse.data, genres };
        } catch (retryError) {
          console.error("Retry failed after refreshing token:", retryError);
          return null;
        }
      } else {
        console.error("Unable to refresh access token.");
        return null;
      }
    } else {
      console.error("Error fetching track details with genre:", error);
      return null;
    }
  }
};

// export const getTrackDetailsWithRetry = async (trackId, retries = 3, delay = 1000) => {
//   try {
//     return await getTrackDetails(trackId);
//   } catch (error) {
//     if (error.response?.status === 429 && retries > 0) {
//       const retryAfter = parseInt(error.response.headers['retry-after'] || delay, 10) * 1000;
//       console.warn(`Rate limited. Retrying after ${retryAfter} ms...`);
//       await new Promise(resolve => setTimeout(resolve, retryAfter));
//       return getTrackDetailsWithRetry(trackId, retries - 1);
//     }
//     throw error;
//   }
// };
