const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

class TraxsourcePuppeteerService {
  constructor() {
    this.baseUrl = "https://www.traxsource.com";
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      console.log("🚀 Traxsource: Launching browser...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });
      console.log("✅ Traxsource: Browser launched");
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("🔒 Traxsource: Browser closed");
    }
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Traxsource (Puppeteer): Searching for "${query}"`);

    let page = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Enhanced bot detection evasion
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      await page.setViewport({ width: 1920, height: 1080 });

      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?term=${encodedQuery}`;

      console.log(`🔍 Traxsource: Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("⏳ Traxsource: Waiting for page to fully load...");

      // Check if we hit bot protection
      const isProtected = await page.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        return (bodyText.includes('cloudflare') && bodyText.includes('checking your browser')) ||
               bodyText.includes('access denied') ||
               bodyText.includes('blocked');
      });

      if (isProtected) {
        console.log("⚠️ Traxsource: Bot protection detected, waiting longer...");
        await new Promise(resolve => setTimeout(resolve, 8000));
      } else {
        // Wait for JavaScript to render content
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Debug: Analyze page structure
      const pageInfo = await page.evaluate(() => {
        // Get sample of links
        const allLinks = Array.from(document.querySelectorAll("a[href]"))
          .slice(0, 20)
          .map(a => ({
            href: a.href,
            text: a.textContent.trim().substring(0, 60),
            classes: a.className
          }));

        // Check for "no results" message
        const bodyText = document.body.textContent.toLowerCase();
        const hasNoResults = bodyText.includes('no result') ||
                            bodyText.includes('0 result') ||
                            bodyText.includes('nothing found') ||
                            bodyText.includes('no tracks') ||
                            bodyText.includes('no matches');

        return {
          allLinks: allLinks,
          bodyPreview: document.body.textContent.substring(0, 800).replace(/\s+/g, ' '),
          url: window.location.href,
          hasNoResults: hasNoResults
        };
      });

      console.log("\n🔍 Traxsource: Debug Info:");
      console.log("  URL:", pageInfo.url);
      console.log("  Has 'no results' message:", pageInfo.hasNoResults);
      console.log("  Sample links found:", pageInfo.allLinks.slice(0, 5));

      // Early return if no results detected
      const hasTrackLinks = pageInfo.allLinks.some(link =>
        link.href.includes('/track/') || link.href.includes('/title/') || link.href.includes('/release/')
      );

      if (pageInfo.hasNoResults && !hasTrackLinks) {
        console.log("❌ Traxsource: No results found for this search");
        await page.close();
        return { found: false, platform: "traxsource", error: "No tracks found" };
      }

      // Extract search results with multiple strategies
      const results = await page.evaluate(() => {
        // Try multiple selector strategies
        let resultElements = [];

        // Strategy 1: Look for track/title links directly
        const trackLinks = document.querySelectorAll(
          "a[href*='/track/'], a[href*='/title/'], a[href*='/release/']"
        );
        if (trackLinks.length > 0) {
          console.log(`Found ${trackLinks.length} track/title links`);
          resultElements = Array.from(trackLinks);
        } else {
          // Strategy 2: Look for common container classes
          const containers = document.querySelectorAll(
            ".trk-cell, .search-result, .track, .track-item, " +
            "[class*='trk-'], [class*='track'], [class*='result']"
          );
          resultElements = Array.from(containers);
        }

        if (resultElements.length === 0) {
          return [];
        }

        const extractedResults = [];

        resultElements.forEach((element) => {
          // If element is a link itself
          let link = element.tagName === 'A' ? element : element.querySelector("a[href]");

          if (!link || !link.href) return;

          // Filter to only track/title/release links
          if (!link.href.includes('/track/') &&
              !link.href.includes('/title/') &&
              !link.href.includes('/release/')) {
            return;
          }

          // Try to find title
          let title = "";
          const titleSelectors = [
            ".title", ".trk-title", ".track-title", ".name",
            "[class*='title']", "[class*='name']"
          ];

          for (const selector of titleSelectors) {
            const titleEl = element.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }

          // Try link text if no title found
          if (!title && link.textContent.trim()) {
            title = link.textContent.trim();
          }

          // Try to find artist
          let artist = "";
          const artistSelectors = [
            ".artists", ".artist", ".artist-name", "[class*='artist']"
          ];

          for (const selector of artistSelectors) {
            const artistEl = element.querySelector(selector);
            if (artistEl && artistEl.textContent.trim()) {
              artist = artistEl.textContent.trim();
              break;
            }
          }

          if (title) {
            extractedResults.push({
              url: link.href,
              title: title.substring(0, 200),
              artist: artist.substring(0, 100),
            });
          }
        });

        return extractedResults;
      });

      console.log(`📊 Traxsource: Found ${results.length} results`);

      await page.close();

      if (results.length === 0) {
        return { found: false, platform: "traxsource", error: "No tracks found" };
      }

      const firstResult = results[0];
      console.log(`✅ Traxsource: Found track: ${firstResult.title} by ${firstResult.artist}`);

      return {
        found: true,
        url: firstResult.url,
        title: firstResult.title || title,
        artist: firstResult.artist || artist,
        platform: "traxsource",
      };
    } catch (error) {
      if (page) {
        await page.close();
      }

      console.error("❌ Traxsource (Puppeteer) search error:", error.message);

      if (error.message.includes("timeout")) {
        console.error("   → Page load timeout");
      }

      return {
        found: false,
        platform: "traxsource",
        error: `Search failed: ${error.message}`,
      };
    }
  }

  openInTraxsource(trackUrl) {
    return {
      success: true,
      platform: "traxsource",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { TraxsourcePuppeteerService };
