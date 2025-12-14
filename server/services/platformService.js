const { SoundeoService } = require("./platforms/SoundeoService");
const { BeatportService } = require("./platforms/BeatportService");
const { BandcampService } = require("./platforms/BandcampService");
const { TraxsourceService } = require("./platforms/TraxsourceService");
const { JunoDownloadService } = require("./platforms/JunoDownloadService");
const { VolumoService } = require("./platforms/VolumoService");
const { BleepService } = require("./platforms/BleepService");
const { SevenDigitalService } = require("./platforms/SevenDigitalService");
const { SevenDigitalPuppeteerService } = require("./platforms/SevenDigitalPuppeteerService"); // Puppeteer version
const { JunoDownloadPuppeteerService } = require("./platforms/JunoDownloadPuppeteerService"); // Puppeteer version
const { TraxsourcePuppeteerService } = require("./platforms/TraxsourcePuppeteerService"); // Puppeteer version
const { HardwaxService } = require("./platforms/HardwaxService");
const { PhonicaService } = require("./platforms/PhonicaService");
const { DecksService } = require("./platforms/DecksService");

class PlatformService {
  constructor() {
    this.soundeo = new SoundeoService();
    this.beatport = new BeatportService();
    this.bandcamp = new BandcampService();
    this.traxsource = new TraxsourceService();
    this.traxsourcePuppeteer = new TraxsourcePuppeteerService(); // Puppeteer version
    this.junodownload = new JunoDownloadService();
    this.junodownloadPuppeteer = new JunoDownloadPuppeteerService(); // Puppeteer version
    this.volumo = new VolumoService();
    this.bleep = new BleepService();
    this.sevendigital = new SevenDigitalService();
    this.sevendigitalPuppeteer = new SevenDigitalPuppeteerService(); // Puppeteer version
    this.hardwax = new HardwaxService();
    this.phonica = new PhonicaService();
    this.decks = new DecksService();
  }

  async searchAllPlatforms(artist, title) {
    const safeSearch = async (service, name) => {
      try {
        const result = await service.search(artist, title);
        return result || { found: false, platform: name };
      } catch (err) {
        console.error(`${name} search error:`, err.message);
        return { found: false, platform: name };
      }
    };

    const [
      soundeoResult,
      bandcampResult,
      beatportResult,
      // sevendigitalResult,
      // junodownloadResult,
      // traxsourceResult,
      // bleepResult, // Using Puppeteer version to bypass bot protection
      // hardwaxResult, // Commented out - returns 404 (wrong search URL)
      // phonicaResult, // Commented out - returns 307 redirect (wrong search URL)
      // decksResult, // Commented out - returns 404 (wrong search URL)
      // volumoResult, // Commented out - requires browser automation (Next.js client-side)
    ] = await Promise.all([
      safeSearch(this.soundeo, "soundeo"),
      safeSearch(this.bandcamp, "bandcamp"),
      safeSearch(this.beatport, "beatport"),
      // safeSearch(this.sevendigitalPuppeteer, "sevendigital"), // Puppeteer+Stealth - 30M+ tracks
      // safeSearch(this.junodownloadPuppeteer, "junodownload"), // Puppeteer+Stealth - 6-8M tracks
      // safeSearch(this.traxsourcePuppeteer, "traxsource"), // Puppeteer+Stealth - 1.2-1.5M tracks
      // // safeSearch(this.hardwax, "hardwax"), // Commented out - returns 404 (wrong search URL)
      // safeSearch(this.phonica, "phonica"), // Commented out - returns 307 redirect (wrong search URL)
      // safeSearch(this.decks, "decks"), // Commented out - returns 404 (wrong search URL)
      // safeSearch(this.volumo, "volumo"), // Commented out - requires browser automation
    ]);

    const results = {
      soundeo: soundeoResult,
      bandcamp: bandcampResult,
      beatport: beatportResult,
      // sevendigital: sevendigitalResult,
      // junodownload: junodownloadResult,
      // traxsource: traxsourceResult,
      // hardwax: hardwaxResult, // Commented out - returns 404 (wrong search URL)
      // phonica: phonicaResult, // Commented out - returns 307 redirect (wrong search URL)
      // decks: decksResult, // Commented out - returns 404 (wrong search URL)
      // volumo: volumoResult, // Commented out - requires browser automation
      // bleep: bleepResult, // Commented out - returns 403 Access Denied (bot protection)
      primary: null,
    };

    for (const key of [
      // "sevendigital", // 30M+ tracks - Puppeteer+Stealth
      // "junodownload", // 6-8M tracks - Puppeteer+Stealth
      // "traxsource", // 1.2-1.5M tracks - Puppeteer+Stealth
      "soundeo",
      "bandcamp",
      "beatport",
      // "hardwax", // Commented out - returns 404 (wrong search URL)
      // "phonica", // Commented out - returns 307 redirect (wrong search URL)
      // "decks", // Commented out - returns 404 (wrong search URL)
      // "volumo", // Commented out - requires browser automation
      // "bleep", // Commented out - returns 403 Access Denied (bot protection)
    ]) {
      if (results[key]?.found) {
        results.primary = { ...results[key], platform: key };
        break;
      }
    }

    return results;
  }

  openInPlatform(platform, trackUrl) {
    switch (platform) {
      case "soundeo":
        return this.soundeo.openInSoundeo(trackUrl);
      case "beatport":
        return this.beatport.openInBeatport(trackUrl);
      case "bandcamp":
        return this.bandcamp.openInBandcamp(trackUrl);
      case "traxsource":
        return this.traxsourcePuppeteer.openInTraxsource(trackUrl);
      case "volumo":
        return this.volumo.openInVolumo(trackUrl);
      case "bleep":
        return this.bleep.openInBleep(trackUrl);
      case "junodownload":
        return this.junodownloadPuppeteer.openInJuno(trackUrl);
      case "sevendigital":
        return this.sevendigitalPuppeteer.openIn7Digital(trackUrl);
      case "hardwax":
        return this.hardwax.openInHardwax(trackUrl);
      case "phonica":
        return this.phonica.openInPhonica(trackUrl);
      case "decks":
        return this.decks.openInDecks(trackUrl);
      default:
        return { success: false, error: "Unknown platform" };
    }
  }
}

module.exports = new PlatformService();
