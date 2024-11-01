const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for your frontend URL
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
}));

app.use(express.json()); // Middleware to parse JSON in requests

// Spotify Configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

let accessToken = null;
let refreshToken = null;


async function refreshAccessToken() {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      accessToken = response.data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data || error.message);
    }
  }


  // Consolidated function to fetch track details with genre and retry logic
  const getTrackDetailsWithRetry = async (trackId, retries = 3, delayMs = 1000) => {
    try {
      // Fetch audio features
      const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      // Fetch track details to get the artist IDs
      const trackResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const artists = trackResponse.data.artists; // All artists on the track
  
      let genres = [];
      // Loop through each artist until genres are found
      for (const artist of artists) {
        const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
  
        const artistGenres = artistResponse.data.genres;
        if (artistGenres && artistGenres.length > 0) {
          genres = artistGenres; // Assign genres and break if found
          break;
        }
      }
  
      // Log rate limit headers
      console.log('Rate Limit:', featuresResponse.headers['x-ratelimit-limit']);
      console.log('Rate Limit Remaining:', featuresResponse.headers['x-ratelimit-remaining']);
  
      // Combine audio features and genres into one response object
      return { ...featuresResponse.data, genres };
  
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || delayMs, 10) * 1000;
        console.warn(`Rate limited. Retrying after ${retryAfter} ms for track ${trackId}...`);
        console.log('Rate Limit:', error.response.headers['x-ratelimit-limit']);
        console.log('Rate Limit Remaining:', error.response.headers['x-ratelimit-remaining']);
  
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        return getTrackDetailsWithRetry(trackId, retries - 1, delayMs * 2); // Exponential backoff
      }
      throw error;
    }
  };

// Step 1: Redirect user to Spotify's authorization URL
app.get('/api/login', (req, res) => {  // Note: /api/login route
  const scope = 'user-read-private user-read-email';
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

// Step 2: Handle Spotify callback and exchange code for token
app.get('/api/callback', async (req, res) => {
    const code = req.query.code || null;
    // console.log('Received code:', code); // Log for verification
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', null, {
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI, // Ensure this matches your redirect URI
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      const { access_token, refresh_token } = response.data;
      accessToken = access_token;
      refreshToken = refresh_token;
  
      // console.log("Access Token:", accessToken); // Log for verification
  
      // Redirect back to the frontend with success
      res.redirect('http://localhost:3000/?success=true');
    } catch (error) {
      console.error('Error exchanging code:', error.response?.data || error.message);
      res.redirect('http://localhost:3000/?error=token_exchange_failed');
    }
});

// New Endpoint: /api/exchange-token
app.post('/api/exchange-token', async (req, res) => {
    const { code } = req.body;
    // console.log("Received code for token exchange:", code); // Log the code received
  
    try {
      // Exchange the authorization code for an access token
      const response = await axios.post('https://accounts.spotify.com/api/token', null, {
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      // console.log("Token exchange successful:", response.data); // Log token data on success
      res.json(response.data);
  
    } catch (error) {
      // Enhanced error logging
      if (error.response) {
        console.error("Error details from Spotify:", error.response.data); // Log Spotify's error response
      } else {
        console.error("Error message:", error.message); // Log general errors (e.g., network issues)
      }
      res.status(500).json({ error: 'Failed to exchange token' });
    }
  });

  app.get('/api/search-tracks', async (req, res) => {
    const query = req.query.query;
    if (!query) {
      return res.status(400).json({ error: 'No search query provided' });
    }
  
    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Ensure accessToken is set correctly
        },
        params: {
          q: query,
          type: 'track',
          limit: 1,
        },
      });
      res.json(response.data.tracks.items); // Send back the list of tracks
    } catch (error) {
      console.error('Error fetching tracks from Spotify:', error);
      res.status(500).json({ error: 'Failed to fetch tracks' });
    }
  });

  app.get('/api/track-details', async (req, res) => {
    const trackId = req.query.trackId;
    if (!trackId) {
      return res.status(400).json({ error: 'Track ID is required' });
    }
  
    try {
      // Fetch audio features for the track
      const featuresResponse = await axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      // Fetch track details to get the artist ID
      const trackResponse = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // console.log('Track response:', trackResponse.data);

      const artists = trackResponse.data.artists;
  
      let genres = [];
      for (const artist of artists) {
        // Fetch artist details to get genres
        const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artist.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const artistGenres = artistResponse.data.genres;
        
        // If genres are found, add them to genres array and break out of the loop
        if (artistGenres && artistGenres.length > 0) {
          genres = artistGenres;
          break;
        }
      }

      // Combine audio features and genres into one response
      const trackDetails = { ...featuresResponse.data, genres };
      res.json(trackDetails);
  
    } catch (error) {
      console.error('Error fetching track details with genre:', error);
      res.status(500).json({ error: 'Failed to fetch track details' });
    }
  });

app.get('/api/search-similar-tracks', async (req, res) => {
    const { genre, tempo, artist } = req.query;
  
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token is missing or expired. Please authorize.' });
    }
  
    try {
      // Refresh access token if necessary
      await refreshAccessToken();
  
      // Search Spotify for tracks matching genre, tempo, and artist criteria
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          q: `${genre ? 'genre:' + genre : ''} ${artist ? 'artist:' + artist : ''} ${tempo ? 'tempo:' + tempo : ''}`,
          type: 'track',
          limit: 10,
        },
      });
  
      res.json(response.data.tracks.items);
    } catch (error) {
      console.error('Error searching for similar tracks:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to search for similar tracks' });
    }
  });
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  // New server endpoint to handle track details with retry logic
app.get('/api/track-details-with-retry', async (req, res) => {
  const trackId = req.query.trackId;
  if (!trackId) {
    return res.status(400).json({ error: 'Track ID is required' });
  }

  try {
    const trackDetails = await getTrackDetailsWithRetry(trackId);
    res.json(trackDetails);
  } catch (error) {
    console.error('Error fetching track details:', error.message);
    res.status(500).json({ error: 'Failed to fetch track details' });
  }
});