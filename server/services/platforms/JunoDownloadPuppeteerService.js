const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

class JunoDownloadPuppeteerService {
  constructor() {
    this.baseUrl = "https://www.junodownload.com";
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      console.log("🚀 JunoDownload: Launching browser...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1920,1080",
          "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ],
      });
      console.log("✅ JunoDownload: Browser launched");
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("🔒 JunoDownload: Browser closed");
    }
  }

  async search(artist, title) {
    const query = `${artist} ${title}`;
    console.log(`🔍 JunoDownload (Puppeteer): Searching for "${query}"`);

    let page = null;

    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();

      // Enhanced bot detection evasion
      await page.evaluateOnNewDocument(() => {
        // Override the navigator.webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Add chrome object
        window.chrome = {
          runtime: {},
        };

        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );

      await page.setViewport({ width: 1920, height: 1080 });

      const encodedQuery = encodeURIComponent(query);
      const url = `${this.baseUrl}/search/?q%5Ball%5D%5B%5D=${encodedQuery}`;

      console.log(`🔍 JunoDownload: Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      console.log("⏳ JunoDownload: Waiting for page to fully load...");

      // Check if we hit Cloudflare protection
      const isCloudflare = await page.evaluate(() => {
        return document.body.textContent.toLowerCase().includes('cloudflare') &&
               (document.body.textContent.toLowerCase().includes('checking your browser') ||
                document.body.textContent.toLowerCase().includes('just a moment'));
      });

      if (isCloudflare) {
        console.log("⚠️ JunoDownload: Cloudflare protection detected, waiting longer...");
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
                            bodyText.includes('no tracks found') ||
                            bodyText.includes('no products found');

        return {
          allLinks: allLinks,
          bodyPreview: document.body.textContent.substring(0, 800).replace(/\s+/g, ' '),
          url: window.location.href,
          hasNoResults: hasNoResults
        };
      });

      console.log("\n🔍 JunoDownload: Debug Info:");
      console.log("  URL:", pageInfo.url);
      console.log("  Has 'no results' message:", pageInfo.hasNoResults);
      console.log("  Sample links found:", pageInfo.allLinks.slice(0, 5));

      // Early return if no results detected
      const hasProductLinks = pageInfo.allLinks.some(link =>
        link.href.includes('/products/') || link.href.includes('/release/') || link.href.includes('/track/')
      );

      if (pageInfo.hasNoResults && !hasProductLinks) {
        console.log("❌ JunoDownload: No results found for this search");
        await page.close();
        return { found: false, platform: "junodownload", error: "No tracks found" };
      }

      // Extract search results with multiple strategies
      const results = await page.evaluate(() => {
        // Try multiple selector strategies
        let resultElements = [];

        // Strategy 1: Look for product/release links directly
        const productLinks = document.querySelectorAll(
          "a[href*='/products/'], a[href*='/release/'], a[href*='/track/']"
        );
        if (productLinks.length > 0) {
          console.log(`Found ${productLinks.length} product/release links`);
          resultElements = Array.from(productLinks);
        } else {
          // Strategy 2: Look for common container classes
          const containers = document.querySelectorAll(
            ".product, .jd-listing-item, .jq_highlight, .release, " +
            "[class*='product'], [class*='listing'], [class*='release'], [class*='track']"
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

          // Filter to only product/release/track links
          if (!link.href.includes('/products/') &&
              !link.href.includes('/release/') &&
              !link.href.includes('/track/')) {
            return;
          }

          // Try to find title
          let title = "";
          const titleSelectors = [
            ".jq_highlight", ".title", ".product-title", ".track-title",
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

      console.log(`📊 JunoDownload: Found ${results.length} results`);

      await page.close();

      if (results.length === 0) {
        return { found: false, platform: "junodownload", error: "No tracks found" };
      }

      const firstResult = results[0];
      console.log(`✅ JunoDownload: Found track: ${firstResult.title} by ${firstResult.artist}`);

      return {
        found: true,
        url: firstResult.url,
        title: firstResult.title || title,
        artist: firstResult.artist || artist,
        platform: "junodownload",
      };
    } catch (error) {
      if (page) {
        await page.close();
      }

      console.error("❌ JunoDownload (Puppeteer) search error:", error.message);

      if (error.message.includes("timeout")) {
        console.error("   → Page load timeout");
      }

      return {
        found: false,
        platform: "junodownload",
        error: `Search failed: ${error.message}`,
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

module.exports = { JunoDownloadPuppeteerService };
