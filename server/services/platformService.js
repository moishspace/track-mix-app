const axios = require('axios');

// ============== SOUNDEO ==============
class SoundeoService {
  constructor() {
    this.baseUrl = 'https://soundeo.com';
  }

  async search(artist, title) {
    try {
      const query = encodeURIComponent(`${artist} ${title}`);
      const response = await axios.get(`${this.baseUrl}/search?q=${query}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = response.data;

      // Look for track in search results
      const trackMatch = html.match(/href="(\/track\/[^"]+)"/);
      if (trackMatch) {
        return {
          found: true,
          url: `${this.baseUrl}${trackMatch[1]}`,
          platform: 'soundeo'
        };
      }

      return { found: false, platform: 'soundeo' };
    } catch (error) {
      return { found: false, platform: 'soundeo' };
    }
  }

  openInSoundeo(trackUrl) {
    return {
      success: true,
      platform: 'soundeo',
      url: trackUrl,
      action: 'open_link'
    };
  }
}

// ============== BEATPORT ==============
class BeatportService {
  constructor() {
    this.baseUrl = 'https://www.beatport.com';
  }

  async search(artist, title) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q: `${artist} ${title}` },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = response.data;

      // Beatport uses React with JSON data embedded in the page
      // Look for track data in the __NEXT_DATA__ or dehydrated state
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
      if (nextDataMatch) {
        try {
          const jsonData = JSON.parse(nextDataMatch[1]);
          const dehydratedState = jsonData?.props?.pageProps?.dehydratedState;

          if (dehydratedState?.queries) {
            for (const query of dehydratedState.queries) {
              const tracksObj = query?.state?.data?.tracks;
              // Tracks can be in tracks.data array
              const tracks = tracksObj?.data || (Array.isArray(tracksObj) ? tracksObj : null);
              if (tracks && tracks.length > 0) {
                const track = tracks[0];
                // Beatport URL pattern: /track/track-name/track-id
                const trackName = track.track_name || track.name;
                const slug = track.slug || trackName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                const trackId = track.track_id || track.id;
                if (trackId && slug) {
                  return {
                    found: true,
                    url: `${this.baseUrl}/track/${slug}/${trackId}`,
                    platform: 'beatport'
                  };
                }
              }
            }
          }

          // Try alternate paths in the JSON
          const pageProps = jsonData?.props?.pageProps;
          const altTracks = pageProps?.tracks?.data || pageProps?.tracks;
          if (altTracks?.length > 0) {
            const track = altTracks[0];
            const trackName = track.track_name || track.name;
            const slug = track.slug || trackName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const trackId = track.track_id || track.id;
            if (trackId && slug) {
              return {
                found: true,
                url: `${this.baseUrl}/track/${slug}/${trackId}`,
                platform: 'beatport'
              };
            }
          }

          // Check for search results in different structure
          const searchTracks = pageProps?.searchResults?.tracks?.data || pageProps?.searchResults?.tracks;
          if (searchTracks?.length > 0) {
            const track = searchTracks[0];
            const trackName = track.track_name || track.name;
            const slug = track.slug || trackName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const trackId = track.track_id || track.id;
            if (trackId && slug) {
              return {
                found: true,
                url: `${this.baseUrl}/track/${slug}/${trackId}`,
                platform: 'beatport'
              };
            }
          }
        } catch (parseError) {
          // JSON parse failed, try regex fallback
        }
      }

      // Fallback: look for track URLs in various formats
      const trackPatterns = [
        /href="(\/track\/[^"]+)"/,
        /"url":"(\/track\/[^"]+)"/,
        /"slug":"([^"]+)"[^}]*"id":(\d+)/,
        /\/track\/([a-z0-9-]+\/\d+)/
      ];

      for (const pattern of trackPatterns) {
        const match = html.match(pattern);
        if (match) {
          // Handle the slug+id pattern
          if (match[2]) {
            return {
              found: true,
              url: `${this.baseUrl}/track/${match[1]}/${match[2]}`,
              platform: 'beatport'
            };
          }
          const trackPath = match[1].startsWith('/') ? match[1] : `/track/${match[1]}`;
          return {
            found: true,
            url: `${this.baseUrl}${trackPath}`,
            platform: 'beatport'
          };
        }
      }

      return { found: false, platform: 'beatport' };
    } catch (error) {
      console.error('Beatport search error:', error.message);
      return { found: false, platform: 'beatport' };
    }
  }

  openInBeatport(trackUrl) {
    return {
      success: true,
      platform: 'beatport',
      url: trackUrl,
      action: 'open_link'
    };
  }
}

// ============== BANDCAMP ==============
class BandcampService {
  constructor() {
    this.baseUrl = 'https://bandcamp.com';
  }

  async search(artist, title) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: `${artist} ${title}`,
          item_type: 't'
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = response.data;

      // Look for track results
      const trackUrlMatch = html.match(/href="(https:\/\/[^"]+\.bandcamp\.com\/track\/[^"]+)"/);
      if (trackUrlMatch) {
        return {
          found: true,
          url: trackUrlMatch[1],
          platform: 'bandcamp'
        };
      }

      return { found: false, platform: 'bandcamp' };
    } catch (error) {
      return { found: false, platform: 'bandcamp' };
    }
  }

  openInBandcamp(trackUrl) {
    return {
      success: true,
      platform: 'bandcamp',
      url: trackUrl,
      action: 'open_link'
    };
  }
}

// ============== MAIN SERVICE ==============
class PlatformService {
  constructor() {
    this.soundeo = new SoundeoService();
    this.beatport = new BeatportService();
    this.bandcamp = new BandcampService();
  }

  async searchAllPlatforms(artist, title) {
    const results = {
      soundeo: null,
      bandcamp: null,
      beatport: null,
      primary: null
    };

    // Run all searches in parallel
    const [soundeoResult, bandcampResult, beatportResult] = await Promise.all([
      this.soundeo.search(artist, title),
      this.bandcamp.search(artist, title),
      this.beatport.search(artist, title)
    ]);

    results.soundeo = soundeoResult;
    results.bandcamp = bandcampResult;
    results.beatport = beatportResult;

    // Set primary based on priority: Soundeo > Bandcamp > Beatport
    if (soundeoResult.found) {
      results.primary = { ...soundeoResult, platform: 'soundeo' };
    } else if (bandcampResult.found) {
      results.primary = { ...bandcampResult, platform: 'bandcamp' };
    } else if (beatportResult.found) {
      results.primary = { ...beatportResult, platform: 'beatport' };
    }

    return results;
  }

  openInPlatform(platform, trackUrl) {
    switch (platform) {
      case 'soundeo':
        return this.soundeo.openInSoundeo(trackUrl);
      case 'beatport':
        return this.beatport.openInBeatport(trackUrl);
      case 'bandcamp':
        return this.bandcamp.openInBandcamp(trackUrl);
      default:
        return { success: false, error: 'Unknown platform' };
    }
  }

  // Keep old name for backward compatibility
  async addToCart(platform, trackId, trackUrl) {
    return this.openInPlatform(platform, trackUrl);
  }
}

module.exports = new PlatformService();
