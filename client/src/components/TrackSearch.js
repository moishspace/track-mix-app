// TrackSearch.js
import React, { useState, useEffect, useMemo } from 'react';
import TrackTable from './TrackTable';
import PlaylistControls from './PlaylistControls';
import ErrorBoundary from './ErrorBoundary';
import SpotifyWebPlayer from './SpotifyWebPlayer';
import { searchTracks, fetchDetailsWithDelays, fetchAndUpdateTrackDetails, searchSimilarTracks, fetchPlaylists, createPlaylist, addTracksToPlaylist, deletePlaylist, fetchPlaylistTracks } from '../services/api';
import CriteriaFilterPanel from './CriteriaFilterPanel';


const TrackSearch = ({ searchTerm }) => {
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [criteria, setCriteria] = useState({});
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  useEffect(() => {
    if (searchTerm) {
      (async () => {
        try {
          // Step 1: Fetch basic track data
          const basicTracks = await searchTracks(searchTerm);
          const trackIds = basicTracks.map((track) => track.id);
  
          // Step 2: Update UI immediately with basic track data
          setFilteredTracks(basicTracks);
  
          // Step 3: Fetch additional details and update state directly
          trackIds.forEach((trackId) => {
            fetchAndUpdateTrackDetails(trackId, setTrackDetails);
          });
        } catch (error) {
          console.error("Error fetching search tracks:", error);
        }
      })();
    }
  }, [searchTerm]);

  useEffect(() => {
    const loadPlaylists = async () => {
      const fetchedPlaylists = await fetchPlaylists();
      setPlaylists(fetchedPlaylists);
    };
    loadPlaylists();
  }, []);

  const handlePlaylistChange = (event) => {
    const newPlaylistId = event.target.value;
    setSelectedPlaylist(newPlaylistId);
  };

  const handleShowPlaylist = async () => {
    if (!selectedPlaylist) {
      alert("Please select a playlist to show.");
      return;
    }
  
    try {
      setSelectAllChecked(false);
      // Fetch basic track data from the playlist
      const playlistData = await fetchPlaylistTracks(selectedPlaylist);
      
      // Process the basic track data
      const processedTracks = playlistData.map((item, index) => ({
        id: item.track?.id || `unknown-id-${index}`,
        name: item.track?.name || 'Unknown Track',
        artists: item.track?.artists || [],
        album: item.track?.album || {},
        duration_ms: item.track?.duration_ms || null,
        preview_url: item.track?.preview_url || null,
      }));

      // Update filteredTracks state
      setFilteredTracks(processedTracks);
  
      // Fetch additional details for the tracks
      const trackIds = processedTracks.map((track) => track.id);
      const detailsObject = await fetchDetailsWithDelays(trackIds);

      // Update trackDetails state
      setTrackDetails((prevDetails) => ({ ...prevDetails, ...detailsObject }));

      // Check which tracks in the new playlist are already selected
      const selectedIdsInPlaylist = trackIds.filter((id) => selectedTrackIds.includes(id));

      // Update selectedTrackIds based on the new playlist tracks
      setSelectedTrackIds(selectedIdsInPlaylist);

      // Update "Select All" checkbox state based on the new selection
      setSelectAllChecked(selectedIdsInPlaylist.length === trackIds.length);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  };

  const handleCreatePlaylist = async (playlistData, closeModal) => {
    try {
      const newPlaylist = await createPlaylist(playlistData);
      setPlaylists([...playlists, newPlaylist]); // Update playlists state
      setSelectedPlaylist(newPlaylist.id); // Set new playlist as selected
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylist) {
      alert("Please select a playlist.");
      return;
    }
    if (selectedTrackIds.length === 0) {
      alert("Please select at least one track to add.");
      return;
    }
  
    try {
      await addTracksToPlaylist(selectedPlaylist, selectedTrackIds);
      alert("Tracks added to playlist successfully!");
    } catch (error) {
      console.error("Error adding tracks to playlist:", error);
      alert("Failed to add tracks to playlist.");
    }
  };

  const handleDeletePlaylist = async (playlist) => {
    try {
      await deletePlaylist(playlist.id);
      const updatedPlaylists = playlists.filter((p) => p.id !== playlist.id);
      setPlaylists(updatedPlaylists);
  
      if (selectedPlaylist === playlist.id) {
        setSelectedPlaylist(updatedPlaylists.length > 0 ? updatedPlaylists[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      alert("Failed to delete playlist.");
    }
  };

  const handleRowClick = (row) => setSelectedTrack(row);
  const handleCheckboxClick = (id) =>
    setSelectedTrackIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );

  const handleSelectAllClick = () => {
    if (selectAllChecked) {
      setSelectedTrackIds([]);
    } else {
      setSelectedTrackIds(filteredTracks.map((track) => track.id));
    }
    setSelectAllChecked(!selectAllChecked);
  };

  const handleRowRightClick = (event, row) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      row,
    });
  };

  const searchSimilar = () => {
    if (selectedTrack) {
      // Filter criteria to include only active items
      const activeCriteria = Object.fromEntries(
        Object.entries(criteria).filter(([key, value]) => value && value.active)
      );

      fetchSimilarTracks(selectedTrack.id, activeCriteria);
    } else {
      alert("Please select a track to find similar tracks.");
    }
  };

  const fetchSimilarTracks = async (trackId, criteria) => {
    try {
      const trackData = trackDetails[trackId] || filteredTracks.find((track) => track.id === trackId);
  
      // Construct criteria parameters directly from the active criteria
      const criteriaParams = {
        trackId,
        genre: criteria.genre || trackData?.genres,
        min_tempo: criteria.tempo?.min,
        max_tempo: criteria.tempo?.max,
        min_danceability: criteria.danceability?.min,
        max_danceability: criteria.danceability?.max,
        min_energy: criteria.energy?.min,
        max_energy: criteria.energy?.max,
        min_valence: criteria.valence?.min,
        max_valence: criteria.valence?.max,
        min_acousticness: criteria.acousticness?.min,
        max_acousticness: criteria.acousticness?.max,
        min_instrumentalness: criteria.instrumentalness?.min,
        max_instrumentalness: criteria.instrumentalness?.max,
        min_liveness: criteria.liveness?.min,
        max_liveness: criteria.liveness?.max,
      };
  
      // Fetch similar tracks based on the provided criteria
      const similarTracks = await searchSimilarTracks(criteriaParams);
  
      // Retrieve or construct the original track details
      const originalTrack = trackData || { id: trackId, name: "Unknown", album: {}, artists: [] };
      const filteredSimilarTracks = similarTracks.filter((track) => track.id !== trackId);
  
      // Include the original track at the start of the list
      const updatedTracks = [originalTrack, ...filteredSimilarTracks];
  
      // Update the table with the similar tracks
      setFilteredTracks(updatedTracks);
  
      // Fetch additional details for each similar track and update the state
      const trackIds = updatedTracks.map((track) => track.id);
      const detailsObject = await fetchDetailsWithDelays(trackIds);
      setTrackDetails((prevDetails) => ({ ...prevDetails, ...detailsObject }));
    } catch (error) {
      console.error("Error fetching similar tracks:", error);
      alert("Failed to fetch similar tracks. Please try again.");
    }
  };


  const processedTracks = useMemo(() => {
    const playableTracks = filteredTracks.filter((track) => track.preview_url !== null);
    // console.log(playableTracks);
    return playableTracks.map((track) => ({
        id: track.id,
        name: track.name || 'Unknown Track',
        artistsName: track.artists?.map((artist) => artist.name).join(', ') || '',
        albumName: track.album?.name || '',
        releaseDate: track.album?.release_date || '',
        albumImageUrl: track.album?.images[0]?.url || '',
        duration: track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${String( Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
        preview_url: track.preview_url || null,
        genre: trackDetails[track.id]?.genres?.join(', ') || '',
        tempo: trackDetails[track.id]?.tempo ? Math.round(trackDetails[track.id]?.tempo) : '',
        key: trackDetails[track.id]?.key || '',
        danceability: trackDetails[track.id]?.danceability || '',
        energy: trackDetails[track.id]?.energy || '',
        valence: trackDetails[track.id]?.valence || '',
        acousticness: trackDetails[track.id]?.acousticness || '',
        instrumentalness: trackDetails[track.id]?.instrumentalness || '',
        liveness: trackDetails[track.id]?.liveness || '',
        timeSignature: trackDetails[track.id]?.timeSignature || '',
        beats: trackDetails[track.id]?.analysis?.beats || [],
        sections: trackDetails[track.id]?.analysis?.sections || [],
        segments: trackDetails[track.id]?.analysis?.segments || [],

      }));
    }, [filteredTracks, trackDetails]);

  return (
    <div className="flex-container">
      <CriteriaFilterPanel criteria={criteria} setCriteria={setCriteria} onSearchSimilar={searchSimilar} initialTrackDetails={selectedTrack} />

      <div className="table-container">
        <TrackTable
          processedTracks={processedTracks}
          selectAllChecked={selectAllChecked}
          selectedTrackIds={selectedTrackIds}
          handleSelectAllClick={handleSelectAllClick}
          handleCheckboxClick={handleCheckboxClick}
          handleRowClick={handleRowClick}
          handleRowRightClick={handleRowRightClick}
          selectedTrack={selectedTrack}
        />

        <ErrorBoundary>
          <SpotifyWebPlayer
            playlistUris={filteredTracks.map((track) => `spotify:track:${track.id}`)}
            initialTrackIndex={filteredTracks.findIndex((track) => track.id === selectedTrack?.id)}
          />
        </ErrorBoundary>

        {/* Playlist Controls */}
        <PlaylistControls
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          handlePlaylistChange={handlePlaylistChange}
          handleAddToPlaylist={handleAddToPlaylist}
          handleShowPlaylist={handleShowPlaylist}
          handleCreatePlaylist={handleCreatePlaylist}
          handleDeletePlaylist={handleDeletePlaylist}
        />
      </div>
    </div>
  );
};

export default TrackSearch;