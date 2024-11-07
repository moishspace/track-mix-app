import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export const getAccessToken = async (retries = 3) => {
  try {
    const response = await axios.get(`${API_URL}/get-access-token`);
    const accessToken = response.data.accessToken;
    localStorage.setItem('access_token', accessToken); // Store it for later use
    return accessToken;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.warn("Access forbidden, possibly due to missing or invalid scopes or expired token");
      throw error;
    }
    else if (error.response?.status === 429 && retries > 0) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10) * 1000; // Retry after `retry-after` or 1 second
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return getAccessToken(retries - 1);
    }
    console.error('Error fetching access token:', error);
    throw error;
  }
};

// `withRetry` function to handle retry on 401 errors and refresh token as needed
const withRetry = async (apiCall) => {
  try {
    return await apiCall(); // Attempt the API call
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.warn('Access token expired. Refreshing...');
      const newAccessToken = await getAccessToken(); // Refresh the token
      localStorage.setItem('access_token', newAccessToken); // Update local storage
      return await apiCall(); // Retry the original API call
    }
    throw error; // If the error is not 401, rethrow it
  }
};

export const searchTracks = async (query) => {
  return withRetry(() =>
    axios.get(`${API_URL}/search-tracks`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`, // Use the latest token from local storage
      },
      params: { query },
    }).then(response => response.data)
  );
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
  const filteredCriteria = Object.fromEntries(
    Object.entries(criteria).filter(([_, value]) => value !== undefined)
  );

  return withRetry(() =>
    axios.get(`${API_URL}/similar-tracks`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      params: filteredCriteria,
    }).then(response => response.data)
  );
};

export const fetchDetailsWithDelays = async (trackIds, delayMs = 100) => {
  const details = {};

  for (const trackId of trackIds) {
    try {
      const data = await withRetry(() =>
        axios.get(`${API_URL}/track-details-with-retry`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
          params: { trackId },
        }).then(response => response.data)
      );
      details[trackId] = data;
    } catch (error) {
      console.error(`Error fetching details for track ${trackId}:`, error);
    }

    // Add a delay between each request
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return details;
};

export const fetchPlaylists = async () => {
  return withRetry(() =>
    axios.get(`${API_URL}/spotify-playlists`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
    }).then(response => response.data.items)
  );
};

export const createPlaylist = async ({ name, description, isPublic }) => {
  return withRetry(() =>
    axios.post(
      `${API_URL}/create-playlist`,
      { name, description, public: isPublic },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`, 
        },
      }).then(response => response.data)
  );
};

export const addTracksToPlaylist = async (playlistId, trackIds) => {
  return withRetry(() =>
    axios.post(
      `${API_URL}/add-tracks-to-playlist`,
      { playlistId, trackIds },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }).then(response => response.data)
  );
};

export const deletePlaylist = async (playlistId) => {
  return withRetry(() =>
    axios.delete(`${API_URL}/delete-playlist/${playlistId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`, // Use the latest token from local storage
      },
    }).then(response => response.data) // Assuming response contains any confirmation of deletion
  );
};

export const fetchPlaylistTracks = async (playlistId) => {
  return withRetry(() =>
    axios.get(`${API_URL}/playlist-tracks`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`, // Use the latest token from local storage
      },
      params: { playlistId },
    }).then(response => response.data.items) // Assuming `items` contains the track data
  );
};