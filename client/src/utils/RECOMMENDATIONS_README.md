# Music Recommendation System

A multi-dimensional music recommendation engine that works **without** Spotify's restricted Audio Features API!

## How It Works

This system builds recommendations using:

1. **Co-occurrence Analysis** - Tracks that appear together in playlists (like Amazon's "People who bought this also bought")
2. **Artist Similarity** - Tracks by the same or similar artists
3. **Genre Matching** - Tracks with overlapping genres
4. **Popularity Boosting** - Slight boost for popular tracks

## Quick Start

### 1. Basic Usage

```javascript
import useRecommendations from '../hooks/useRecommendations';

function MyComponent() {
  const { recommendations, loading, getRecommendations } = useRecommendations();

  const selectedTracks = [/* array of track objects */];

  const handleGetRecs = async () => {
    const recs = await getRecommendations(selectedTracks, {
      searchQueries: ['workout', 'gym'],
      limit: 20
    });

    console.log('Recommendations:', recs);
  };

  return (
    <button onClick={handleGetRecs} disabled={loading}>
      Get Recommendations
    </button>
  );
}
```

### 2. Using Preset Modes

```javascript
const { getRecommendationsByMode, modes } = useRecommendations();

// Get similar tracks (emphasizes artist similarity)
await getRecommendationsByMode(selectedTracks, 'SIMILAR');

// Get popular similar tracks
await getRecommendationsByMode(selectedTracks, 'POPULAR');

// Discovery mode (emphasizes co-occurrence)
await getRecommendationsByMode(selectedTracks, 'DISCOVERY');

// Deep cuts (less popular but similar)
await getRecommendationsByMode(selectedTracks, 'DEEP_CUTS');
```

### 3. Using the Component

```javascript
import RecommendationPanel from '../components/RecommendationPanel';

function MyDashboard() {
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [artistsData, setArtistsData] = useState({});

  const handleAddTrack = (track) => {
    // Add recommended track to your playlist
    console.log('Adding track:', track);
  };

  return (
    <RecommendationPanel
      selectedTracks={selectedTracks}
      onAddTrack={handleAddTrack}
      artistsData={artistsData}
    />
  );
}
```

## Integration Example

### In your MainDashboard component:

```javascript
import React, { useState, useEffect } from 'react';
import RecommendationPanel from './RecommendationPanel';
import TrackTable from './TrackTable';

function MainDashboard() {
  const [selectedTrackIds, setSelectedTrackIds] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [trackDetails, setTrackDetails] = useState({});

  // Get full track objects for selected IDs
  const selectedTracks = selectedTrackIds.map(id =>
    filteredTracks.find(t => t.id === id)
  ).filter(Boolean);

  // Prepare artist data (if you have it)
  const artistsData = {};
  Object.values(trackDetails).forEach(track => {
    if (track.artists) {
      track.artists.forEach(artist => {
        artistsData[artist.id] = artist;
      });
    }
  });

  const handleAddRecommendedTrack = (track) => {
    // Add to your current playlist or selection
    console.log('Adding recommended track:', track.name);
    // Implementation depends on your app structure
  };

  return (
    <div>
      <TrackTable
        tracks={filteredTracks}
        selectedIds={selectedTrackIds}
        onSelectChange={setSelectedTrackIds}
      />

      <RecommendationPanel
        selectedTracks={selectedTracks}
        artistsData={artistsData}
        onAddTrack={handleAddRecommendedTrack}
      />
    </div>
  );
}
```

## API Reference

### `useRecommendations` Hook

```javascript
const {
  recommendations,     // Array of recommended tracks with scores
  loading,            // Boolean - is loading
  error,              // String - error message
  getRecommendations, // Function(seedTracks, options)
  getRecommendationsByMode, // Function(seedTracks, mode, options)
  clearRecommendations, // Function()
  modes               // Object - available preset modes
} = useRecommendations();
```

### `getRecommendations` Options

```javascript
{
  // Strategies to use
  useCoOccurrence: true,
  useArtistSimilarity: true,
  useGenreMatching: true,
  usePopularityBoost: true,

  // Search queries for public playlists
  searchQueries: ['workout', 'gym', 'running'],

  // Weights (higher = more influence)
  coOccurrenceWeight: 1.0,
  artistSimilarityWeight: 1.5,
  genreMatchingWeight: 1.2,

  // Number of recommendations to return
  limit: 20,

  // Artist data (optional but improves genre matching)
  artistsData: { /* artist objects keyed by ID */ }
}
```

### Recommendation Object

```javascript
{
  trackId: 'spotify:track:123',
  score: 42.5,        // Higher = more relevant
  track: {            // Full Spotify track object
    id: '123',
    name: 'Track Name',
    artists: [{ name: 'Artist Name', id: 'artist_123' }],
    album: { name: 'Album', images: [...] },
    popularity: 75
  }
}
```

## Preset Modes

### SIMILAR
Emphasizes artist and genre similarity. Best for finding tracks very similar to your selection.

```javascript
{
  artistSimilarityWeight: 2.0,
  genreMatchingWeight: 1.5,
  coOccurrenceWeight: 1.0
}
```

### POPULAR
Similar tracks that are also popular. Good for mainstream taste.

```javascript
{
  usePopularityBoost: true,
  artistSimilarityWeight: 1.5,
  coOccurrenceWeight: 1.0
}
```

### DISCOVERY
Emphasizes co-occurrence patterns. Best for discovering new music.

```javascript
{
  coOccurrenceWeight: 2.0,
  artistSimilarityWeight: 0.5,
  genreMatchingWeight: 1.0
}
```

### DEEP_CUTS
Less popular but similar tracks. For finding hidden gems.

```javascript
{
  usePopularityBoost: false,
  artistSimilarityWeight: 2.0,
  genreMatchingWeight: 1.5
}
```

## Caching

The system automatically caches playlist data for 24 hours to improve performance.

```javascript
import { getCacheStats, clearCache } from '../utils/recommendationCache';

// View cache statistics
const stats = getCacheStats();
console.log(`Cached queries: ${stats.totalQueries}`);

// Clear cache manually
clearCache();
```

## How It Builds Recommendations

### 1. Search Public Playlists
```
User selects: "Eye of the Tiger" (rock workout song)
↓
Auto-generates queries: ["rock", "workout", "Survivor"]
↓
Searches Spotify for public playlists matching these queries
↓
Fetches 5-10 playlists per query (~500-1000 tracks total)
```

### 2. Build Co-occurrence Matrix
```
Playlist 1: [Eye of the Tiger, We Will Rock You, Thunderstruck]
Playlist 2: [Eye of the Tiger, Don't Stop Believin', Sweet Child O' Mine]
Playlist 3: [We Will Rock You, Eye of the Tiger, You Give Love a Bad Name]
↓
Co-occurrence scores:
  Eye of the Tiger ↔ We Will Rock You: 2 (appeared together 2 times)
  Eye of the Tiger ↔ Don't Stop Believin': 1
  Eye of the Tiger ↔ Sweet Child O' Mine: 1
  Eye of the Tiger ↔ Thunderstruck: 1
```

### 3. Calculate Artist Similarity
```
"Eye of the Tiger" by Survivor (rock, classic rock)
↓
Find tracks by:
  - Same artist (Survivor): +10 points each
  - Similar artist names: +5 points
  - Same genre (rock, classic rock): +3 points per genre match
```

### 4. Combine Scores
```
Final recommendations ranked by combined score:
1. We Will Rock You (co-occurrence: 2, genre: +6, popularity: +0.8) = Score: 8.8
2. Thunderstruck (co-occurrence: 1, genre: +6, popularity: +0.7) = Score: 7.7
3. Don't Stop Believin' (co-occurrence: 1, genre: +3, popularity: +0.9) = Score: 4.9
```

## Performance Tips

1. **Limit search queries** - Use 3-5 queries max
2. **Cache results** - Automatic 24hr caching included
3. **Limit playlists** - Fetch 5-10 playlists per query
4. **Batch operations** - Get recommendations for multiple tracks at once

## Troubleshooting

**No recommendations found?**
- Make sure selected tracks have artist data
- Try more general search queries
- Check console for errors

**Slow performance?**
- Reduce number of search queries
- Reduce playlists per query
- Clear cache if stale data

**Poor quality recommendations?**
- Adjust weights in options
- Try different preset modes
- Provide artistsData for better genre matching

## Future Enhancements

- [ ] User playlist analysis (use your own playlists)
- [ ] Hybrid user + public playlist approach
- [ ] Audio feature estimation from metadata
- [ ] Machine learning ranking model
- [ ] Collaborative filtering from listening history
