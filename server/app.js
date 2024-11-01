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

// Refresh access token
async function refreshAccessToken() {
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
  } catch (error) {
    console.error('Error refreshing access token:', error.response?.data || error.message);
  }
}

// Consolidated function to fetch track details with genre and retry logic
const getTrackDetailsWithRetry = async (trackId, retries = 3, delayMs = 1000) => {
  try {
    const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const trackResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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

    return { ...featuresResponse.data, genres };
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || delayMs, 10) * 1000;
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return getTrackDetailsWithRetry(trackId, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

// Routes
app.get('/api/login', (req, res) => {
  const scope = 'user-read-private user-read-email';
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
    refreshToken = response.data.refresh_token;
    res.redirect('http://localhost:3000/?success=true');
  } catch (error) {
    console.error('Error exchanging code:', error.response?.data || error.message);
    res.redirect('http://localhost:3000/?error=token_exchange_failed');
  }
});

app.get('/api/search-tracks', async (req, res) => {
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

app.get('/api/track-details-with-retry', async (req, res) => {
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

// server.js or app.js
app.get('/api/similar-tracks', async (req, res) => {
  const {
    trackId,
    genre,
    tempo,
    tempoRange,
    danceability,
    danceabilityRange,
    energy,
    energyRange,
    valence,
    valenceRange,
    acousticness,
    acousticnessRange,
    instrumentalness,
    instrumentalnessRange,
    liveness,
    livenessRange,
    key,
  } = req.query;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const params = {
      seed_tracks: trackId, // Anchor recommendations to this track
      limit: 50, // Number of recommendations to fetch
    };

    // Apply genre directly
    if (genre) params.seed_genres = genre;

    // Apply flexible range for tempo
    if (tempo && !isNaN(tempo)) {
      const range = tempoRange ? parseFloat(tempoRange) : 2;
      params.min_tempo = parseFloat(tempo) - range;
      params.max_tempo = parseFloat(tempo) + range;
    }

    // Apply flexible range for danceability
    if (danceability && !isNaN(danceability)) {
      const range = danceabilityRange ? parseFloat(danceabilityRange) : 0.1;
      params.min_danceability = parseFloat(danceability) - range;
      params.max_danceability = parseFloat(danceability) + range;
    }

    // Apply flexible range for energy
    if (energy && !isNaN(energy)) {
      const range = energyRange ? parseFloat(energyRange) : 0.1;
      params.min_energy = parseFloat(energy) - range;
      params.max_energy = parseFloat(energy) + range;
    }

    // Apply flexible range for valence
    if (valence && !isNaN(valence)) {
      const range = valenceRange ? parseFloat(valenceRange) : 0.1;
      params.min_valence = parseFloat(valence) - range;
      params.max_valence = parseFloat(valence) + range;
    }

    // Apply flexible range for acousticness
    if (acousticness && !isNaN(acousticness)) {
      const range = acousticnessRange ? parseFloat(acousticnessRange) : 0.1;
      params.min_acousticness = parseFloat(acousticness) - range;
      params.max_acousticness = parseFloat(acousticness) + range;
    }

    // Apply flexible range for instrumentalness
    if (instrumentalness && !isNaN(instrumentalness)) {
      const range = instrumentalnessRange ? parseFloat(instrumentalnessRange) : 0.1;
      params.min_instrumentalness = parseFloat(instrumentalness) - range;
      params.max_instrumentalness = parseFloat(instrumentalness) + range;
    }

    // Apply flexible range for liveness
    if (liveness && !isNaN(liveness)) {
      const range = livenessRange ? parseFloat(livenessRange) : 0.1;
      params.min_liveness = parseFloat(liveness) - range;
      params.max_liveness = parseFloat(liveness) + range;
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});