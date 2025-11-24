// MainDashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { searchPlatforms } from '../services/api';

const MainDashboard = ({ searchTerm }) => {
  const [criteria, setCriteria] = useState({});
  const [currentTrackIndex, setSelectedTrackIndex] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [platformData, setPlatformData] = useState({});
  const { filteredTracks, trackDetails, setFilteredTracks, setTrackDetails } = useTrackSearch(searchTerm);

  // Search platforms for a track
  const searchTrackPlatforms = useCallback(async (trackId, artistName, trackName) => {
    try {
      const results = await searchPlatforms(artistName, trackName);
      setPlatformData(prev => ({
        ...prev,
        [trackId]: results
      }));
      return results;
    } catch (error) {
      console.error('Error searching platforms:', error);
      return null;
    }
  }, []);

  // Search platforms for all visible tracks (called when tracks load)
  useEffect(() => {
    const searchAllPlatforms = async () => {
      for (const track of filteredTracks) { // Search all tracks
        if (!platformData[track.id]) {
          const artistName = track.artistsName || (Array.isArray(track.artists) ? track.artists.map(a => a.name).join(', ') : '');
          await searchTrackPlatforms(track.id, artistName, track.name);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    if (filteredTracks.length > 0) {
      searchAllPlatforms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTracks]);

  const {
    playlists,
    selectedPlaylist,
    handlePlaylistChange,
    handleShowPlaylist,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
    handleExportPlaylist,
  } = usePlaylist(filteredTracks, trackDetails, setFilteredTracks, setTrackDetails, selectedTrackIds, setSelectedTrackIds, setSelectAllChecked);
  
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
      const platforms = platformData[track.id] || {};

      // Compute energyLevel from energy value (matching Python energy_to_level)
      const getEnergyLevel = (energy) => {
        if (energy === null || energy === undefined || energy === '') return '';
        const e = parseFloat(energy);
        if (isNaN(e)) return '';
        if (e < 0.25) return 'Chill / Ambient';
        if (e < 0.45) return 'Warm-up Flow';
        if (e < 0.6) return 'Groove';
        if (e < 0.75) return 'Uplift';
        if (e < 0.9) return 'Drive / Peak';
        return 'Emotional High';
      };
      const energyValue = additionalDetails.energy ?? additionalDetails.features?.energy ?? '';

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
        tempo: additionalDetails.tempo,//additionalDetails.features?.tempo ? Math.round(additionalDetails.features.tempo) : '',
        key: additionalDetails.key || '',
        camelot: additionalDetails.camelot || '',
        danceability: additionalDetails.features?.danceability || '',
        energy: energyValue,
        energyLevel: additionalDetails.energyLevel || getEnergyLevel(energyValue),
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
        platforms: platforms,
      };
    });
  }, [filteredTracks, trackDetails, platformData]);

  // useEffect(() => {
  //   if (processedTracks[currentTrackIndex]) {
  //     setSelectedTrack(processedTracks[currentTrackIndex]);
  //   }
  // }, [currentTrackIndex, processedTracks]);

  return (
    <div className="flex-container">
      {/* <CriteriaFilterPanel criteria={criteria} setCriteria={setCriteria} onSearchSimilar={searchSimilar} initialTrackDetails={selectedTrack} /> */}

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
        {/* <div className="waveform-section">
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
        </div> */}
       
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