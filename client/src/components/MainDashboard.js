// MainDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import TrackTable from './TrackTable';
import PlaylistControls from './PlaylistControls';
import TrackPlayer from './TrackPlayer';
import CriteriaFilterPanel from './CriteriaFilterPanel';
import AudioWaveform from './AudioWaveform';
import useTrackSearch from '../hooks/useTrackSearch';
import useSimilarTracks from '../hooks/useSimilarTracks';
import useTrackTable from '../hooks/useTrackTable';
import useTrackPlayer from '../hooks/useTrackPlayer';
import usePlaylist from '../hooks/usePlaylist';

const MainDashboard = ({ searchTerm }) => {
  const [criteria, setCriteria] = useState({});
  const [currentTrackIndex, setSelectedTrackIndex] = useState(0);
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
    handleExportPlaylist,
  } = usePlaylist(filteredTracks, setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked);
  
  const {
    handleSelectAllClick,
    handleRowClick,
    handleCheckboxClick,
    handleRowRightClick,
  } = useTrackTable(filteredTracks, setSelectedTrack, setSelectedTrackIndex, selectedTrackIds, setSelectedTrackIds, selectAllChecked, setSelectAllChecked);
  
  const { searchSimilar } = useSimilarTracks(selectedTrack, criteria, setFilteredTracks, setTrackDetails);

  const {
    playerRef,
    trackProgress,
    handleProgressUpdate,
    handleSeek,
    handleTrackChange,
  } = useTrackPlayer(filteredTracks, setSelectedTrack, currentTrackIndex, setSelectedTrackIndex);


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
    const playableTracks = filteredTracks.filter((track) => track.preview_url !== null);
  
    return filteredTracks.map((track) => {
      const additionalDetails = trackDetails[track.id] || {};
     
      return {
        id: track.id,
        name: track.name || '',
        artistsName: track.artistsName || (Array.isArray(track.artists) ? track.artists.map((artist) => artist.name).join(', ') : ''),
        album: track?.album,
        albumName: track.album?.name || '',
        releaseDate: track.album?.release_date || '',
        albumImageUrl: track.album?.images[0]?.url || '',
        duration_ms:track.duration_ms,
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
        tatums: additionalDetails.analysis?.tatums || [],
        uri: track.uri,
      };
    });
  }, [filteredTracks, trackDetails]);

  useEffect(() => {
    if (processedTracks[currentTrackIndex]) {
      setSelectedTrack(processedTracks[currentTrackIndex]);
    }
  }, [currentTrackIndex, processedTracks]);

  return (
    <div className="flex-container">
      <CriteriaFilterPanel criteria={criteria} setCriteria={setCriteria} onSearchSimilar={searchSimilar} initialTrackDetails={selectedTrack} />

      <div className="table-container">
        {/* Track Table */}
        <TrackTable
          processedTracks={processedTracks}
          selectedTrack={selectedTrack}
          selectAllChecked={selectAllChecked}
          selectedTrackIds={selectedTrackIds}
          handleSelectAllClick={handleSelectAllClick}
          handleCheckboxClick={handleCheckboxClick}
          handleRowClick={handleRowClick}
          handleRowRightClick={handleRowRightClick}
        />

        {/* Waveform Component */}
        <div className="waveform-section">
          {selectedTrack ? (
            <AudioWaveform
              key={selectedTrack?.id || 'default'}
              selectedTrack={selectedTrack}
              trackProgress={trackProgress}
              onSeek={handleSeek}
            />
          ) : (
            <div className="waveform-container">
              <div className="waveform-background" />
              <div className="waveform-empty">Please select a track to display the waveform.</div>
            </div>
          )}
        </div>
       
        {/* Track Player */}
        <TrackPlayer 
            ref={playerRef}
            processedTracks={processedTracks}
            selectedTrack={selectedTrack}
            currentTrackIndex={currentTrackIndex}
            setCurrentTrackIndex={setSelectedTrackIndex}
            onProgress={handleProgressUpdate}
            onTrackChange={handleTrackChange}
        />

        {/* Playlist Controls */}
        <PlaylistControls
          playlists={playlists}
          selectedPlaylist={selectedPlaylist}
          handlePlaylistChange={handlePlaylistChange}
          handleAddToPlaylist={handleAddToPlaylist}
          handleShowPlaylist={handleShowPlaylist}
          handleCreatePlaylist={handleCreatePlaylist}
          handleDeletePlaylist={handleDeletePlaylist}
          handleExportPlaylist={handleExportPlaylist}
        />
      </div>
    </div>
  );
};

export default MainDashboard;