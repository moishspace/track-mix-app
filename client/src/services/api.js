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