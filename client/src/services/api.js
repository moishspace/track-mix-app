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

export const addTracksToPlaylist = async (playlistId, trackIds) => {
  const accessToken = localStorage.getItem('access_token'); // or retrieve from state/context

  if (!accessToken) {
    console.error("No access token available.");
    throw new Error("Access token is required to add tracks to the playlist.");
  }

  try {
    const response = await axios.post(
      `${API_URL}/add-tracks-to-playlist`,
      { playlistId, trackIds },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding tracks to playlist:", error);
    throw error;
  }
};


// export const deletePlaylist = async (playlistId) => {
//   const accessToken = localStorage.getItem('access_token');

//   if (!accessToken) {
//     console.error("No access token found for creating playlist.");
//     return;
//   }
  
//   try {
//     const response = await axios.delete(`${API_URL}/delete-playlist`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//       data: { playlistId },
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error deleting playlist:", error);
//     throw error;
//   }
// };

export const deletePlaylist = async (playlistId) => {
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error("No access token found for deleting playlist.");
    return;
  }

  try {
    const response = await axios.delete(`${API_URL}/delete-playlist/${playlistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting playlist:", error);
    throw error;
  }
};

// Fetch tracks from a playlist by its ID
export const fetchPlaylistTracks = async (playlistId) => {
  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    console.error("No access token found for creating playlist.");
    return;
  }
  try {
    const response = await axios.get(`${API_URL}/playlist-tracks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { playlistId },
    });
    return response.data.items; // Assuming `items` contains the track data
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    throw error;
  }
};