const axios = require("axios");
const cheerio = require("cheerio");

class PhonicaService {
  constructor() {
    this.baseUrl = "https://www.phonicarecords.com";
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Phonica: Searching for "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}`;
      console.log(`🔍 Phonica: Fetching ${url}`);

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
        console.error("❌ Phonica: 403 Access Denied");
        return {
          found: false,
          platform: "phonica",
          error: "Access denied - Phonica may be blocking automated requests"
        };
      }

      if (html.includes('502') || html.includes('Bad Gateway')) {
        console.error("❌ Phonica: 502 Bad Gateway");
        return {
          found: false,
          platform: "phonica",
          error: "Server error (502) - Phonica may be temporarily unavailable"
        };
      }

      const $ = cheerio.load(html);

      // Debug: Check what we got
      const bodyText = $("body").text().substring(0, 200);
      console.log("📄 Phonica: Page content preview:", bodyText);

      // Try to find search results
      const searchResults = $(
        ".product, .product-item, .item, [class*='product'], [class*='item'], [class*='result']"
      );

      if (searchResults.length === 0) {
        console.log(`🔍 Phonica: No results found for "${query}"`);
        console.log("Available CSS classes:", $("*").map((_, el) => $(el).attr("class")).get().filter(Boolean).slice(0, 20));
        return { found: false, platform: "phonica", error: "No tracks found" };
      }

      console.log(`✅ Phonica: Found ${searchResults.length} potential results`);

      const firstResult = searchResults.first();

      // Try to extract track information
      const trackLink = firstResult.find("a[href*='/product'], a[href*='/release'], a").first();
      const trackUrl = trackLink.attr("href");

      if (!trackUrl) {
        console.log(`🔍 Phonica: Found results but couldn't extract track URL`);
        return { found: false, platform: "phonica", error: "Could not extract track information" };
      }

      const fullUrl = trackUrl.startsWith("http") ? trackUrl : `${this.baseUrl}${trackUrl}`;
      const trackTitle = firstResult.find(".title, .product-title, [class*='title']").first().text().trim() || title;
      const artistName = firstResult.find(".artist, [class*='artist']").first().text().trim() || artist;

      console.log(`✅ Phonica: Found track: ${trackTitle} by ${artistName}`);

      return {
        found: true,
        url: fullUrl,
        title: trackTitle,
        artist: artistName,
        platform: "phonica",
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.error(`❌ Phonica: HTTP ${status} - ${error.response.statusText}`);

        if (status === 403) {
          console.error("   → Access denied - Phonica may be blocking automated requests");
        } else if (status === 502) {
          console.error("   → Bad Gateway - Phonica server temporarily unavailable");
        } else if (status === 503) {
          console.error("   → Service Unavailable - Phonica may be under maintenance");
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error("❌ Phonica: Request timeout");
      } else {
        console.error("❌ Phonica search error:", error.message);
      }

      return {
        found: false,
        platform: "phonica",
        error: `Search failed: ${error.message}`
      };
    }
  }

  openInPhonica(trackUrl) {
    return {
      success: true,
      platform: "phonica",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { PhonicaService };
