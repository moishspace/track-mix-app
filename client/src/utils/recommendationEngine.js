/**
 * Multi-Dimensional Recommendation Engine
 *
 * Combines multiple recommendation strategies:
 * 1. Co-occurrence (tracks that appear together in playlists)
 * 2. Artist similarity (same artist or related artists)
 * 3. Genre matching (shared genres)
 * 4. Popularity boosting
 *
 * Like Amazon's "People who bought this also bought" but for music!
 */

import {
  searchPlaylists,
  fetchPlaylistTracks,
  getRelatedArtists,
  getArtistByName,
  getArtistById,
} from "../services/api";

// ============== CO-OCCURRENCE RECOMMENDATIONS ==============

/**
 * Build a co-occurrence matrix from playlists
 * Tracks which songs appear together
 */
export const buildCoOccurrenceMatrix = (playlists) => {
  const matrix = {};

  playlists.forEach((playlist) => {
    const trackIds =
      playlist.tracks?.map((t) => t.id || t.track?.id).filter(Boolean) || [];

    // For each pair of tracks in this playlist
    for (let i = 0; i < trackIds.length; i++) {
      const trackA = trackIds[i];

      if (!matrix[trackA]) matrix[trackA] = {};

      for (let j = 0; j < trackIds.length; j++) {
        if (i !== j) {
          const trackB = trackIds[j];
          matrix[trackA][trackB] = (matrix[trackA][trackB] || 0) + 1;
        }
      }
    }
  });

  return matrix;
};

/**
 * Get recommendations based on co-occurrence
 */
export const getCoOccurrenceRecommendations = (seedTrackIds, matrix) => {
  const scores = {};

  seedTrackIds.forEach((seedId) => {
    if (matrix[seedId]) {
      Object.entries(matrix[seedId]).forEach(([trackId, count]) => {
        if (!seedTrackIds.includes(trackId)) {
          scores[trackId] = (scores[trackId] || 0) + count;
        }
      });
    }
  });

  return scores;
};

// ============== ARTIST SIMILARITY RECOMMENDATIONS ==============

/**
 * Get recommendations based on artist similarity
 * Finds tracks by the same artists or similar artists
 */
export const getArtistSimilarityRecommendations = (seedTracks, allTracks) => {
  const scores = {};

  // Get all artist IDs from seed tracks
  const seedArtistIds = new Set();
  const seedArtistNames = new Set();

  seedTracks.forEach((track) => {
    if (track.artists) {
      track.artists.forEach((artist) => {
        seedArtistIds.add(artist.id);
        seedArtistNames.add(artist.name.toLowerCase());
      });
    }
  });

  // console.log("🎯 Seed artists:", Array.from(seedArtistNames));
  // console.log("📊 Checking", allTracks.length, "tracks from playlists");

  // Sample first track for debugging
  if (allTracks.length > 0) {
    const sampleTrack = allTracks[0];
    // console.log("📝 Sample track structure:", {
    //   id: sampleTrack.id || sampleTrack.track?.id,
    //   hasArtists: !!sampleTrack.artists,
    //   hasTrack: !!sampleTrack.track,
    //   trackArtists: sampleTrack.track?.artists,
    //   directArtists: sampleTrack.artists,
    // });
  }

  // Score all tracks based on artist overlap
  let matchCount = 0;
  allTracks.forEach((track) => {
    const trackId = track.id || track.track?.id;
    if (!trackId) return;

    // Don't recommend seed tracks
    if (seedTracks.find((t) => (t.id || t.track?.id) === trackId)) return;

    const artists = track.artists || track.track?.artists || [];

    artists.forEach((artist) => {
      if (!artist || !artist.name) return;

      const artistNameLower = artist.name.toLowerCase();

      // Same artist = high score
      if (seedArtistIds.has(artist.id)) {
        scores[trackId] = (scores[trackId] || 0) + 10;
        matchCount++;
      }
      // Similar artist name = medium score
      else if (
        Array.from(seedArtistNames).some(
          (name) =>
            artistNameLower.includes(name) || name.includes(artistNameLower)
        )
      ) {
        scores[trackId] = (scores[trackId] || 0) + 5;
        matchCount++;
      }
      // Partial word match = lower score (e.g., "white" matches "whitesquare")
      else if (
        Array.from(seedArtistNames).some((name) => {
          const words = artistNameLower.split(/\s+/);
          const seedWords = name.split(/\s+/);
          return words.some((w) =>
            seedWords.some((sw) => w.includes(sw) || sw.includes(w))
          );
        })
      ) {
        scores[trackId] = (scores[trackId] || 0) + 2;
        matchCount++;
      }
    });
  });

  // console.log(`🎵 Found ${matchCount} artist matches`);

  return scores;
};

// ============== GENRE MATCHING RECOMMENDATIONS ==============

/**
 * Get recommendations based on genre overlap
 * Requires artist data with genres
 */
export const getGenreMatchingRecommendations = (
  seedTracks,
  allTracks,
  artistsData
) => {
  const scores = {};

  // Get all genres from seed tracks
  const seedGenres = new Set();

  seedTracks.forEach((track) => {
    const artists = track.artists || track.track?.artists || [];
    artists.forEach((artist) => {
      const artistData = artistsData[artist.id];
      if (artistData?.genres) {
        artistData.genres.forEach((genre) => {
          seedGenres.add(genre.toLowerCase());
        });
      }
    });
  });

  // Score all tracks based on genre overlap
  allTracks.forEach((track) => {
    const trackId = track.id || track.track?.id;
    if (!trackId) return;

    const artists = track.artists || track.track?.artists || [];
    let genreMatches = 0;

    artists.forEach((artist) => {
      const artistData = artistsData[artist.id];
      if (artistData?.genres) {
        artistData.genres.forEach((genre) => {
          if (seedGenres.has(genre.toLowerCase())) {
            genreMatches++;
          }
        });
      }
    });

    if (genreMatches > 0) {
      scores[trackId] = (scores[trackId] || 0) + genreMatches * 3;
    }
  });

  return scores;
};

// ============== POPULARITY BOOSTING ==============

/**
 * Add popularity boost to recommendations
 */
export const applyPopularityBoost = (scores, allTracks) => {
  const boosted = { ...scores };

  Object.keys(boosted).forEach((trackId) => {
    const track = allTracks.find((t) => (t.id || t.track?.id) === trackId);
    if (track) {
      const popularity = track.popularity || track.track?.popularity || 0;
      // Add 10% of popularity score (0-100) to the recommendation score
      boosted[trackId] += (popularity / 100) * 0.1 * boosted[trackId];
    }
  });

  return boosted;
};

// Playlist track fetch helper (already used)
export const fetchAllPlaylistTracks = async (playlistId, pageSize = 100, maxTotal = 1000) => {
  let offset = 0;
  const items = [];
  while (offset < maxTotal) {
    const res = await fetchPlaylistTracks(playlistId, offset, pageSize);
    const batch = res.items || [];
    items.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return items;
};

// ============== COMBINED HYBRID RECOMMENDATIONS ==============
const artistIdCache = new Map();

/**
 * STRATEGY 1: Search playlists by related artists, keep only playlists containing our seed track
 */
export const findCoOccurrenceRecommendations = async (
  seedTracks,
  options = {}
) => {
  const {
    limit = 50,
    coOccurrenceWeight = 1.0,
    artistSimilarityWeight = 1.5,
    usePopularityBoost = true,
  } = options;

  try {
    // console.log("🎵 Starting related artists + playlist co-occurrence...", {
    //   coOccurrenceWeight,
    //   artistSimilarityWeight,
    //   usePopularityBoost,
    // });

    // === Collect seed data ===
    const seedTrackIds = new Set(seedTracks.map((t) => t.id));
    const seedArtists = [];
    const seedArtistIds = new Set();

    seedTracks.forEach((track) => {
      if (track.artists) {
        track.artists.forEach((artist) => {
          if (!seedArtists.find((a) => a.id === artist.id)) {
            seedArtists.push(artist);
            seedArtistIds.add(artist.id);
          }
        });
      }
    });

    // console.log(`🎤 Found ${seedArtists.length} seed artists`);

    // === Helpers ===
    const getTrackName = (t) =>
      (t?.name || t?.track?.name || "").toLowerCase().trim();
    const normalizeName = (name) =>
      name
        .replace(/\(.*?\)|\[.*?\]/g, "")
        .replace(/\b(feat\.?|ft\.?)\b.*$/i, "")
        .replace(/\s+-\s+.*$/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const seedTrackMainNames = new Set(
      seedTracks.map((t) => normalizeName(getTrackName(t))).filter(Boolean)
    );

    // === Step 1: Build artist cluster (seed + related artists) ===
    const artistCluster = [...seedArtists];
    // console.log("🎯 Building artist cluster (seed + related)...");

    for (const seedArtist of seedArtists) {
      try {
        let artistId = seedArtist.id;
        const artistName = seedArtist.name;

        // 🧩 If missing or fake, or if ID doesn't look valid
        if (!artistId || artistId.startsWith("fake-")) {
          // console.log(`🔍 Invalid artist ID for "${artistName}", searching by name...`);
          const found = await getArtistByName(artistName).catch(() => null);
          if (!found?.id) {
            console.warn(`⚠️ Skipping "${artistName}" — no Spotify match`);
            continue;
          }
          artistId = found.id;
          // console.log(`✅ Found valid ID for "${artistName}": ${artistId}`);
        }

        // 🧠 Verify this really is an artist
        const artistInfo = await getArtistById(artistId).catch(() => null);
        if (!artistInfo?.id) {
          console.warn(
            `⚠️ "${artistName}" ID (${artistId}) invalid, re-searching by name...`
          );
          const foundAgain = await getArtistByName(artistName).catch(
            () => null
          );
          if (!foundAgain?.id) {
            // console.warn(`❌ Skipping "${artistName}" — could not find valid artist`);
            continue; // give up
          }
          artistId = foundAgain.id;
          // console.log(`✅ Found valid ID for "${artistName}": ${artistId}`);
        }

        // ✅ Now safe to call related artists
        const relatedResponse = await getRelatedArtists(artistId).catch((err) => {
          console.warn(`⚠️ Could not get related artists for "${artistName}": ${err.message}`);
          return { artists: [] };
        });
        const related = relatedResponse.artists || [];
        // console.log(`🎵 Found ${related.length} related artists for "${artistName}"`);
        related.slice(0, 5).forEach((ra) => {
          if (!artistCluster.find((a) => a.id === ra.id))
            artistCluster.push(ra);
        });
      } catch (err) {
        console.warn(
          `⚠️ Error processing artist ${seedArtist.name}:`,
          err.message || err
        );
      }
    }

    // console.log(`🎤 Total artist cluster size: ${artistCluster.length}`);
    // console.log(
    //   "🎶 Cluster artists:",
    //   artistCluster.map((a) => a.name).join(", ")
    // );

    // === Step 2: Search playlists for each artist ===
    const candidatePlaylists = [];

    for (const artist of artistCluster.slice(0, 10)) {
      // console.log(`🔍 Searching playlists for artist: ${artist.name}`);
      try {
        const playlists = await searchPlaylists(artist.name, 100);
        playlists.forEach((p) => {
          if (p?.id && !candidatePlaylists.find((x) => x.id === p.id)) {
            candidatePlaylists.push(p);
          }
        });
      } catch (err) {
        console.warn(`Failed playlist search for ${artist.name}:`, err.message);
      }
    }

    console.log(
      // `📋 Found ${candidatePlaylists.length} candidate playlists from cluster`
    );

    // === Step 3: Fetch playlists & keep only relevant ones ===
    const validPlaylists = [];

    for (const playlist of candidatePlaylists) {
      try {
        const items = await fetchAllPlaylistTracks(playlist.id);
        if (items.length === 0) continue;

        // Build artist name lookup for fuzzy matching
        const clusterArtistNames = new Set(
          artistCluster.map((ac) => ac.name.toLowerCase().trim())
        );

        // Build seed artist name lookup (only the original seed artists, not the full cluster)
        const seedArtistNames = new Set(
          seedArtists.map((sa) => sa.name.toLowerCase().trim())
        );

        // Check if playlist contains cluster artists
        const containsClusterArtist = items.some((item) => {
          const track = item.track || item;
          const trackArtists = track?.artists || [];
          return trackArtists.some((a) => {
            // Match by ID (preferred)
            if (artistCluster.some((ac) => ac.id === a.id)) {
              return true;
            }
            // Fallback: Match by artist name (case-insensitive)
            if (a?.name && clusterArtistNames.has(a.name.toLowerCase().trim())) {
              return true;
            }
            return false;
          });
        });

        if (!containsClusterArtist) continue;

        // If "mixed playlists only" is enabled, check seed artist percentage
        if (options.mixedPlaylistsOnly) {
          // Count tracks by seed artists (not the full cluster, just the original seeds)
          let seedArtistTrackCount = 0;

          items.forEach((item) => {
            const track = item.track || item;
            const trackArtists = track?.artists || [];
            const hasSeedArtist = trackArtists.some((a) => {
              // Match by ID
              if (seedArtistIds.has(a.id)) return true;
              // Fallback: Match by name
              if (a?.name && seedArtistNames.has(a.name.toLowerCase().trim())) return true;
              return false;
            });

            if (hasSeedArtist) {
              seedArtistTrackCount++;
            }
          });

          const seedArtistPercentage = (seedArtistTrackCount / items.length) * 100;

          // Only accept playlists with 10-70% seed artist content
          // This filters out dedicated playlists (>70%) and irrelevant playlists (<10%)
          if (seedArtistPercentage < 10 || seedArtistPercentage > 70) {
            // console.log(
            //   `⏭️ Skipping playlist "${playlist.name}" - ${seedArtistPercentage.toFixed(1)}% seed artist (need 10-70%)`
            // );
            continue;
          }

          // console.log(
          //   `✅ Playlist "${playlist.name}" - ${seedArtistPercentage.toFixed(1)}% seed artist (mixed ✓)`
          // );
        } else {
          // console.log(`✅ Playlist "${playlist.name}" matched cluster artist`);
        }

        validPlaylists.push({ ...playlist, tracks: items });
        if (validPlaylists.length >= 50) break;
      } catch (err) {
        console.warn(
          `⚠️ Could not fetch playlist ${playlist.id}:`,
          err.message
        );
      }
    }

    // console.log(
    //   `🎧 Using ${validPlaylists.length} relevant playlists for co-occurrence`
    // );

    if (validPlaylists.length === 0) {
      // console.warn("❌ No relevant playlists found");
      return [];
    }

    // === Step 4: Count track frequency across playlists ===
    const trackFrequency = {};
    const flatTracks = validPlaylists.flatMap((p) => p.tracks || []);

    validPlaylists.forEach((playlistData) => {
      const tracksInPlaylist = new Set();

      (playlistData.tracks || []).forEach((item) => {
        const track = item.track || item;
        if (!track || !track.id || !track.name) return;
        const trackId = track.id;
        const trackMainName = normalizeName(getTrackName(track));

        if (
          trackId &&
          !seedTrackIds.has(trackId) &&
          !seedTrackMainNames.has(trackMainName)
        ) {
          tracksInPlaylist.add(trackId);
        }
      });

      tracksInPlaylist.forEach((trackId) => {
        trackFrequency[trackId] = (trackFrequency[trackId] || 0) + 1;
      });
    });

    // console.log(
    //   `🔗 Found ${
    //     Object.keys(trackFrequency).length
    //   } unique tracks across playlists`
    // );

    // === Step 5: Compute scores & return recommendations ===
    const trackMap = new Map();
    flatTracks.forEach((t) => trackMap.set(t.id || t.track?.id, t.track || t));

    const recommendations = Object.entries(trackFrequency)
      .map(([trackId, frequency]) => {
        const track = trackMap.get(trackId);
        if (!track) return null;

        let score = frequency * coOccurrenceWeight * 10;

        if (
          track.artists &&
          track.artists.some((artist) => seedArtistIds.has(artist.id))
        ) {
          score += artistSimilarityWeight * 15;
        }

        if (track.popularity !== undefined) {
          if (usePopularityBoost) score += (track.popularity / 100) * 10;
          else score -= (track.popularity / 100) * 5;
        }

        return { trackId, score, track };
      })
      .filter((rec) => rec && rec.track)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // console.log(
    //   `✅ Returning ${recommendations.length} co-occurrence recommendations`
    // );
    return recommendations;
  } catch (error) {
    console.error("❌ Related artists playlist search failed:", error);
    return [];
  }
};
/**
 * Get hybrid recommendations combining all strategies
 *
 * @param {Array} seedTracks - Tracks to base recommendations on
 * @param {Object} options - Configuration options
 * @returns {Array} Recommended tracks with scores
 */
export const getHybridRecommendations = async (seedTracks, options = {}) => {
  const {
    usePopularityBoost = true,
    limit = 20,
    coOccurrenceWeight = 1.0,
    artistSimilarityWeight = 1.5,
    genreMatchingWeight = 1.2,
  } = options;

  // console.log("🎵 Getting hybrid recommendations...", {
  //   seedTracks: seedTracks.length,
  //   limit,
  //   weights: {
  //     coOccurrence: coOccurrenceWeight,
  //     artistSimilarity: artistSimilarityWeight,
  //     genreMatching: genreMatchingWeight,
  //   },
  //   usePopularityBoost,
  //   requireArtistInPlaylistName: options.requireArtistInPlaylistName,
  // });

  let recommendations = await findCoOccurrenceRecommendations(seedTracks, {
    limit,
    coOccurrenceWeight,
    artistSimilarityWeight,
    genreMatchingWeight,
    usePopularityBoost,
    requireArtistInPlaylistName: options.requireArtistInPlaylistName,
  });

  // If still no recommendations, return empty
  if (!recommendations || recommendations.length === 0) {
    console.warn("❌ No recommendations found with any strategy");
    return [];
  }

  // Exclude seed artists if requested
  if (options.excludeSeedArtists) {
    const seedArtistIds = new Set();
    const seedArtistNames = new Set();

    seedTracks.forEach(track => {
      if (track.artists) {
        track.artists.forEach(artist => {
          if (artist.id) seedArtistIds.add(artist.id);
          if (artist.name) seedArtistNames.add(artist.name.toLowerCase().trim());
        });
      }
    });

    // console.log(`🚫 Excluding seed artists:`, Array.from(seedArtistNames));

    const beforeCount = recommendations.length;
    recommendations = recommendations.filter((rec) => {
      const track = rec.track;
      if (!track?.artists) return true;

      // Exclude if ANY artist matches seed artists (by ID or name)
      const hasSeedArtist = track.artists.some(artist => {
        // Match by ID (preferred)
        if (artist.id && seedArtistIds.has(artist.id)) {
          return true;
        }
        // Fallback: Match by name (case-insensitive)
        if (artist.name && seedArtistNames.has(artist.name.toLowerCase().trim())) {
          return true;
        }
        return false;
      });

      return !hasSeedArtist;
    });

    // console.log(
    //   `🚫 Excluded ${beforeCount - recommendations.length} tracks by seed artists (${recommendations.length} remaining)`
    // );
  }

  // Apply filters if needed
  if (options.includeLatestReleases) {
    // Sort by release date (newest first) and take top 50
    recommendations = recommendations
      .filter((rec) => rec.track?.album?.release_date) // Remove tracks without release dates
      .sort((a, b) => {
        const dateA = new Date(a.track.album.release_date);
        const dateB = new Date(b.track.album.release_date);
        return dateB - dateA; // Newest first
      })
      .slice(0, 50); // Take top 50 most recent

    // console.log(
    //   `🗓️ Returning ${recommendations.length} most recent tracks`
    // );
  }

  console.log(`✅ Returning ${recommendations.length} total recommendations`);
  return recommendations;
};

// ============== AUTO SEARCH QUERY GENERATION ==============

/**
 * Generate smart search queries based on seed tracks
 */
export const generateSearchQueries = (seedTracks, artistsData = {}) => {
  const queries = new Set();

  // Add genres from seed tracks
  seedTracks.forEach((track) => {
    const artists = track.artists || [];
    artists.forEach((artist) => {
      const artistData = artistsData[artist.id];
      if (artistData?.genres) {
        artistData.genres.slice(0, 2).forEach((genre) => {
          queries.add(genre);
        });
      }
    });
  });

  // Add artist names
  seedTracks.forEach((track) => {
    const artists = track.artists || [];
    if (artists.length > 0) {
      queries.add(artists[0].name);
    }
  });

  // Fallback generic queries
  if (queries.size === 0) {
    queries.add("top hits");
    queries.add("popular music");
  }

  return Array.from(queries).slice(0, 5); // Max 5 queries
};

// ============== PRESET RECOMMENDATION MODES ==============

export const RECOMMENDATION_MODES = {
  SIMILAR: {
    name: "Similar Tracks",
    description: "Find tracks similar to your selection",
    config: {
      artistSimilarityWeight: 2.0,
      genreMatchingWeight: 1.5,
      coOccurrenceWeight: 1.0,
      requireArtistInPlaylistName: true, // Narrow: only playlists with artist name
    },
  },

  POPULAR: {
    name: "Popular & Similar",
    description: "Similar tracks that are popular",
    config: {
      usePopularityBoost: true,
      artistSimilarityWeight: 1.5,
      coOccurrenceWeight: 1.0,
      requireArtistInPlaylistName: false, // Wider: all playlists
    },
  },

  DISCOVERY: {
    name: "Discovery",
    description: "Discover new music based on patterns",
    config: {
      coOccurrenceWeight: 2.0,
      artistSimilarityWeight: 0.5,
      genreMatchingWeight: 1.0,
      requireArtistInPlaylistName: false, // Wider: all playlists for discovery
    },
  },

  DEEP_CUTS: {
    name: "Deep Cuts",
    description: "Less popular but similar tracks",
    config: {
      usePopularityBoost: false,
      artistSimilarityWeight: 2.0,
      genreMatchingWeight: 1.5,
      requireArtistInPlaylistName: true, // Narrow: focus on artist-specific playlists
    },
  },
};
