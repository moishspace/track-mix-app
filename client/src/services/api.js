import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

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
    return response.data;
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return [];
  }
};

export const getTrackDetails = async (trackId) => {
  try {
    const response = await axios.get(`${API_URL}/track-details-with-retry`, { params: { trackId } });
    return response.data;
  } catch (error) {
    console.error('Error fetching track details:', error);
    throw error;
  }
};

export const searchSimilarTracks = async (criteria) => {
  // Filter out undefined fields from the criteria
  const filteredCriteria = Object.fromEntries(
    Object.entries(criteria).filter(([_, value]) => value !== undefined)
  );

  try {
    const response = await axios.get(`${API_URL}/similar-tracks`, { params: filteredCriteria });
    return response.data;
  } catch (error) {
    console.error("Error fetching similar tracks:", error);
    return [];
  }
};

export const fetchPlaylists = async () => {
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error("No access token found for searchTracks.");
    return [];
  }
  
  try {
    // Remove the extra `/api` in the URL path
    const response = await axios.get(`${API_URL}/spotify-playlists`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data.items; // Assuming response contains 'items' array with playlists
  } catch (error) {
    console.error("Error fetching playlists from Spotify:", error);
    throw error; // Rethrow the error so it can be handled by calling code if needed
  }
};

export const createPlaylist = async ({ name, description, isPublic }) => {
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error("No access token found for creating playlist.");
    return;
  }

  try {
    const response = await axios.post(`${API_URL}/create-playlist`, { name, description, public: isPublic },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data; // Assuming the API returns the newly created playlist details
  } catch (error) {
    console.error("Error creating playlist:", error);
    throw error; // Rethrow for handling by calling code if needed
  }
};