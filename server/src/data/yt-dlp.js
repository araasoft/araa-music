import { YtDlp, helpers } from "ytdlp-nodejs";
import path from "node:path";
import fs from "node:fs";

const binaryPath = await helpers.downloadYtDlp();
const cookiesPath = process.env.YTDLP_COOKIES_PATH;

if (cookiesPath && !fs.existsSync(cookiesPath)) {
  throw new Error(`YouTube cookies file not found: ${cookiesPath}`);
}

const args = [
  "--js-runtimes",
  "node",
  "--remote-components",
  "ejs:github",
];

const ytdlp = new YtDlp({
  binaryPath,
  args,
  ...(cookiesPath ? { cookies: cookiesPath } : {}),
});


const URL_CACHE_TTL_MS =
  Number(process.env.URL_CACHE_TTL_MS) || 4 * 60 * 60 * 1000; // 4h (yt links expire ~6h)

class TTLCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key) {
    this.store.delete(key);
  }

  // periodic sweep so dead entries don't sit in memory forever
  sweep() {
    const now = Date.now();
    for (const [key, { expiresAt }] of this.store) {
      if (now > expiresAt) this.store.delete(key);
    }
  }
}

const urlCache = new TTLCache(URL_CACHE_TTL_MS);
setInterval(() => urlCache.sweep(), 10 * 60 * 1000).unref();

export default async function getUrl(id) {
  const cached = urlCache.get(id);
  if (cached) return cached;

  const url = `https://youtu.be/${id}`;

  try {
    const result = await ytdlp.getFormatsAsync(url);

    const audioFormats = result.formats.filter(
      (f) => f.acodec !== "none" && f.vcodec === "none" && f.url,
    );
    const videoFormats = result.formats.filter(
      (f) => f.vcodec !== "none" && f.acodec === "none" && f.url,
    );
    const mixedFormats = result.formats.filter(
      (f) => f.vcodec !== "none" && f.acodec !== "none" && f.url,
    );

    const audios = audioFormats
      .filter((item) => item.filesize_approx && item.abr)
      .map((item) => ({ quality: item.abr, url: item.url }));

    const videos = videoFormats
      .filter((item) => item.filesize_approx && item.height)
      .map((item) => ({
        quality: `${item.height}p`,
        height: item.height,
        width: item.width,
        fps: item.fps,
        bitrate: item.vbr,
        mimeType: item.mimeType,
        url: item.url,
      }));

    const mixed = mixedFormats
      .filter((item) => item.filesize_approx && item.height)
      .map((item) => ({
        quality: `${item.height}p`,
        height: item.height,
        width: item.width,
        fps: item.fps,
        videoBitrate: item.vbr,
        audioBitrate: item.abr,
        mimeType: item.mimeType,
        url: item.url,
      }));

    const payload = { audios, videos, mixed };
    urlCache.set(id, payload);
    return payload;
  } catch (error) {
    console.error(`getUrl failed for ${id}:`, error);
    // Don't cache failures
    return {
      error: true,
      message: "Unable to resolve this video right now.",
    };
  }
}
