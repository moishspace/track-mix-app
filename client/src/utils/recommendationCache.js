/**
 * Caching layer for recommendation data
 * Stores playlist matrices in localStorage to avoid re-fetching
 */

const CACHE_KEY = 'recommendation_matrices';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached recommendation matrix for a query
 */
export const getCachedMatrix = (query) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entry = cache[query];

    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      console.log(`✓ Using cached matrix for "${query}"`);
      return entry.matrix;
    }

    console.log(`⚠ Cache miss for "${query}"`);
    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Store recommendation matrix in cache
 */
export const setCachedMatrix = (query, matrix) => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    cache[query] = {
      matrix,
      timestamp: Date.now()
    };

    // Limit cache size (keep only last 20 queries)
    const entries = Object.entries(cache);
    if (entries.length > 20) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const reduced = Object.fromEntries(sorted.slice(0, 20));
      localStorage.setItem(CACHE_KEY, JSON.stringify(reduced));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }

    console.log(`✓ Cached matrix for "${query}"`);
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

/**
 * Clear all cached matrices
 */
export const clearCache = () => {
  localStorage.removeItem(CACHE_KEY);
  console.log('✓ Cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    const entries = Object.entries(cache);

    return {
      totalQueries: entries.length,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(([_, v]) => v.timestamp))
        : null,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(([_, v]) => v.timestamp))
        : null,
      queries: entries.map(([query]) => query)
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { totalQueries: 0, oldestEntry: null, newestEntry: null, queries: [] };
  }
};
