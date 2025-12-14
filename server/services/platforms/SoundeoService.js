const axios = require("axios");

class SoundeoService {
  constructor() {
    this.baseUrl = "https://soundeo.com";
  }

  async search(artist, title) {
    try {
      const query = encodeURIComponent(`${artist} ${title}`);
      const response = await axios.get(`${this.baseUrl}/search?q=${query}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const html = response.data;

      // Look for search results section - find multiple tracks and look for best match
      const trackMatches = html.matchAll(/href="(\/track\/[^"]+)"/g);
      const tracks = Array.from(trackMatches).map((m) => m[1]);

      if (tracks.length === 0) {
        return { found: false, platform: "soundeo" };
      }

      // Try to find a track that matches the search query better
      // Look for tracks that contain words from artist or title
      const artistWords = artist
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);
      const titleWords = title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1);

      let bestMatch = null;
      let bestScore = 0;
      let bestArtistMatches = 0;
      let bestTitleMatches = 0;

      // Search all tracks (don't skip any)
      const tracksToSearch = tracks;

      for (const trackPath of tracksToSearch) {
        const pathLower = trackPath.toLowerCase();
        let score = 0;
        let artistMatches = 0;
        let titleMatches = 0;

        // Score artist words more heavily
        for (const word of artistWords) {
          if (pathLower.includes(word)) {
            score += 3;
            artistMatches++;
          }
        }

        // Score title words
        for (const word of titleWords) {
          if (pathLower.includes(word)) {
            score += 2;
            titleMatches++;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = trackPath;
          bestArtistMatches = artistMatches;
          bestTitleMatches = titleMatches;
        }
      }

      // Require BOTH artist and title words to match with minimum score of 3
      // This prevents false positives from partial matches
      if (
        !bestMatch ||
        bestScore < 3 ||
        bestArtistMatches === 0 ||
        bestTitleMatches === 0
      ) {
        // console.log(`Soundeo: No good match for ${artist} - ${title} (score: ${bestScore}, artist: ${bestArtistMatches}, title: ${bestTitleMatches})`);
        return { found: false, platform: "soundeo" };
      }

      const url = `${this.baseUrl}${bestMatch}`;
      const trackId = url;

      // console.log(`Soundeo found: ${artist} - ${title} -> ${url} (score: ${bestScore})`);

      return {
        found: true,
        url: url,
        trackId: trackId,
        platform: "soundeo",
      };
    } catch (error) {
      console.error(
        `Soundeo search error for ${artist} - ${title}:`,
        error.message
      );
      return { found: false, platform: "soundeo" };
    }
  }

  openInSoundeo(trackUrl) {
    return {
      success: true,
      platform: "soundeo",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { SoundeoService };