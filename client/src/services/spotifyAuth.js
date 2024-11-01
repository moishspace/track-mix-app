// spotifyAuth.js

const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID; // Load from .env
const redirectUri = process.env.REACT_APP_SPOTIFY_REDIRECT_URI; // Load from .env

const scopes = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'streaming'
].join(' ');

const authorizeUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;

// Function to start the OAuth flow
export const loginToSpotify = () => {
  window.location.href = authorizeUrl;
};

// Function to get the authorization code from the URL
export const getAuthCodeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};