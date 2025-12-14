const axios = require("axios");

class BandcampService {
  constructor() {
    this.baseUrl = "https://bandcamp.com";
  }

  async search(artist, title) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: `${artist} ${title}`,
          item_type: "t",
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      const html = response.data;

      // Look for track results
      const trackUrlMatch = html.match(
        /href="(https:\/\/[^"]+\.bandcamp\.com\/track\/([^"]+))"/
      );
      if (trackUrlMatch) {
        const url = trackUrlMatch[1];
        const trackSlug = trackUrlMatch[2] || url;
        return {
          found: true,
          url: url,
          trackId: trackSlug,
          platform: "bandcamp",
        };
      }

      return { found: false, platform: "bandcamp" };
    } catch (error) {
      return { found: false, platform: "bandcamp" };
    }
  }

  openInBandcamp(trackUrl) {
    return {
      success: true,
      platform: "bandcamp",
      url: trackUrl,
      action: "open_link",
    };
  }
}
module.exports = { BandcampService };