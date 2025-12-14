const axios = require("axios");

class BeatportService {
  constructor() {
    this.baseUrl = "https://www.beatport.com";
  }

  async search(artist, title) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { q: `${artist} ${title}` },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const html = response.data;

      // Beatport uses React with JSON data embedded in the page
      // Look for track data in the __NEXT_DATA__ or dehydrated state
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/
      );
      if (nextDataMatch) {
        try {
          const jsonData = JSON.parse(nextDataMatch[1]);
          const dehydratedState = jsonData?.props?.pageProps?.dehydratedState;

          if (dehydratedState?.queries) {
            for (const query of dehydratedState.queries) {
              const tracksObj = query?.state?.data?.tracks;
              // Tracks can be in tracks.data array
              const tracks =
                tracksObj?.data ||
                (Array.isArray(tracksObj) ? tracksObj : null);
              if (tracks && tracks.length > 0) {
                const track = tracks[0];
                // Beatport URL pattern: /track/track-name/track-id
                const trackName = track.track_name || track.name;
                const slug =
                  track.slug ||
                  trackName
                    ?.toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");
                const trackId = track.track_id || track.id;
                if (trackId && slug) {
                  return {
                    found: true,
                    url: `${this.baseUrl}/track/${slug}/${trackId}`,
                    trackId: trackId.toString(),
                    platform: "beatport",
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
            const slug =
              track.slug ||
              trackName
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            const trackId = track.track_id || track.id;
            if (trackId && slug) {
              return {
                found: true,
                url: `${this.baseUrl}/track/${slug}/${trackId}`,
                trackId: trackId.toString(),
                platform: "beatport",
              };
            }
          }

          // Check for search results in different structure
          const searchTracks =
            pageProps?.searchResults?.tracks?.data ||
            pageProps?.searchResults?.tracks;
          if (searchTracks?.length > 0) {
            const track = searchTracks[0];
            const trackName = track.track_name || track.name;
            const slug =
              track.slug ||
              trackName
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            const trackId = track.track_id || track.id;
            if (trackId && slug) {
              return {
                found: true,
                url: `${this.baseUrl}/track/${slug}/${trackId}`,
                trackId: trackId.toString(),
                platform: "beatport",
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
        /\/track\/([a-z0-9-]+\/\d+)/,
      ];

      for (const pattern of trackPatterns) {
        const match = html.match(pattern);
        if (match) {
          // Handle the slug+id pattern
          if (match[2]) {
            return {
              found: true,
              url: `${this.baseUrl}/track/${match[1]}/${match[2]}`,
              platform: "beatport",
            };
          }
          const trackPath = match[1].startsWith("/")
            ? match[1]
            : `/track/${match[1]}`;
          return {
            found: true,
            url: `${this.baseUrl}${trackPath}`,
            platform: "beatport",
          };
        }
      }

      return { found: false, platform: "beatport" };
    } catch (error) {
      console.error("Beatport search error:", error.message);
      return { found: false, platform: "beatport" };
    }
  }

  openInBeatport(trackUrl) {
    return {
      success: true,
      platform: "beatport",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { BeatportService };