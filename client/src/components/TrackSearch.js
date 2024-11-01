import './DataGridStyles.css';
import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { searchTracks, searchSimilarTracks } from '../services/api';
import CriteriaFilterPanel from './CriteriaFilterPanel';

const fetchDetailsWithDelays = async (trackIds, delayMs = 1000) => {
  const details = {};
  for (const trackId of trackIds) {
    try {
      const response = await fetch(`http://localhost:3001/api/track-details-with-retry?trackId=${trackId}`);
      details[trackId] = await response.json();
      console.log(`Fetched details for track ${trackId}`); // Simplified logging
    } catch (error) {
      console.error(`Error fetching details for track ${trackId}:`, error);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return details;
};

const TrackSearch = ({ searchTerm }) => {
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [criteria, setCriteria] = useState({});
  const [selectedTrack, setSelectedTrack] = useState(null);


  useEffect(() => {
    if (searchTerm) {
      console.log(`Searching for tracks with term: ${searchTerm}`);
      searchTracks(searchTerm)
        .then(async (tracks) => {
          setFilteredTracks(tracks);
          const trackIds = tracks.map((track) => track.id);
          const detailsObject = await fetchDetailsWithDelays(trackIds);
          setTrackDetails(detailsObject);
        })
        .catch((error) => console.error('Error fetching tracks:', error));
    }
  }, [searchTerm]);

  useEffect(() => {
    console.log('Filtered tracks updated:', filteredTracks);
  }, [filteredTracks]);

  // Handle right-click to show context menu
  const handleRowRightClick = (event, row) => {
    event.preventDefault(); // Disable the default context menu
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      row, // Use row data directly
    });
  };

  // Close the context menu
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Helper function for fetching similar tracks
const fetchSimilarTracks = async (trackId, criteria) => {
  const trackData = trackDetails[trackId];

  const criteriaParams = {
    trackId,
    genre: criteria.genre || trackData?.genres,
    tempo: criteria.tempo || trackData?.tempo,
    min_danceability: criteria.min_danceability || trackData?.danceability - 0.1,
    max_danceability: criteria.max_danceability || trackData?.danceability + 0.1,
    min_energy: criteria.min_energy || trackData?.energy - 0.1,
    max_energy: criteria.max_energy || trackData?.energy + 0.1,
    min_valence: criteria.min_valence || trackData?.valence - 0.1,
    max_valence: criteria.max_valence || trackData?.valence + 0.1,
    min_acousticness: criteria.min_acousticness || trackData?.acousticness - 0.1,
    max_acousticness: criteria.max_acousticness || trackData?.acousticness + 0.1,
    min_instrumentalness: criteria.min_instrumentalness || trackData?.instrumentalness - 0.1,
    max_instrumentalness: criteria.max_instrumentalness || trackData?.instrumentalness + 0.1,
    min_liveness: criteria.min_liveness || trackData?.liveness - 0.1,
    max_liveness: criteria.max_liveness || trackData?.liveness + 0.1,
  };

  let similarTracks = await searchSimilarTracks(criteriaParams);
  console.log('Similar tracks received:', similarTracks);

  // Position original track if it’s in the results
  const trackIndex = similarTracks.findIndex((track) => track.id === trackId);
  if (trackIndex !== -1) {
    const [originalTrack] = similarTracks.splice(trackIndex, 1);
    similarTracks = [originalTrack, ...similarTracks];
  }

  // Update filtered tracks and details state
  setFilteredTracks(similarTracks);
  const trackIds = similarTracks.map((track) => track.id);
  const detailsObject = await fetchDetailsWithDelays(trackIds);
  setTrackDetails((prevDetails) => ({ ...prevDetails, ...detailsObject }));
};

// // Updated handleGetSimilarTracks function
// const handleGetSimilarTracks = () => {
//   const trackId = contextMenu?.row?.id;
//   if (trackId) fetchSimilarTracks(trackId, criteria);
// };

// Updated onUpdateSearch function
const onUpdateSearch = () => {
  if (selectedTrack) {
    fetchSimilarTracks(selectedTrack.id, criteria);
  } else {
    alert("Please select a track to find similar tracks.");
  }
};

  // Handle "Get Similar" click
  const handleGetSimilarTracks = async () => {
    const trackId = contextMenu.row.id;
    const trackData = trackDetails[trackId];

    // Combine user-selected criteria with track data
    const criteriaParams = {
      trackId, 
      genre: criteria.genre || trackData?.genres,
      tempo: criteria.tempo || trackData?.tempo,
      min_danceability: criteria.min_danceability || trackData?.danceability - 0.1,
      max_danceability: criteria.max_danceability || trackData?.danceability + 0.1,
      min_energy: criteria.min_energy || trackData?.energy - 0.1,
      max_energy: criteria.max_energy || trackData?.energy + 0.1,
      min_valence: criteria.min_valence || trackData?.valence - 0.1,
      max_valence: criteria.max_valence || trackData?.valence + 0.1,
      min_acousticness: criteria.min_acousticness || trackData?.acousticness - 0.1,
      max_acousticness: criteria.max_acousticness || trackData?.acousticness + 0.1,
      min_instrumentalness: criteria.min_instrumentalness || trackData?.instrumentalness - 0.1,
      max_instrumentalness: criteria.max_instrumentalness || trackData?.instrumentalness + 0.1,
      min_liveness: criteria.min_liveness || trackData?.liveness - 0.1,
      max_liveness: criteria.max_liveness || trackData?.liveness + 0.1,
    };
  
    let similarTracks = await searchSimilarTracks(criteriaParams);
    console.log('Similar tracks received:', similarTracks);
  
    const trackIndex = similarTracks.findIndex((track) => track.id === trackId);
    let originalTrack;
  
    if (trackIndex !== -1) {
      // If found, remove it from the list and add it at the start
      [originalTrack] = similarTracks.splice(trackIndex, 1);
    } else {
      // Otherwise, retrieve the original track's details from filteredTracks or make a new API call
      originalTrack = filteredTracks.find((track) => track.id === trackId) || trackDetails[trackId];
  
      if (originalTrack) {
        // Ensure track has necessary metadata; if not, fetch it
        originalTrack = {
          id: trackId,
          name: originalTrack.name || "Unknown",
          album: originalTrack.album || { name: "Unknown" },
          artists: originalTrack.artists || [{ name: "Unknown" }],
          releaseDate: originalTrack.releaseDate || "Unknown",
          ...trackDetails[trackId], // Include detailed audio features if present
        };
      } else {
        console.warn(`No details found for track ${trackId}, skipping add to top.`);
      }
    }
  
    // Add the original track to the start of the list if it exists
    if (originalTrack) similarTracks = [originalTrack, ...similarTracks];

    // Update the table with similar tracks
    setFilteredTracks(similarTracks);
  
    // Fetch details for each similar track and update trackDetails state
    const trackIds = similarTracks.map((track) => track.id);
    const detailsObject = await fetchDetailsWithDelays(trackIds);
    setTrackDetails((prevDetails) => ({ ...prevDetails, ...detailsObject }));
  
    handleCloseContextMenu();
  };

  const handleExportToCSV = () => {
    const csvContent = filteredTracks.map((track) => ({
      Name: track.name || 'Unknown',
      Artist: track.artists?.[0]?.name || 'Unknown',
      Album: track.album?.name || 'Unknown',
      ReleaseDate: track.album?.release_date || 'Unknown',
      Tempo: trackDetails[track.id]?.tempo || '',
      Key: trackDetails[track.id]?.key || '',
      Danceability: trackDetails[track.id]?.danceability || '',
      Energy: trackDetails[track.id]?.energy || '',
      Valence: trackDetails[track.id]?.valence || '',
      Acousticness: trackDetails[track.id]?.acousticness || '',
      Instrumentalness: trackDetails[track.id]?.instrumentalness || '',
      Liveness: trackDetails[track.id]?.liveness || '',
      Genre: trackDetails[track.id]?.genres?.join(', ') || '',
      SpotifyLink: `https://open.spotify.com/track/${track.id}`, // Link to play on Spotify
    }));
    
    // Convert the content to CSV format
    const csvRows = [
      Object.keys(csvContent[0]).join(','), // Header row
      ...csvContent.map(row => Object.values(row).map(value => `"${value}"`).join(',')) // Data rows with values quoted
    ].join('\n');
    
    // Create the CSV file and trigger download
    const blob = new Blob([csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'tracks.csv');
    a.click();
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
  
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRowClick = (row) => {
    setSelectedTrack(row); // Track row selection
    setCriteria({
      genre: row.genres ? row.genres[0] : '',
      tempo: { min: row.tempo - 2, max: row.tempo + 2 },
      danceability: { min: row.danceability - 0.1, max: row.danceability + 0.1 },
      energy: { min: row.energy - 0.1, max: row.energy + 0.1 },
      valence: { min: row.valence - 0.1, max: row.valence + 0.1 },
      acousticness: { min: row.acousticness - 0.1, max: row.acousticness + 0.1 },
      instrumentalness: { min: row.instrumentalness - 0.1, max: row.instrumentalness + 0.1 },
      liveness: { min: row.liveness - 0.1, max: row.liveness + 0.1 },
    });
  };

  // Preprocess filteredTracks to include trackDetails properties directly
  const processedTracks = filteredTracks.map(track => ({
    ...track,
    artistsName: track.artists?.[0]?.name || 'Unknown', // Flatten the first artist name
    albumName: track.album?.name || 'Unknown', 
    danceability: trackDetails[track.id]?.danceability || '',
    energy: trackDetails[track.id]?.energy || '',
    tempo: trackDetails[track.id]?.tempo || '',
    key: trackDetails[track.id]?.key || '',
    valence: trackDetails[track.id]?.valence || '',
    acousticness: trackDetails[track.id]?.acousticness || '',
    instrumentalness: trackDetails[track.id]?.instrumentalness || '',
    liveness: trackDetails[track.id]?.liveness || '',
    genre: trackDetails[track.id]?.genres?.join(', ') || '',
  }));

  const columns = useMemo(() => [
    {
      field: 'name',
      headerName: 'Track Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
      // No renderCell needed for sorting to work directly
    },
    {
      field: 'preview',
      headerName: 'Preview',
      minWidth: 400,
      flex: 1,
      sortable: false, // Sorting is not meaningful here due to the iframe
      renderCell: (params) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <iframe
            src={`https://open.spotify.com/embed/track/${params.row.id}`}
            width="380"
            height="80"
            allow="encrypted-media"
            style={{ border: 'none' }}
            title={`Spotify preview of ${params.row.id}`}
          ></iframe>
        </div>
      ),
    },
    {
      field: 'artistsName',
      headerName: 'Artist Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
      // Direct data access in field; assuming filteredTracks includes artist names at top level
    },
    {
      field: 'albumName',
      headerName: 'Album Name',
      minWidth: 150,
      flex: 1,
      sortable: true,
      // Direct data access in field for sorting
    },
    {
      field: 'releaseDate',
      headerName: 'Release Date',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'genre',
      headerName: 'Genre',
      minWidth: 100,
      flex: 1,
      sortable: true,
    },
    {
      field: 'tempo',
      headerName: 'Tempo',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'key',
      headerName: 'Key',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'danceability',
      headerName: 'Danceability',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'energy',
      headerName: 'Energy',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'valence',
      headerName: 'Valence',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'acousticness',
      headerName: 'Acousticness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'instrumentalness',
      headerName: 'Instrumentalness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
    {
      field: 'liveness',
      headerName: 'Liveness',
      minWidth: 80,
      flex: 1,
      sortable: true,
    },
], [trackDetails, selectedTrack]);
  return (
    <div className="flex-container">
        <CriteriaFilterPanel 
          criteria={criteria} 
          setCriteria={setCriteria} 
          onUpdateSearch={onUpdateSearch} 
          initialTrackDetails={selectedTrack}
        />
        <div className="table-container">
          <DataGrid
            className="custom-data-grid"
            rows={processedTracks}
            columns={columns}
            pageSize={10}
            rowHeight={90}
            getRowId={(row) => row.id}
            disableSelectionOnClick
            // disableVirtualization={true}
            onRowClick={(params) => handleRowClick(params.row)}
            getRowClassName={(params) => (params.row.id === selectedTrack?.id ? 'selected-row' : '')}
            onRowContextMenu={(event, params) => {
              event.preventDefault(); // Prevent the default context menu
              const row = filteredTracks.find((track) => track.id === params.id); // Get row data
              handleRowRightClick(event, row);
            }}
          />

          {/* Render context menu */}
          {contextMenu && (
            <div
              style={{
                position: 'absolute',
                top: contextMenu.mouseY,
                left: contextMenu.mouseX,
                backgroundColor: 'white',
                borderRadius: '4px',
                boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
                padding: '10px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the menu
            >
              {/* "Get Similar Tracks" Menu Item */}
              <div
                onClick={handleGetSimilarTracks}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#333',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
              >
                Get Similar Tracks
              </div>

              {/* Divider line */}
              <div
                style={{
                  borderBottom: '1px solid #ddd',
                  margin: '8px 0',
                }}
              ></div>

              {/* "Export to CSV" Menu Item */}
              <div
                onClick={handleExportToCSV}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#333',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f0f0f0')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
              >
                Export to CSV
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default TrackSearch;