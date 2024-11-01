import './DataGridStyles.css';
import React, { useState, useEffect, useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { searchTracks, searchSimilarTracks } from '../services/api';

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

  // Handle "Get Similar" click
  const handleGetSimilarTracks = async () => {
    const trackId = contextMenu.row.id;
    const trackData = trackDetails[trackId];
  
    // Criteria based on available track details
    const criteria = {
      trackId, // Use track ID as seed track
      genre: trackData?.genres,
      tempo: trackData?.tempo,
      min_danceability: trackData?.danceability ? trackData.danceability - 0.1 : undefined,
      max_danceability: trackData?.danceability ? trackData.danceability + 0.1 : undefined,
      min_energy: trackData?.energy ? trackData.energy - 0.1 : undefined,
      max_energy: trackData?.energy ? trackData.energy + 0.1 : undefined,
      min_valence: trackData?.valence ? trackData.valence - 0.1 : undefined,
      max_valence: trackData?.valence ? trackData.valence + 0.1 : undefined,
      min_acousticness: trackData?.acousticness ? trackData.acousticness - 0.1 : undefined,
      max_acousticness: trackData?.acousticness ? trackData.acousticness + 0.1 : undefined,
      min_instrumentalness: trackData?.instrumentalness ? trackData.instrumentalness - 0.1 : undefined,
      max_instrumentalness: trackData?.instrumentalness ? trackData.instrumentalness + 0.1 : undefined,
      min_liveness: trackData?.liveness ? trackData.liveness - 0.1 : undefined,
      max_liveness: trackData?.liveness ? trackData.liveness + 0.1 : undefined,
    };
  
    let similarTracks = await searchSimilarTracks(criteria);
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

  const columns = useMemo(() => [
    // { field: 'name', headerName: 'Track Name', minWidth: 150, flex: 1 },
    {
      field: 'name',
      headerName: 'Track Name',
      minWidth: 150,
      flex: 1,
      renderCell: (params) => (
        <span
          onContextMenu={(event) => handleRowRightClick(event, params.row)} // Attach right-click event
          style={{ cursor: 'context-menu' }}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'artistName',
      headerName: 'Artist Name',
      minWidth: 150,
      flex: 1,
      renderCell: (params) => {
        const artistName = params.row?.artists?.[0]?.name || 'Unknown';
        return <span>{artistName}</span>;
      },
    },
    {
      field: 'albumName',
      headerName: 'Album Name',
      minWidth: 150,
      flex: 1,
      renderCell: (params) => <span>{params.row?.album?.name || 'Unknown'}</span>,
    },
    {
      field: 'releaseDate',
      headerName: 'Release Date',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{params.row?.album?.release_date?.split('-')[0] || 'Unknown'}</span>,
    },
    {
      field: 'tempo',
      headerName: 'Tempo',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.tempo || ''}</span>,
    },
    {
      field: 'key',
      headerName: 'Key',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.key || ''}</span>,
    },
    {
      field: 'danceability',
      headerName: 'Danceability',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.danceability || ''}</span>,
    },
    {
      field: 'energy',
      headerName: 'Energy',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.energy || ''}</span>,
    },
    {
      field: 'valence',
      headerName: 'Valence',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.valence || ''}</span>,
    },
    {
      field: 'acousticness',
      headerName: 'Acousticness',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.acousticness || ''}</span>,
    },
    {
      field: 'instrumentalness',
      headerName: 'Instrumentalness',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.instrumentalness || ''}</span>,
    },
    {
      field: 'liveness',
      headerName: 'Liveness',
      minWidth: 80,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.liveness || ''}</span>,
    },
    {
      field: 'genre',
      headerName: 'Genre',
      minWidth: 100,
      flex: 1,
      renderCell: (params) => <span>{trackDetails[params.row.id]?.genres?.join(', ') || ''}</span>,
    },
    {
      field: 'preview',
      headerName: 'Preview',
      minWidth: 300,
      flex: 1,
      renderCell: (params) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <iframe
            src={`https://open.spotify.com/embed/track/${params.row.id}`}
            width="280"
            height="80"
            allow="encrypted-media"
            style={{ border: 'none' }}
            title={`Spotify preview of ${params.row.id}`}
          ></iframe>
        </div>
      ),
    },
  ], [trackDetails]);

  return (
    <div style={{ height: 600, width: '100%', marginTop: '20px' }}>
      <DataGrid
        className="custom-data-grid"
        rows={filteredTracks}
        columns={columns}
        pageSize={10}
        rowHeight={90}
        getRowId={(row) => row.id}
        disableSelectionOnClick
        disableVirtualization={true} 
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
  );
};

export default TrackSearch;