const axios = require("axios");
const cheerio = require("cheerio");

class TraxsourceService {
  constructor() {
    this.baseUrl = "https://www.traxsource.com";
  }

  /**
   * Fetch Traxsource search page using axios (without browser rendering)
   * Note: This may not work if Traxsource requires JavaScript rendering or has anti-bot protection
   */
  async fetchPage(query) {
    const url = `${this.baseUrl}/search?term=${encodeURIComponent(query)}`;

    try {
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
      if (html.includes("403") || html.includes("Access Denied")) {
        console.error("❌ Traxsource: 403 Access Denied");
        return null;
      }

      if (html.includes("502") || html.includes("Bad Gateway")) {
        console.error(
          "❌ Traxsource: 502 Bad Gateway - Server temporarily unavailable"
        );
        return null;
      }

      if (html.includes("Cloudflare") && html.includes("challenge")) {
        console.error("❌ Traxsource: Cloudflare protection detected");
        console.warn(
          "⚠️ Traxsource requires browser rendering to bypass Cloudflare"
        );
        return null;
      }

      return html;
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        console.error(
          `❌ Traxsource: HTTP ${status} - ${err.response.statusText}`
        );

        if (status === 403) {
          console.error(
            "   → Access denied - Traxsource may be blocking automated requests"
          );
        } else if (status === 502) {
          console.error(
            "   → Bad Gateway - Traxsource server temporarily unavailable"
          );
        } else if (status === 503) {
          console.error(
            "   → Service Unavailable - Traxsource may be under maintenance"
          );
        }
      } else if (err.code === "ECONNABORTED") {
        console.error("❌ Traxsource: Request timeout");
      } else {
        console.error("❌ Traxsource fetchPage error:", err.message);
      }
      return null;
    }
  }

  /**
   * Main search method
   */
  async search(artist, title) {
    const query = `${artist} ${title}`;

    try {
      const html = await this.fetchPage(query);
      if (!html) {
        console.warn("⚠️ Traxsource: Failed to fetch page (empty HTML)");
        return {
          found: false,
          platform: "traxsource",
          error:
            "Could not load page (possible 502/403 error or Cloudflare block)",
        };
      }

      const $ = cheerio.load(html);

      // Debug: Check what we got
      const bodyText = $("body").text().substring(0, 200);

      // Check for error pages
      if (bodyText.includes("Access Denied") || bodyText.includes("403")) {
        console.error("❌ Traxsource: Access denied (403)");
        return {
          found: false,
          platform: "traxsource",
          error:
            "Access denied - Traxsource may be blocking automated requests",
        };
      }

      if (bodyText.includes("Bad Gateway") || bodyText.includes("502")) {
        console.error("❌ Traxsource: Bad gateway (502)");
        return {
          found: false,
          platform: "traxsource",
          error:
            "Server error (502) - Traxsource may be temporarily unavailable",
        };
      }

      const first = $(".trk-row").first();

      if (!first.length) {
        return {
          found: false,
          platform: "traxsource",
          error: "No tracks found",
        };
      }

      const trackUrl = this.baseUrl + first.find("a").attr("href");
      const trackTitle = first.find(".trk-name").text().trim() || title;
      const artistName = first.find(".trk-artists").text().trim() || artist;

      return {
        found: true,
        url: trackUrl,
        title: trackTitle,
        artist: artistName,
        platform: "traxsource",
      };
    } catch (err) {
      console.error("❌ Traxsource search error:", err.message);
      console.error("Stack trace:", err.stack);
      return {
        found: false,
        error: `Search failed: ${err.message}`,
        platform: "traxsource",
      };
    }
  }

  /**
   * Standard open link action
   */
  openInTraxsource(trackUrl) {
    return {
      success: true,
      platform: "traxsource",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { TraxsourceService };
