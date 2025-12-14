const puppeteer = require("puppeteer");

class BleepPuppeteerService {
  constructor() {
    this.baseUrl = "https://bleep.com";
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      console.log("🚀 Bleep: Launching browser...");
      this.browser = await puppeteer.launch({
        headless: true, // Run in background (set to false to see browser)
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled", // Hide automation
        ],
      });
      console.log("✅ Bleep: Browser launched");
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("🔒 Bleep: Browser closed");
    }
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 Bleep (Puppeteer): Searching for "${query}"`);

    let page = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Set user agent to look like a real browser
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      // Set viewport size (important for some sites)
      await page.setViewport({ width: 1920, height: 1080 });

      // Build search URL
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search?q=${encodedQuery}`;

      console.log(`🔍 Bleep: Navigating to ${url}`);

      // Navigate and wait for network to be idle
      await page.goto(url, {
        waitUntil: "networkidle2", // Wait until network is idle (all requests finished)
        timeout: 30000,
      });

      console.log("⏳ Bleep: Waiting for search results to load...");

      // Wait for search results to appear (adjust selector based on actual site structure)
      try {
        await page.waitForSelector(
          ".search-result, .track, .release, .product, [class*='search-result']",
          { timeout: 10000 }
        );
        console.log("✅ Bleep: Search results found");
      } catch (err) {
        console.log("⚠️ Bleep: No search results found within timeout");
        await page.close();
        return { found: false, platform: "bleep", error: "No search results found" };
      }

      // Extract search results using page.evaluate() to run code in the browser context
      const results = await page.evaluate(() => {
        // This code runs in the browser context, not Node.js
        const resultElements = document.querySelectorAll(
          ".search-result, .track, .release, .product, [class*='search-result']"
        );

        if (resultElements.length === 0) {
          return [];
        }

        const extractedResults = [];

        resultElements.forEach((element, index) => {
          // Try to find link, title, and artist within each result
          const link = element.querySelector("a[href*='/release/'], a[href*='/product/'], a");
          const titleElement = element.querySelector(".title, .track-title, [class*='title']");
          const artistElement = element.querySelector(".artist, [class*='artist']");

          if (link) {
            extractedResults.push({
              url: link.href,
              title: titleElement ? titleElement.textContent.trim() : "",
              artist: artistElement ? artistElement.textContent.trim() : "",
            });
          }
        });

        return extractedResults;
      });

      console.log(`📊 Bleep: Found ${results.length} results`);

      // Close the page
      await page.close();

      if (results.length === 0) {
        return { found: false, platform: "bleep", error: "No tracks found" };
      }

      // Return the first result
      const firstResult = results[0];
      console.log(`✅ Bleep: Found track: ${firstResult.title} by ${firstResult.artist}`);

      return {
        found: true,
        url: firstResult.url,
        title: firstResult.title || title,
        artist: firstResult.artist || artist,
        platform: "bleep",
      };
    } catch (error) {
      if (page) {
        await page.close();
      }

      console.error("❌ Bleep (Puppeteer) search error:", error.message);

      if (error.message.includes("timeout")) {
        console.error("   → Page load timeout - site may be slow or blocking");
      }

      return {
        found: false,
        platform: "bleep",
        error: `Search failed: ${error.message}`,
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

module.exports = { BleepPuppeteerService };
