// MainDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import TrackTable from './TrackTable';
import PlaylistControls from './PlaylistControls';
import TrackPlayer from './TrackPlayer';
import CriteriaFilterPanel from './CriteriaFilterPanel';
import useTrackSearch from '../hooks/useTrackSearch';
import useSimilarTracks from '../hooks/useSimilarTracks';
import useTrackTable from '../hooks/useTrackTable';
import usePlaylist from '../hooks/usePlaylist';

const MainDashboard = ({ searchTerm }) => {
  const [criteria, setCriteria] = useState({});
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  const { filteredTracks, trackDetails, setFilteredTracks, setTrackDetails } = useTrackSearch(searchTerm);

  const {
    playlists,
    selectedPlaylist,
    handlePlaylistChange,
    handleShowPlaylist,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
  } = usePlaylist(setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked);
  
  const {
    handleSelectAllClick,
    handleRowClick,
    handleCheckboxClick,
    handleRowRightClick,
  } = useTrackTable(filteredTracks, setSelectedTrack, selectedTrackIds, setSelectedTrackIds, selectAllChecked, setSelectAllChecked);
  
  const { searchSimilar } = useSimilarTracks(selectedTrack, criteria, setFilteredTracks, setTrackDetails);

  useEffect(() => {
    const allSelected = selectedTrackIds.length === filteredTracks.length && filteredTracks.length > 0;
    const noneSelected = selectedTrackIds.length === 0;
  
    if (allSelected) {
      setSelectAllChecked(true);
    } else if (noneSelected) {
      setSelectAllChecked(false);
    } else {
      setSelectAllChecked(false);
    }
  }, [filteredTracks, selectedTrackIds]);

  const processedTracks = useMemo(() => {
    // Filter tracks that have a valid preview URL
    const playableTracks = filteredTracks.filter((track) => track.preview_url !== null);
  
    return playableTracks.map((track) => {
      const additionalDetails = trackDetails[track.id] || {};
  
      return {
        id: track.id,
        name: track.name || '',
        artistsName: track.artistsName || (Array.isArray(track.artists) ? track.artists.map((artist) => artist.name).join(', ') : ''),
        albumName: track.album?.name || '',
        releaseDate: track.album?.release_date || '',
        albumImageUrl: track.album?.images[0]?.url || '',
        duration: track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}` : '',
        preview_url: track.preview_url || null,
        genre: additionalDetails.genres?.join(', ') || '',
        tempo: additionalDetails.features?.tempo ? Math.round(additionalDetails.features.tempo) : '',
        key: additionalDetails.features?.key || '',
        danceability: additionalDetails.features?.danceability || '',
        energy: additionalDetails.features?.energy || '',
        valence: additionalDetails.features?.valence || '',
        acousticness: additionalDetails.features?.acousticness || '',
        instrumentalness: additionalDetails.features?.instrumentalness || '',
        liveness: additionalDetails.features?.liveness || '',
        timeSignature: additionalDetails.features?.timeSignature || '',
        beats: additionalDetails.analysis?.beats || [],
        sections: additionalDetails.analysis?.sections || [],
        segments: additionalDetails.analysis?.segments || [],
      };
    });
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

        <TrackPlayer filteredTracks={filteredTracks} selectedTrack={selectedTrack} />

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

export default MainDashboard;