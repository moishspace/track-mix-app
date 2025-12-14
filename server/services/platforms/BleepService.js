const axios = require("axios");
const cheerio = require("cheerio");

class BleepService {
  constructor() {
    this.baseUrl = "https://bleep.com";
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Bleep: Searching for "${query}"`);

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?search=${encodedQuery}`;
      console.log(`🔍 Bleep: Fetching ${url}`);

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
        console.error("❌ Bleep: 403 Access Denied");
        return {
          found: false,
          platform: "bleep",
          error: "Access denied - Bleep may be blocking automated requests"
        };
      }

      if (html.includes('502') || html.includes('Bad Gateway')) {
        console.error("❌ Bleep: 502 Bad Gateway");
        return {
          found: false,
          platform: "bleep",
          error: "Server error (502) - Bleep may be temporarily unavailable"
        };
      }

      const $ = cheerio.load(html);

      // Debug: Check what we got
      const bodyText = $("body").text().substring(0, 300);
      console.log("📄 Bleep: Page content preview:", bodyText);
      console.log("📏 Bleep: Total HTML length:", html.length, "bytes");

      // Check if this is a client-side rendered search (like React/Next.js)
      const hasReactRoot = html.includes('__NEXT_DATA__') || html.includes('react') || html.includes('__REACT');
      console.log("🔍 Bleep: Appears to be client-side rendered:", hasReactRoot);

      // Look for any script tags that might load search results
      const scriptTags = $("script").length;
      console.log("📜 Bleep: Found", scriptTags, "script tags");

      // Check for search result containers
      const searchContainers = $(
        "#search-results, .search-results, .results, [id*='search'], [class*='search-results']"
      );
      console.log("🔍 Bleep: Found", searchContainers.length, "potential search containers");

      // Try to find search results - common selectors for Bleep
      console.log("🔎 Bleep: Trying first selector set...");
      let searchResults = $(
        ".search-result, .track, .release, .product, [class*='track'], [class*='release'], [class*='product']"
      );
      console.log(`📊 Bleep: Found ${searchResults.length} elements with first selector set`);

      if (searchResults.length === 0) {
        // Try alternative selectors
        console.log("🔎 Bleep: Trying alternative selectors...");
        searchResults = $("article, .item, .result, [class*='item'], [class*='result']");
        console.log(`📊 Bleep: Found ${searchResults.length} elements with alternative selectors`);
      }

      if (searchResults.length === 0) {
        console.log(`❌ Bleep: No results found for "${query}"`);
        const allClasses = $("*").map((_, el) => $(el).attr("class")).get().filter(Boolean);
        console.log("📋 Bleep: Total unique classes found:", [...new Set(allClasses)].length);
        console.log("📋 Bleep: First 30 CSS classes:", allClasses.slice(0, 30));

        // Also log some element types
        console.log("📋 Bleep: div count:", $("div").length);
        console.log("📋 Bleep: a count:", $("a").length);
        console.log("📋 Bleep: article count:", $("article").length);

        return { found: false, platform: "bleep", error: "No tracks found" };
      }

      console.log(`✅ Bleep: Found ${searchResults.length} potential results`);

      // Log what kinds of elements we found
      console.log("📋 Bleep: Element types found:");
      searchResults.each((i, el) => {
        const $el = $(el);
        const tag = el.name;
        const classes = $el.attr("class") || "no-class";
        const text = $el.text().trim().substring(0, 50);
        console.log(`  [${i}] <${tag}> class="${classes}" text="${text}"`);
      });

      const firstResult = searchResults.first();
      console.log("🔍 Bleep: First result HTML:", firstResult.html()?.substring(0, 500));

      // Try to extract track information
      console.log("🔗 Bleep: Looking for track link...");
      const trackLink = firstResult.find("a[href*='/release'], a[href*='/track'], a").first();
      const trackUrl = trackLink.attr("href");
      console.log("🔗 Bleep: Found link href:", trackUrl);

      if (!trackUrl) {
        console.log(`❌ Bleep: Found results but couldn't extract track URL`);
        console.log("📋 Bleep: All links in first result:", firstResult.find("a").map((_, el) => $(el).attr("href")).get());
        return { found: false, platform: "bleep", error: "Could not extract track information" };
      }

      const fullUrl = trackUrl.startsWith("http") ? trackUrl : `${this.baseUrl}${trackUrl}`;
      console.log("🔗 Bleep: Full URL:", fullUrl);

      // Try to extract track title
      console.log("📝 Bleep: Looking for track title...");
      const trackTitle = firstResult.find(".title, .track-title, [class*='title']").first().text().trim() || title;
      console.log("📝 Bleep: Track title:", trackTitle);

      // Try to extract artist name
      console.log("👤 Bleep: Looking for artist name...");
      const artistName = firstResult.find(".artist, .track-artist, [class*='artist']").first().text().trim() || artist;
      console.log("👤 Bleep: Artist name:", artistName);

      console.log(`✅ Bleep: Successfully found track: "${trackTitle}" by "${artistName}"`);
      console.log(`✅ Bleep: URL: ${fullUrl}`);

      return {
        found: true,
        url: fullUrl,
        title: trackTitle,
        artist: artistName,
        platform: "bleep",
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.error(`❌ Bleep: HTTP ${status} - ${error.response.statusText}`);

        if (status === 403) {
          console.error("   → Access denied - Bleep may be blocking automated requests");
        } else if (status === 502) {
          console.error("   → Bad Gateway - Bleep server temporarily unavailable");
        } else if (status === 503) {
          console.error("   → Service Unavailable - Bleep may be under maintenance");
        }
      } else if (error.code === 'ECONNABORTED') {
        console.error("❌ Bleep: Request timeout");
      } else {
        console.error("❌ Bleep search error:", error.message);
      }

      return {
        found: false,
        platform: "bleep",
        error: `Search failed: ${error.message}`
      };
    }
  }

  openInBleep(trackUrl) {
    return {
      success: true,
      platform: "bleep",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { BleepService };