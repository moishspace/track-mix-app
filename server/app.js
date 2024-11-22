const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

let accessToken = null;
let refreshToken = null;
let accessTokenExpiresAt = null; 
let isRateLimited = false;
let rateLimitResetTime = null;

async function ensureValidAccessToken(req, res, next) {
  if (!accessToken || tokenIsExpired()) {
    console.log("Access token expired or missing, refreshing...");
    await refreshAccessToken();
  }
  next();
}

// Helper function to check if the access token is expired
const tokenIsExpired = () => {
  return !accessTokenExpiresAt || Date.now() >= accessTokenExpiresAt;
};

// Refresh access token using refresh token
async function refreshAccessToken() {
  if (!refreshToken) {
    console.error('No refresh token available. User needs to re-authenticate.');
    return;
  }

  if (isRateLimited && Date.now() < rateLimitResetTime) {
    await new Promise((resolve) => setTimeout(resolve, rateLimitResetTime - Date.now()));
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessToken = response.data.access_token;
    accessTokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    console.log('Access token refreshed successfully.');
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10) * 1000;
      rateLimitResetTime = Date.now() + retryAfter;
      isRateLimited = true;
      console.error(`Rate limited. Retry after ${retryAfter / 1000} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
    } else {
      console.error('Error refreshing access token:', error.response?.data || error.message);
    }
  }
}

const getTrackDetailsWithRetry = async (trackId, retries = 5, delayMs = 2000) => {
  if (isRateLimited && Date.now() < rateLimitResetTime) {
    const waitTime = rateLimitResetTime - Date.now();
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  try {
    const [featuresResponse, trackResponse, analysisResponse] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const artists = trackResponse.data.artists;
    let genres = [];

    for (const artist of artists) {
      const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (artistResponse.data.genres?.length) {
        genres = artistResponse.data.genres;
        break;
      }
    }

    return {
      ...featuresResponse.data,
      ...trackResponse.data,
      analysis: analysisResponse.data,
      genres,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10);
      const waitTime = isNaN(retryAfter) ? delayMs : retryAfter * 1000;

      rateLimitResetTime = Date.now() + waitTime;
      isRateLimited = true;

      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (retries > 0) {
        return getTrackDetailsWithRetry(trackId, retries - 1, delayMs * 2);
      } else {
        console.warn(`Maximum retries reached for track ID ${trackId}. Entering cooldown period.`);
        rateLimitResetTime = Date.now() + 60000; // Cooldown period of 60 seconds
        throw new Error(`Max retries reached for track ID ${trackId}`);
      }
    } else if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return getTrackDetailsWithRetry(trackId, retries - 1, delayMs * 2);
    } else {
      console.error(`Failed to fetch details for track ID ${trackId} after multiple retries.`);
      throw error;
    }
  }
};

const getAdditionalTrackDetailsWithRetry = async (trackId, artistData = null, retries = 5, delayMs = 2000) => {
  try {
    // Fetch audio features and analysis in parallel
    const [featuresResponse, analysisResponse] = await Promise.allSettled([
      axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    // Process features and analysis responses
    const features = featuresResponse.status === 'fulfilled' ? featuresResponse.value.data : null;
    const analysis = analysisResponse.status === 'fulfilled' ? analysisResponse.value.data : null;

    if (!features) {
      console.warn(`Features not available for track ID ${trackId}`);
    }
    if (!analysis) {
      console.warn(`Analysis not available for track ID ${trackId}`);
    }

    // Fetch genres from artists if not already provided
    let genres = [];
    if (artistData?.length) {
      for (const artist of artistData) {
        try {
          const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (artistResponse.data.genres?.length) {
            genres = [...genres, ...artistResponse.data.genres];
          }
        } catch (artistError) {
          console.error(`Error fetching genres for artist ID ${artist.id}:`, artistError.message);
        }
      }
    }

    return {
      features,
      analysis,
      genres,
    };
  } catch (error) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'], 10) || delayMs / 1000;
      const waitTime = retryAfter * 1000;

      console.warn(`Rate limited. Retrying after ${waitTime / 1000} seconds...`);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (retries > 0) {
        return getAdditionalTrackDetailsWithRetry(trackId, artistData, retries - 1, delayMs * 2);
      } else {
        console.warn(`Max retries reached for track ID ${trackId}. Returning without additional details.`);
        return null;
      }
    } else {
      console.error(`Error fetching additional details for track ID ${trackId}:`, error.message);
      return null;
    }
  }
};

// Routes
app.get('/api/login', (req, res) => {
  const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private user-read-playback-state user-modify-playback-state streaming user-library-read';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

app.get('/api/callback', async (req, res) => {
  const code = req.query.code || null;
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token || refreshToken; // Save only if provided
    res.redirect('http://localhost:3000/?success=true');
  } catch (error) {
    console.error('Error exchanging code:', error.response?.data || error.message);
    res.redirect('http://localhost:3000/?error=token_exchange_failed');
  }
});

app.get('/api/get-access-token', async (req, res) => {
  try {
    if (!accessToken || tokenIsExpired()) {
      await refreshAccessToken();
    }
    res.json({ accessToken });
  } catch (error) {
    console.error('Error providing access token:', error.message);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.get('/api/search-tracks', ensureValidAccessToken, async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: 'No search query provided' });

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: query, type: 'track', limit: 5 },
    });
    res.json(response.data.tracks.items);
  } catch (error) {
    console.error('Error fetching tracks from Spotify:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

app.get('/api/track-details-with-retry', ensureValidAccessToken, async (req, res) => {
  const trackId = req.query.trackId;
  if (!trackId) return res.status(400).json({ error: 'Track ID is required' });

  try {
    const trackDetails = await getTrackDetailsWithRetry(trackId);
    res.json(trackDetails);
  } catch (error) {
      if (error.response) {
        console.error(`Error fetching details for track ID ${trackId}:`, error.response.status, error.response.data);
      } else {
        console.error(`Network or unknown error for track ID ${trackId}:`, error.message);
      }
  }
});

app.get('/api/similar-tracks', ensureValidAccessToken, async (req, res) => {
  const {
    trackId,
    genre,
    min_tempo,
    max_tempo,
    min_danceability,
    max_danceability,
    min_energy,
    max_energy,
    min_valence,
    max_valence,
    min_acousticness,
    max_acousticness,
    min_instrumentalness,
    max_instrumentalness,
    min_liveness,
    max_liveness,
    key,
  } = req.query;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const params = {
      seed_tracks: trackId, // Anchor recommendations to this track
      limit: 20, // Number of recommendations to fetch
    };

    // Apply genre directly
    if (genre) params.seed_genres = genre;

    // Apply min/max for tempo
    if (min_tempo && !isNaN(min_tempo)) {
      params.min_tempo = parseFloat(min_tempo);
    }
    if (max_tempo && !isNaN(max_tempo)) {
      params.max_tempo = parseFloat(max_tempo);
    }

    // Apply min/max for danceability
    if (min_danceability && !isNaN(min_danceability)) {
      params.min_danceability = parseFloat(min_danceability);
    }
    if (max_danceability && !isNaN(max_danceability)) {
      params.max_danceability = parseFloat(max_danceability);
    }

    // Apply min/max for energy
    if (min_energy && !isNaN(min_energy)) {
      params.min_energy = parseFloat(min_energy);
    }
    if (max_energy && !isNaN(max_energy)) {
      params.max_energy = parseFloat(max_energy);
    }

    // Apply min/max for valence
    if (min_valence && !isNaN(min_valence)) {
      params.min_valence = parseFloat(min_valence);
    }
    if (max_valence && !isNaN(max_valence)) {
      params.max_valence = parseFloat(max_valence);
    }

    // Apply min/max for acousticness
    if (min_acousticness && !isNaN(min_acousticness)) {
      params.min_acousticness = parseFloat(min_acousticness);
    }
    if (max_acousticness && !isNaN(max_acousticness)) {
      params.max_acousticness = parseFloat(max_acousticness);
    }

    // Apply min/max for instrumentalness
    if (min_instrumentalness && !isNaN(min_instrumentalness)) {
      params.min_instrumentalness = parseFloat(min_instrumentalness);
    }
    if (max_instrumentalness && !isNaN(max_instrumentalness)) {
      params.max_instrumentalness = parseFloat(max_instrumentalness);
    }

    // Apply min/max for liveness
    if (min_liveness && !isNaN(min_liveness)) {
      params.min_liveness = parseFloat(min_liveness);
    }
    if (max_liveness && !isNaN(max_liveness)) {
      params.max_liveness = parseFloat(max_liveness);
    }

    // Apply target for key
    if (key && !isNaN(key)) {
      params.target_key = parseInt(key, 10);
    }

    // Fetch recommendations with flexible criteria
    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    res.json(response.data.tracks);
  } catch (error) {
    console.error('Error fetching similar tracks:', error);
    res.status(500).json({ error: 'Failed to fetch similar tracks' });
  }
});


app.get('/api/spotify-playlists', ensureValidAccessToken, async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    res.json(response.data);
  } catch (error) {
    if (error.response) {
      console.error(`Error fetching playlists: ${error.response.status}`, error.response.data);
      res.status(error.response.status).json(error.response.data); 
    } else {
      console.error(`Network or unknown error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch playlists' });
    }
  }
});

app.post('/api/create-playlist', ensureValidAccessToken, async (req, res) => {
  const { name, description, public: isPublic } = req.body;
  if ( name.length === 0) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    const userProfileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userId = userProfileResponse.data.id;

    const playlistResponse = await axios.post(`https://api.spotify.com/v1/users/${userId}/playlists`,
      { name, description, public: isPublic },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json(playlistResponse.data); // Return the newly created playlist details
  } catch (error) {
    console.error("Error creating playlist:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

app.post('/api/add-tracks-to-playlist', ensureValidAccessToken, async (req, res) => {
  const { playlistId, trackIds } = req.body;
  if (!playlistId || !trackIds || trackIds.length === 0) {
    return res.status(400).json({ error: 'Playlist ID and track IDs are required' });
  }

  try {
    const response = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: trackIds.map((id) => `spotify:track:${id}`) },
      { headers: { Authorization: `Bearer ${accessToken}` }, }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error adding tracks to playlist:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to add tracks to playlist' });
  }
});

app.delete('/api/delete-playlist/:playlistId', ensureValidAccessToken, async (req, res) => {
  const { playlistId } = req.params;
  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const response = await axios.delete(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    res.status(204).send(); 
  } catch (error) {
    console.error("Error deleting playlist:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to delete playlist' });
  }
});

app.get('/api/playlist-tracks', ensureValidAccessToken, async (req, res) => {
  const { playlistId } = req.query;
  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed to fetch playlist tracks' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/api/track-analysis', ensureValidAccessToken, async (req, res) => {
  const trackId = req.query.trackId;
  if (!trackId) return res.status(400).json({ error: 'Track ID is required' });

  try {
    const response = await axios.get(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching track analysis for ID ${trackId}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch track analysis' });
  }
});


app.get('/api/fetch_and_update_track_details', ensureValidAccessToken, async (req, res) => {
  const trackId = req.query.trackId;
  const basicDetails = req.query.basicDetails ? JSON.parse(req.query.basicDetails) : null;
  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    // Step 1: Use provided basic details if available, otherwise fetch from Spotify API
    let trackData = basicDetails;
    if (!trackData) {
      const basicDetailsResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      trackData = basicDetailsResponse.data;
    }

    // Step 2: Fetch additional details (features and analysis)
    const { features, analysis, genres } = await getAdditionalTrackDetailsWithRetry(trackId, trackData.artists);

    const combinedDetails = {
      ...trackData,
      features,
      analysis: analysis || {},
      genres,
    };

    // Return combined details
    res.json(combinedDetails);
  } catch (error) {
    console.error(`Error fetching combined details for track ID ${trackId}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch track details' });
  }
});
