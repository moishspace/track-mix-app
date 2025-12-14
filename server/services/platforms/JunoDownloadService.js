const axios = require("axios");
const cheerio = require("cheerio");

class JunoDownloadService {
  constructor() {
    this.baseUrl = "https://www.junodownload.com";
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 JunoDownload: Searching for "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search/?q%5Ball%5D%5B%5D=${encodedQuery}`;
      console.log(`🔍 JunoDownload: Fetching ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      const html = response.data;

      // Check for error pages
      if (html.includes('403') || html.includes('Access Denied')) {
        console.error("❌ JunoDownload: 403 Access Denied");
        return {
          found: false,
          platform: "junodownload",
          error: "Access denied - JunoDownload may be blocking automated requests"
        };
      }

      if (html.includes('502') || html.includes('Bad Gateway')) {
        console.error("❌ JunoDownload: 502 Bad Gateway");
        return {
          found: false,
          platform: "junodownload",
          error: "Server error (502) - JunoDownload may be temporarily unavailable"
        };
      }

      const $ = cheerio.load(html);

      // Debug: Check what we got
      const bodyText = $("body").text().substring(0, 200);
      console.log("📄 JunoDownload: Page content preview:", bodyText);

      // Try to find search results - common selectors for JunoDownload
      const searchResults = $(
        ".product, .product-list-item, .jd-listing-item, [class*='product'], [class*='track'], [class*='result']"
      );

      if (searchResults.length === 0) {
        console.log(`🔍 JunoDownload: No results found for "${query}"`);
        console.log("Available CSS classes:", $("*").map((_, el) => $(el).attr("class")).get().filter(Boolean).slice(0, 20));
        return { found: false, platform: "junodownload", error: "No tracks found" };
      }

      const firstResult = searchResults.first();

      // Try to extract track information
      const trackLink = firstResult.find("a[href*='/products/'], a[href*='/track'], a").first();
      const trackUrl = trackLink.attr("href");

      if (!trackUrl) {
        console.log(`🔍 JunoDownload: Found results but couldn't extract track URL`);
        return { found: false, platform: "junodownload", error: "Could not extract track information" };
      }

      const fullUrl = trackUrl.startsWith("http") ? trackUrl : `${this.baseUrl}${trackUrl}`;
      const trackTitle = firstResult.find(".jq_highlight, .product-title, .title, [class*='title']").first().text().trim() || title;
      const artistName = firstResult.find(".jq_highlight_2, .artist, [class*='artist']").first().text().trim() || artist;

      console.log(`✅ JunoDownload: Found track: ${trackTitle} by ${artistName}`);

      return {
        found: true,
        url: fullUrl,
        title: trackTitle,
        artist: artistName,
        platform: "junodownload",
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.error(`❌ JunoDownload: HTTP ${status} - ${error.response.statusText}`);

        if (status === 403) {
          console.error("   → Access denied - JunoDownload may be blocking automated requests");
        } else if (status === 502) {
          console.error("   → Bad Gateway - JunoDownload server temporarily unavailable");
        } else if (status === 503) {
          console.error("   → Service Unavailable - JunoDownload may be under maintenance");
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error("❌ JunoDownload: Request timeout");
      } else {
        console.error("❌ JunoDownload search error:", error.message);
      }

      return {
        found: false,
        platform: "junodownload",
        error: `Search failed: ${error.message}`
      };
    }
  }

  openInJuno(trackUrl) {
    return {
      success: true,
      platform: "junodownload",
      url: trackUrl,
      action: "open_link",
    };
  }
}


module.exports = { JunoDownloadService };