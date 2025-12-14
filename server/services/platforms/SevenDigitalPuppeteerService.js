const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

class SevenDigitalPuppeteerService {
  constructor() {
    this.baseUrl = "https://uk.7digital.com";
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      console.log("🚀 7digital: Launching browser...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });
      console.log("✅ 7digital: Browser launched");
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("🔒 7digital: Browser closed");
    }
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 7digital (Puppeteer): Searching for "${query}"`);

    let page = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      await page.setViewport({ width: 1920, height: 1080 });

      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}`;

      console.log(`🔍 7digital: Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("⏳ 7digital: Waiting for page to fully load...");

      // Wait longer for JavaScript to render content
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Debug: Log page HTML structure and save screenshot
      const pageInfo = await page.evaluate(() => {
        // Get all class names to understand the structure
        const allClasses = new Set();
        document.querySelectorAll("*").forEach(el => {
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
              if (cls.trim()) allClasses.add(cls.trim());
            });
          }
        });

        // Look for ANY links
        const allLinks = Array.from(document.querySelectorAll("a[href]"))
          .slice(0, 20)
          .map(a => ({
            href: a.href,
            text: a.textContent.trim().substring(0, 60),
            classes: a.className
          }));

        // Check if there's a "no results" message
        const bodyText = document.body.textContent.toLowerCase();
        const hasNoResults = bodyText.includes('no result') ||
                            bodyText.includes('0 result') ||
                            bodyText.includes('nothing found') ||
                            bodyText.includes('no tracks') ||
                            bodyText.includes('no albums');

        return {
          classes: Array.from(allClasses).sort(),
          allLinks: allLinks,
          bodyPreview: document.body.textContent.substring(0, 800).replace(/\s+/g, ' '),
          url: window.location.href,
          hasNoResults: hasNoResults
        };
      });

      console.log("\n🔍 7digital: Debug Info:");
      console.log("  URL:", pageInfo.url);
      console.log("  Has 'no results' message:", pageInfo.hasNoResults);

      // If there's a "no results" message and no track/release/artist links, return early
      const hasTrackLinks = pageInfo.allLinks.some(link =>
        link.href.includes('/track/') || link.href.includes('/release/') || link.href.includes('/artist/')
      );

      if (pageInfo.hasNoResults && !hasTrackLinks) {
        console.log("❌ 7digital: No results found for this search");
        await page.close();
        return { found: false, platform: "7digital", error: "No tracks found" };
      }

      // Extract search results with multiple selector strategies
      const results = await page.evaluate(() => {
        // Try multiple selector strategies
        let resultElements = [];

        // Strategy 1: Look for track/release links directly
        const trackLinks = document.querySelectorAll("a[href*='/track/'], a[href*='/release/']");
        if (trackLinks.length > 0) {
          console.log(`Found ${trackLinks.length} track/release links`);
          resultElements = Array.from(trackLinks);
        } else {
          // Strategy 2: Look for common container classes
          const containers = document.querySelectorAll(
            ".search-result, .track-item, .release-item, .product, .item, " +
            "[class*='search'], [class*='track'], [class*='release'], " +
            "[class*='product'], [class*='item'], [class*='result']"
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

          // Filter to only track/release/artist links
          if (!link.href.includes('/track/') &&
              !link.href.includes('/release/') &&
              !link.href.includes('/artist/')) {
            return;
          }

          // Try to find title - could be in link itself or nearby
          let title = "";
          const titleSelectors = [
            ".title", ".track-title", ".name", ".release-title",
            "[class*='title']", "[class*='name']"
          ];

          for (const selector of titleSelectors) {
            const titleEl = element.querySelector(selector);
            if (titleEl && titleEl.textContent.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }

          // If no title found, try link's alt attribute (for images)
          if (!title && link.querySelector('img[alt]')) {
            const img = link.querySelector('img[alt]');
            title = img.getAttribute('alt');
          }

          // If still no title, use link text but strip HTML
          if (!title && link.textContent.trim()) {
            // Create a temporary element to strip HTML
            const temp = document.createElement('div');
            temp.innerHTML = link.innerHTML;
            // Get text from alt attributes first
            const imgs = temp.querySelectorAll('img[alt]');
            if (imgs.length > 0) {
              title = imgs[0].getAttribute('alt');
            } else {
              title = temp.textContent.trim();
            }
          }

          // Try to find artist
          let artist = "";
          const artistSelectors = [
            ".artist", ".artist-name", "[class*='artist']"
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

      console.log(`📊 7digital: Found ${results.length} results`);

      await page.close();

      if (results.length === 0) {
        return { found: false, platform: "7digital", error: "No tracks found" };
      }

      const firstResult = results[0];
      console.log(`✅ 7digital: Found track: ${firstResult.title} by ${firstResult.artist}`);

      return {
        found: true,
        url: firstResult.url,
        title: firstResult.title || title,
        artist: firstResult.artist || artist,
        platform: "7digital",
      };
    } catch (error) {
      if (page) {
        await page.close();
      }

      console.error("❌ 7digital (Puppeteer) search error:", error.message);

      if (error.message.includes("timeout")) {
        console.error("   → Page load timeout");
      }

      return {
        found: false,
        platform: "7digital",
        error: `Search failed: ${error.message}`,
      };
    }
  }

  openIn7Digital(trackUrl) {
    return {
      success: true,
      platform: "7digital",
      url: trackUrl,
      action: "open_link",
    };
  }
}

module.exports = { SevenDigitalPuppeteerService };
