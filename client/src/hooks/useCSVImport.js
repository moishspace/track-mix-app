import { useState } from 'react';
import Papa from 'papaparse';
import { searchTracks, createPlaylist, addTracksToPlaylist, fetchPlaylistTracks } from '../services/api';

const useCSVImport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [results, setResults] = useState(null);

  /**
   * Parse CSV file
   * Expected format: Artist, Title, Label (optional)
   */
  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  /**
   * Search for a single track on Spotify
   * Returns the best match or null
   */
  const searchForTrack = async (artist, title) => {
    try {
      // Build search query - prioritize artist and title
      const query = `${artist} ${title}`.trim();
      if (!query) return null;

      const results = await searchTracks(query);

      if (!results || results.length === 0) {
        return null;
      }

      // Return the first (best) match
      // Spotify's search algorithm generally returns the most relevant result first
      return results[0];
    } catch (error) {
      console.error(`Error searching for track: ${artist} - ${title}`, error);
      return null;
    }
  };

  /**
   * Process CSV and create playlist or add to existing playlist
   * @param {File} file - CSV file
   * @param {string} playlistName - Name for the new playlist (or null if adding to existing)
   * @param {string} playlistDescription - Description (optional)
   * @param {string} existingPlaylistId - ID of existing playlist to add to (optional)
   * @param {boolean} isPublic - Whether playlist should be public (default: false)
   */
  const importFromCSV = async (file, playlistName, playlistDescription = '', existingPlaylistId = null, isPublic = false) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, phase: 'Parsing CSV...' });
    setResults(null);

    try {
      // Step 1: Parse CSV
      const csvData = await parseCSV(file);

      if (csvData.length === 0) {
        throw new Error('CSV file is empty or has no valid data');
      }

      // Validate CSV has required columns (case-insensitive)
      const firstRow = csvData[0];
      const hasArtist = Object.keys(firstRow).some(key => key.toLowerCase().includes('artist'));
      const hasTitle = Object.keys(firstRow).some(key => key.toLowerCase().includes('title') || key.toLowerCase().includes('track'));

      if (!hasArtist || !hasTitle) {
        throw new Error('CSV must contain "Artist" and "Title" columns');
      }

      setProgress({ current: 0, total: csvData.length, phase: 'Searching for tracks...' });

      // Step 2: Search for each track
      const foundTracks = [];
      const notFoundTracks = [];
      const seenTrackIds = new Set(); // Track IDs already found to prevent duplicates within CSV
      let csvDuplicatesSkipped = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        // Get artist and title (case-insensitive)
        const artist = Object.keys(row).find(key => key.toLowerCase().includes('artist'));
        const title = Object.keys(row).find(key => key.toLowerCase().includes('title') || key.toLowerCase().includes('track'));
        const label = Object.keys(row).find(key => key.toLowerCase().includes('label'));

        const artistName = row[artist]?.trim();
        const trackTitle = row[title]?.trim();
        const labelName = row[label]?.trim();

        if (!artistName || !trackTitle) {
          notFoundTracks.push({
            artist: artistName || 'Unknown',
            title: trackTitle || 'Unknown',
            label: labelName,
            reason: 'Missing artist or title'
          });
          setProgress({ current: i + 1, total: csvData.length, phase: 'Searching for tracks...' });
          continue;
        }

        // Search for track
        const track = await searchForTrack(artistName, trackTitle);

        if (track) {
          // Check if we've already found this track in the CSV
          if (seenTrackIds.has(track.id)) {
            csvDuplicatesSkipped++;
            console.log(`Skipping duplicate track in CSV: ${artistName} - ${trackTitle}`);
          } else {
            seenTrackIds.add(track.id);
            foundTracks.push({
              id: track.id,
              name: track.name,
              artist: track.artists?.map(a => a.name).join(', '),
              originalArtist: artistName,
              originalTitle: trackTitle,
              label: labelName
            });
          }
        } else {
          notFoundTracks.push({
            artist: artistName,
            title: trackTitle,
            label: labelName,
            reason: 'Not found on Spotify'
          });
        }

        // Update progress
        setProgress({ current: i + 1, total: csvData.length, phase: 'Searching for tracks...' });

        // Small delay to avoid rate limiting
        if (i < csvData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Step 3: Create or get playlist
      if (foundTracks.length === 0) {
        throw new Error('No tracks were found on Spotify. Please check your CSV data.');
      }

      let playlist;
      if (existingPlaylistId) {
        // Adding to existing playlist
        setProgress({
          current: foundTracks.length,
          total: foundTracks.length,
          phase: 'Adding to existing playlist...'
        });

        // Create a mock playlist object with the existing ID for consistency
        playlist = { id: existingPlaylistId, name: 'Existing Playlist' };
      } else {
        // Creating new playlist
        setProgress({
          current: foundTracks.length,
          total: foundTracks.length,
          phase: 'Creating playlist...'
        });

        const description = playlistDescription ||
          `Imported from CSV - ${foundTracks.length}/${csvData.length} tracks found`;

        playlist = await createPlaylist({
          name: playlistName,
          description: description,
          isPublic: isPublic
        });
      }

      // Step 4: Check for duplicates if adding to existing playlist
      let trackIdsToAdd = foundTracks.map(t => t.id);
      let duplicateCount = 0;

      if (existingPlaylistId) {
        setProgress({
          current: 0,
          total: foundTracks.length,
          phase: 'Checking for duplicate tracks...'
        });

        // Fetch existing tracks from the playlist
        const existingTracks = await fetchPlaylistTracks(existingPlaylistId, 0, 200);
        const existingTrackIds = new Set(existingTracks.map(t => t.id));

        // Filter out duplicates
        const tracksBeforeFilter = trackIdsToAdd.length;
        trackIdsToAdd = trackIdsToAdd.filter(id => !existingTrackIds.has(id));
        duplicateCount = tracksBeforeFilter - trackIdsToAdd.length;

        if (trackIdsToAdd.length === 0) {
          throw new Error('All tracks already exist in the playlist. No new tracks to add.');
        }
      }

      // Step 5: Add tracks in batches of 100 (Spotify limit)
      setProgress({
        current: 0,
        total: trackIdsToAdd.length,
        phase: 'Adding tracks to playlist...'
      });

      const batchSize = 100;

      for (let i = 0; i < trackIdsToAdd.length; i += batchSize) {
        const batch = trackIdsToAdd.slice(i, i + batchSize);
        await addTracksToPlaylist(playlist.id, batch);

        setProgress({
          current: Math.min(i + batchSize, trackIdsToAdd.length),
          total: trackIdsToAdd.length,
          phase: 'Adding tracks to playlist...'
        });
      }

      // Success!
      const finalResults = {
        success: true,
        playlist: playlist,
        foundTracks: foundTracks,
        notFoundTracks: notFoundTracks,
        summary: {
          total: csvData.length,
          found: foundTracks.length,
          notFound: notFoundTracks.length,
          csvDuplicates: csvDuplicatesSkipped,
          playlistDuplicates: duplicateCount,
          added: trackIdsToAdd.length
        }
      };

      setResults(finalResults);
      setIsProcessing(false);
      setProgress({ current: foundTracks.length, total: foundTracks.length, phase: 'Complete!' });

      return finalResults;

    } catch (error) {
      console.error('CSV import error:', error);
      setIsProcessing(false);
      setResults({
        success: false,
        error: error.message
      });
      throw error;
    }
  };

  const reset = () => {
    setIsProcessing(false);
    setProgress({ current: 0, total: 0, phase: '' });
    setResults(null);
  };

  return {
    importFromCSV,
    isProcessing,
    progress,
    results,
    reset
  };
};

export default useCSVImport;
