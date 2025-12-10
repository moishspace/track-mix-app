// MainDashboard.js
import React, { useState, useEffect, useMemo } from "react";
import TrackTable from "./TrackTable";
import PlaylistControls from "./PlaylistControls";
import PlaylistSidebar from "./PlaylistSidebar";
import RecommendationSidebar from "./RecommendationSidebar";
import TrackPlayer from "./TrackPlayer";
import CriteriaFilterPanel from "./CriteriaFilterPanel";
import AudioWaveform from "./AudioWaveform";
import CreatePlaylistModal from "./CreatePlaylistModal";
import FilterPanel from "./FilterPanel";
import useTrackSearch from "../hooks/useTrackSearch";
import useSimilarTracks from "../hooks/useSimilarTracks";
import useTrackTable from "../hooks/useTrackTable";
import useTrackPlayer from "../hooks/useTrackPlayer";
import usePlaylist from "../hooks/usePlaylist";
import useRecommendations from "../hooks/useRecommendations";
import { searchPlatforms, fetchAndUpdateTrackDetails } from "../services/api";
import "../styles/DashboardLayout.css";

const MainDashboard = ({ searchTerm }) => {
  const [criteria, setCriteria] = useState({});
  const [currentTrackIndex, setSelectedTrackIndex] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [platformData, setPlatformData] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [filters, setFilters] = useState({
    title: "",
    genre: "",
    key: "",
    bpmMin: 0,
    bpmMax: 200,
  });
  const { filteredTracks, trackDetails, setFilteredTracks, setTrackDetails } =
    useTrackSearch(searchTerm);

  useEffect(() => {
    if (!filteredTracks?.length) return;

    // find tracks missing details
    const missingTracks = filteredTracks.filter((t) => !trackDetails[t.id]);
    if (missingTracks.length === 0) return;

    const abort = new AbortController();
    const delay = 150; // ms between requests to avoid overload

    const fetchMissingDetails = async () => {

      for (const track of missingTracks) {
        if (abort.signal.aborted) break;

        try {
          await fetchAndUpdateTrackDetails(track.id, setTrackDetails, track);
        } catch (err) {
          if (abort.signal.aborted) return;
          console.error(`❌ Error fetching details for ${track.name}`, err);
        }

        // Small delay to avoid hammering the API
        await new Promise((res) => setTimeout(res, delay));
      }
    };

    fetchMissingDetails();

    return () => abort.abort();
  }, [filteredTracks, trackDetails, setTrackDetails]);

  // Search platforms for all visible tracks (called when tracks load)
  useEffect(() => {
    const abortController = new AbortController();

    // Process tracks in small batches to avoid overwhelming the UI
    const batchSize = 5; // Process 5 tracks at a time
    const delay = 100; // Small delay between batches

    const searchInBatches = async () => {
      // Only search for tracks that we haven't searched yet
      const tracksToSearch = filteredTracks.filter(
        (track) => !platformData[track.id]
      );

      if (tracksToSearch.length === 0) {
        return; // All tracks already have platform data
      }

      for (let i = 0; i < tracksToSearch.length; i += batchSize) {
        // Check if aborted before starting each batch
        if (abortController.signal.aborted) {
          return;
        }

        // Get the current batch
        const batch = tracksToSearch.slice(i, i + batchSize);

        // Start all searches in this batch in parallel
        const batchPromises = batch.map(async (track) => {
          if (abortController.signal.aborted) {
            return;
          }

          try {
            const artistName =
              track.artistsName ||
              (Array.isArray(track.artists)
                ? track.artists.map((a) => a.name).join(", ")
                : "");
            const results = await searchPlatforms(
              artistName,
              track.name,
              abortController.signal
            );

            // Only update if not cancelled
            if (!abortController.signal.aborted) {
              setPlatformData((prev) => ({
                ...prev,
                [track.id]: results,
              }));
            }
          } catch (error) {
            if (error.name === "CanceledError" || error.name === "AbortError") {
              return;
            }
            console.error("Error searching platforms:", error);
          }
        });

        // Wait for this batch to complete (but don't block UI)
        await Promise.all(batchPromises);

        // Small delay before next batch (but don't block if cancelled)
        if (
          !abortController.signal.aborted &&
          i + batchSize < tracksToSearch.length
        ) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    };

    searchInBatches();

    // Cleanup function to abort ongoing searches immediately
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTracks]);

  // Process tracks first - this must come before hooks that use processedTracks
  const processedTracks = useMemo(() => {
    return filteredTracks.map((track) => {
      const additionalDetails = trackDetails[track.id] || {};
      const platforms = platformData[track.id] || {};

      // Compute energyLevel from energy value (matching Python energy_to_level)
      const getEnergyLevel = (energy) => {
        if (energy === null || energy === undefined || energy === "") return "";
        const e = parseFloat(energy);
        if (isNaN(e)) return "";
        if (e < 0.25) return "Chill / Ambient";
        if (e < 0.45) return "Warm-up Flow";
        if (e < 0.6) return "Groove";
        if (e < 0.75) return "Uplift";
        if (e < 0.9) return "Drive / Peak";
        return "Emotional High";
      };
      const energyValue =
        additionalDetails.energy ?? additionalDetails.features?.energy ?? "";

      return {
        id: track.id,
        name: track.name || "",
        artistsName:
          track.artistsName ||
          (Array.isArray(track.artists)
            ? track.artists.map((artist) => artist.name).join(", ")
            : ""),
        album: track?.album,
        albumName: track.album?.name || "",
        releaseDate: track.album?.release_date || "",
        albumImageUrl: track.album?.images[0]?.url || "",
        duration_ms: track.duration_ms,
        duration: track.duration_ms
          ? `${Math.floor(track.duration_ms / 60000)}:${String(
              Math.floor((track.duration_ms % 60000) / 1000)
            ).padStart(2, "0")}`
          : "",
        preview_url: track.preview_url || null,
        genre: additionalDetails.genres?.join(", ") || "",
        tempo: additionalDetails.tempo, //additionalDetails.features?.tempo ? Math.round(additionalDetails.features.tempo) : '',
        key: additionalDetails.key || "",
        camelot: additionalDetails.camelot || "",
        danceability: additionalDetails.features?.danceability || "",
        energy: energyValue,
        energyLevel:
          additionalDetails.energyLevel || getEnergyLevel(energyValue),
        valence: additionalDetails.features?.valence || "",
        acousticness: additionalDetails.features?.acousticness || "",
        instrumentalness: additionalDetails.features?.instrumentalness || "",
        liveness: additionalDetails.features?.liveness || "",
        timeSignature: additionalDetails.features?.timeSignature || "",
        beats: additionalDetails.analysis?.beats || [],
        sections: additionalDetails.analysis?.sections || [],
        segments: additionalDetails.analysis?.segments || [],
        tatums: additionalDetails.analysis?.tatums || [],
        uri: track.uri,
        platforms: platforms,
      };
    });
  }, [filteredTracks, trackDetails, platformData]);

  // Extract unique genres and keys for filter dropdowns
  const { uniqueGenres, uniqueKeys } = useMemo(() => {
    const genresSet = new Set();
    const keysSet = new Set();

    processedTracks.forEach((track) => {
      if (track.genre) {
        // Split comma-separated genres and add each one
        track.genre.split(",").forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) genresSet.add(trimmed);
        });
      }
      if (track.camelot) {
        keysSet.add(track.camelot);
      }
    });

    return {
      uniqueGenres: Array.from(genresSet).sort(),
      uniqueKeys: Array.from(keysSet).sort(),
    };
  }, [processedTracks]);

  // Apply filters to processedTracks
  const filteredProcessedTracks = useMemo(() => {
    return processedTracks.filter((track) => {
      // Title filter (search in name and artist)
      if (filters.title) {
        const searchTerm = filters.title.toLowerCase();
        const matchesTitle = track.name.toLowerCase().includes(searchTerm);
        const matchesArtist = track.artistsName
          .toLowerCase()
          .includes(searchTerm);
        if (!matchesTitle && !matchesArtist) return false;
      }

      // Genre filter
      if (filters.genre) {
        if (!track.genre.includes(filters.genre)) return false;
      }

      // Key filter
      if (filters.key) {
        if (track.camelot !== filters.key) return false;
      }

      // BPM filter
      if (track.tempo) {
        const bpm =
          typeof track.tempo === "number"
            ? track.tempo
            : parseFloat(track.tempo);
        if (!isNaN(bpm)) {
          const minBpm = parseFloat(filters.bpmMin) || 0;
          const maxBpm = parseFloat(filters.bpmMax) || 200;
          if (bpm < minBpm || bpm > maxBpm) return false;
        }
      }

      return true;
    });
  }, [processedTracks, filters]);

  // Now initialize hooks that depend on the processed data
  const {
    playlists,
    selectedPlaylist,
    handlePlaylistChange,
    handleShowPlaylist,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleDeletePlaylist,
    handleExportPlaylist,
    refreshPlaylists,
    isRefreshing,
  } = usePlaylist(
    filteredTracks,
    trackDetails,
    setFilteredTracks,
    setTrackDetails,
    selectedTrackIds,
    setSelectedTrackIds,
    setSelectAllChecked,
    setPlaylistTotal
  );

  const { handleSelectAllClick, handleRowClick, handleCheckboxClick } =
    useTrackTable(
      filteredProcessedTracks,
      setSelectedTrack,
      setSelectedTrackIndex,
      selectedTrackIds,
      setSelectedTrackIds,
      selectAllChecked,
      setSelectAllChecked
    );

  // Recommendations hook
  const { getRecommendationsByModes, loading: recommendationsLoading } =
    useRecommendations();

  const { searchSimilar } = useSimilarTracks(
    selectedTrack,
    criteria,
    setFilteredTracks,
    setTrackDetails
  );

  // Handle "Get Recommendations" from sidebar
  const handleGetRecommendationsFromSidebar = async ({
    modes,
    includeLatestReleases,
    excludeSeedArtists,
    mixedPlaylistsOnly,
  }) => {
    if (!selectedTrackIds || selectedTrackIds.length === 0) {
      alert("Please select at least one track");
      return;
    }

    // Get the selected tracks from filteredTracks
    const selectedTracks = filteredTracks.filter((t) =>
      selectedTrackIds.includes(t.id)
    );

    if (selectedTracks.length === 0) {
      alert("Could not find selected tracks");
      return;
    }

    console.log(
      `🎵 Getting recommendations for ${selectedTracks.length} selected tracks`
    );
    console.log("Modes:", modes);
    console.log("Latest releases only:", includeLatestReleases);
    console.log("Exclude seed artists:", excludeSeedArtists);
    console.log("Mixed playlists only:", mixedPlaylistsOnly);

    // Ensure all tracks have artists array
    selectedTracks.forEach((track) => {
      if (!track.artists || track.artists.length === 0) {
        const artistName = track.artistsName || "";
        if (artistName) {
          console.warn(
            `⚠️ Track "${track.name}" missing artists array, constructing from artistsName`
          );
          track.artists = artistName.split(",").map((name, index) => ({
            id: `fake-${track.id}-${index}`,
            name: name.trim(),
          }));
        }
      }
    });

    try {
      // Get recommendations using multiple modes
      // The recommendation engine will search for playlists containing the seed tracks
      console.log("🔍 Searching for playlists containing selected tracks...");

      const recommendations = await getRecommendationsByModes(
        selectedTracks,
        modes,
        {
          limit: 50,
          includeLatestReleases,
          excludeSeedArtists,
          mixedPlaylistsOnly,
        }
      );

      console.log("📊 Recommendations received:", recommendations.length);

      if (recommendations && recommendations.length > 0) {
        // Convert recommendations to track format
        const recommendedTracks = recommendations
          .map((rec) => {
            const track = rec.track;
            return {
              id: track.id,
              name: track.name,
              artists: track.artists,
              artistsName: track.artists?.map((a) => a.name).join(", ") || "",
              album: track.album,
              duration_ms: track.duration_ms,
              preview_url: track.preview_url,
              uri: track.uri,
            };
          })
          .filter(Boolean);

        console.log("✅ Processed tracks:", recommendedTracks.length);

        // Clear playlist selection to prevent caching
        handlePlaylistChange({ target: { value: null } });

        // Clear selections
        setSelectedTrackIds([]);
        setSelectAllChecked(false);

        // Replace current track list with recommendations
        setFilteredTracks(recommendedTracks);

        console.log(`✅ Loaded ${recommendedTracks.length} recommended tracks`);
      } else {
        alert("No recommendations found. Try different tracks or modes.");
      }
    } catch (error) {
      console.error("❌ Error getting recommendations:", error);
      alert("Failed to get recommendations. Check console for details.");
    }
  };

  const {
    playerRef,
    trackProgress,
    handleProgressUpdate,
    handleSeek,
    handleTrackChange,
  } = useTrackPlayer(
    filteredTracks,
    setSelectedTrack,
    currentTrackIndex,
    setSelectedTrackIndex
  );

  // Update select all checkbox based on selection
  useEffect(() => {
    const allSelected =
      selectedTrackIds.length === filteredProcessedTracks.length &&
      filteredProcessedTracks.length > 0;
    const noneSelected = selectedTrackIds.length === 0;

    if (allSelected) {
      setSelectAllChecked(true);
    } else if (noneSelected) {
      setSelectAllChecked(false);
    } else {
      setSelectAllChecked(false);
    }
  }, [filteredProcessedTracks, selectedTrackIds]);

  // Modal handlers
  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);

  const handleCreatePlaylistWithModal = (playlistData) => {
    handleCreatePlaylist(playlistData);
    closeCreateModal();
  };

  return (
    <div className="dashboard-layout">
      {/* Left Sidebar - Playlists */}
      <PlaylistSidebar
        playlists={playlists}
        selectedPlaylist={selectedPlaylist}
        onPlaylistChange={handlePlaylistChange}
        onCreatePlaylist={openCreateModal}
        onDeletePlaylist={handleDeletePlaylist}
        onShowPlaylist={handleShowPlaylist}
        onRefreshPlaylists={refreshPlaylists}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Filter Panel */}
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          genres={uniqueGenres}
          keys={uniqueKeys}
        />

        {/* Track Table */}
        <div className="table-wrapper">
          <TrackTable
            processedTracks={filteredProcessedTracks}
            selectedTrack={selectedTrack}
            selectAllChecked={selectAllChecked}
            selectedTrackIds={selectedTrackIds}
            handleSelectAllClick={handleSelectAllClick}
            handleCheckboxClick={handleCheckboxClick}
            handleRowClick={handleRowClick}
            playlistTotal={playlistTotal}
          />
        </div>

        {/* Controls Section - Centered under table */}
        <div className="controls-section">
          {/* Track Player */}
          <div className="player-wrapper">
            <TrackPlayer
              ref={playerRef}
              processedTracks={filteredProcessedTracks}
              selectedTrack={selectedTrack}
              currentTrackIndex={currentTrackIndex}
              setCurrentTrackIndex={setSelectedTrackIndex}
              onProgress={handleProgressUpdate}
              onTrackChange={handleTrackChange}
            />
          </div>

          {/* Playlist Controls */}
          <div className="controls-wrapper">
            <PlaylistControls
              playlists={playlists}
              selectedPlaylist={selectedPlaylist}
              handlePlaylistChange={handlePlaylistChange}
              handleAddToPlaylist={handleAddToPlaylist}
              handleShowPlaylist={handleShowPlaylist}
              handleCreatePlaylist={openCreateModal}
              handleDeletePlaylist={handleDeletePlaylist}
              handleExportPlaylist={handleExportPlaylist}
            />
          </div>
        </div>
      </div>

      {/* Right Sidebar - Recommendations */}
      <RecommendationSidebar
        selectedTracks={filteredTracks.filter((t) =>
          selectedTrackIds.includes(t.id)
        )}
        onGetRecommendations={handleGetRecommendationsFromSidebar}
        loading={recommendationsLoading}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onCreate={handleCreatePlaylistWithModal}
      />
    </div>
  );
};

export default MainDashboard;
