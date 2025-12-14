const axios = require("axios");
const cheerio = require("cheerio");

class DecksService {
  constructor() {
    this.baseUrl = "https://www.decks.de";
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Decks: Searching for "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}`;
      console.log(`🔍 Decks: Fetching ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const html = response.data;

      // Check for error pages
      if (html.includes('403') || html.includes('Access Denied')) {
        console.error("❌ Decks: 403 Access Denied");
        return {
          found: false,
          platform: "decks",
          error: "Access denied - Decks may be blocking automated requests"
        };
      }

      if (html.includes('502') || html.includes('Bad Gateway')) {
        console.error("❌ Decks: 502 Bad Gateway");
        return {
          found: false,
          platform: "decks",
          error: "Server error (502) - Decks may be temporarily unavailable"
        };
      }

      const $ = cheerio.load(html);

      // Debug: Check what we got
      const bodyText = $("body").text().substring(0, 200);
      console.log("📄 Decks: Page content preview:", bodyText);

      // Try to find search results
      const searchResults = $(
        ".product, .item, .article, [class*='product'], [class*='item'], [class*='article'], [class*='result']"
      );

      if (searchResults.length === 0) {
        console.log(`🔍 Decks: No results found for "${query}"`);
        console.log("Available CSS classes:", $("*").map((_, el) => $(el).attr("class")).get().filter(Boolean).slice(0, 20));
        return { found: false, platform: "decks", error: "No tracks found" };
      }

      console.log(`✅ Decks: Found ${searchResults.length} potential results`);

      const firstResult = searchResults.first();

      // Try to extract track information
      const trackLink = firstResult.find("a[href*='/product'], a[href*='/artikel'], a").first();
      const trackUrl = trackLink.attr("href");

      if (!trackUrl) {
        console.log(`🔍 Decks: Found results but couldn't extract track URL`);
        return { found: false, platform: "decks", error: "Could not extract track information" };
      }

      const fullUrl = trackUrl.startsWith("http") ? trackUrl : `${this.baseUrl}${trackUrl}`;
      const trackTitle = firstResult.find(".title, .name, [class*='title'], [class*='name']").first().text().trim() || title;
      const artistName = firstResult.find(".artist, [class*='artist'], [class*='kuenstler']").first().text().trim() || artist;

      console.log(`✅ Decks: Found track: ${trackTitle} by ${artistName}`);

      return {
        found: true,
        url: fullUrl,
        title: trackTitle,
        artist: artistName,
        platform: "decks",
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.error(`❌ Decks: HTTP ${status} - ${error.response.statusText}`);

        if (status === 403) {
          console.error("   → Access denied - Decks may be blocking automated requests");
        } else if (status === 502) {
          console.error("   → Bad Gateway - Decks server temporarily unavailable");
        } else if (status === 503) {
          console.error("   → Service Unavailable - Decks may be under maintenance");
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error("❌ Decks: Request timeout");
      } else {
        console.error("❌ Decks search error:", error.message);
      }

      return {
        found: false,
        platform: "decks",
        error: `Search failed: ${error.message}`
      };
    }
  }

  openInDecks(trackUrl) {
    return {
      success: true,
      platform: "decks",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { DecksService };
