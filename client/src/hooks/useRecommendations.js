/**
 * React Hook for Music Recommendations
 *
 * Provides easy-to-use recommendation functionality combining:
 * - Co-occurrence (tracks that appear together)
 * - Artist similarity
 * - Genre matching
 * - Popularity boosting
 */

import { useState, useCallback } from 'react';
import {
  getHybridRecommendations,
  generateSearchQueries,
  RECOMMENDATION_MODES
} from '../utils/recommendationEngine';
import { getCachedMatrix, setCachedMatrix } from '../utils/recommendationCache';

const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Get recommendations for selected tracks
   *
   * @param {Array} seedTracks - Tracks to base recommendations on
   * @param {Object} options - Configuration options
   * @returns {Array} Recommended tracks
   */
  const getRecommendations = useCallback(async (seedTracks, options = {}) => {
    if (!seedTracks || seedTracks.length === 0) {
      setError('Please select at least one track');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🎵 Getting recommendations for ${seedTracks.length} seed tracks`);

      // Generate search queries from seed tracks if not provided
      let searchQueries = options.searchQueries;
      if (!searchQueries || searchQueries.length === 0) {
        searchQueries = generateSearchQueries(seedTracks, options.artistsData);
        console.log('Generated search queries:', searchQueries);
      }

      // Use cached matrices if available
      const cachedMatrices = searchQueries
        .map(query => ({ query, matrix: getCachedMatrix(query) }))
        .filter(item => item.matrix !== null);

      if (cachedMatrices.length > 0) {
        console.log(`Using ${cachedMatrices.length} cached matrices`);
      }

      // Get hybrid recommendations
      const recs = await getHybridRecommendations(seedTracks, {
        limit: 30,
        ...options,
        searchQueries
      });

      // Cache the results
      searchQueries.forEach(query => {
        // We don't have direct access to the matrix here,
        // but the engine should handle caching internally
      });

      setRecommendations(recs);
      setLoading(false);

      console.log(`✅ Found ${recs.length} recommendations`);
      return recs;

    } catch (err) {
      console.error('Error getting recommendations:', err);
      setError(err.message || 'Failed to get recommendations');
      setLoading(false);
      return [];
    }
  }, []);

  /**
   * Get recommendations using a preset mode
   */
  const getRecommendationsByMode = useCallback(async (seedTracks, modeName, extraOptions = {}) => {
    const mode = RECOMMENDATION_MODES[modeName];

    if (!mode) {
      setError(`Unknown mode: ${modeName}`);
      return [];
    }

    console.log(`Using preset mode: ${mode.name}`);

    return getRecommendations(seedTracks, {
      ...mode.config,
      ...extraOptions
    });
  }, [getRecommendations]);

  /**
   * Get recommendations using multiple modes combined
   * Merges configs from multiple modes and averages their weights
   */
  const getRecommendationsByModes = useCallback(async (seedTracks, modeNames = [], extraOptions = {}) => {
    if (!modeNames || modeNames.length === 0) {
      setError('Please select at least one recommendation mode');
      return [];
    }

    console.log(`Using ${modeNames.length} modes:`, modeNames);

    // Merge configs from multiple modes
    const mergedConfig = {
      useCoOccurrence: true,
      useArtistSimilarity: true,
      useGenreMatching: true,
      usePopularityBoost: true,
      coOccurrenceWeight: 0,
      artistSimilarityWeight: 0,
      genreMatchingWeight: 0,
    };

    // Average the weights from all selected modes
    modeNames.forEach(modeName => {
      const mode = RECOMMENDATION_MODES[modeName];
      if (mode && mode.config) {
        const config = mode.config;
        mergedConfig.coOccurrenceWeight += (config.coOccurrenceWeight || 1.0);
        mergedConfig.artistSimilarityWeight += (config.artistSimilarityWeight || 1.5);
        mergedConfig.genreMatchingWeight += (config.genreMatchingWeight || 1.2);

        // If any mode disables popularity boost, disable it
        if (config.usePopularityBoost === false) {
          mergedConfig.usePopularityBoost = false;
        }
      }
    });

    // Average the weights
    const count = modeNames.length;
    mergedConfig.coOccurrenceWeight /= count;
    mergedConfig.artistSimilarityWeight /= count;
    mergedConfig.genreMatchingWeight /= count;

    console.log('Merged config:', mergedConfig);

    return getRecommendations(seedTracks, {
      ...mergedConfig,
      ...extraOptions
    });
  }, [getRecommendations]);

  /**
   * Clear current recommendations
   */
  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
    getRecommendationsByMode,
    getRecommendationsByModes,
    clearRecommendations,
    modes: RECOMMENDATION_MODES
  };
};

export default useRecommendations;
