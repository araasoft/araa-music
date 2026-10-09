import { helpers } from "ytdlp-nodejs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const execFileP = promisify(execFile);

/* ------------------------------------------------------------------ */
/* Config + logging                                                   */
/* ------------------------------------------------------------------ */

// Debug is ON when NODE_ENV=development, or when DEBUG_YTDLP=true.
// DEBUG_YTDLP=false silences it even in development.
const DEBUG =
  process.env.DEBUG_YTDLP != null
    ? process.env.DEBUG_YTDLP === "true"
    : process.env.NODE_ENV === "development";

// Also dump the entire raw yt-dlp JSON (very large). Only if DEBUG is on.
const DEBUG_RAW = DEBUG && process.env.DEBUG_YTDLP_RAW === "true";

const URL_CACHE_TTL_MS =
  Number(process.env.URL_CACHE_TTL_MS) || 4 * 60 * 60 * 1000; // 4h (links expire ~6h)
const YTDLP_TIMEOUT_MS = Number(process.env.YTDLP_TIMEOUT_MS) || 60_000; // cookie attempt
const FAST_TIMEOUT_MS = Number(process.env.YTDLP_FAST_TIMEOUT_MS) || 25_000; // no-cookie attempt
const MAX_CONCURRENT = Number(process.env.YTDLP_MAX_CONCURRENT) || 2; // free Render CPU is tiny
const COOKIE_ONLY_MS = 10 * 60 * 1000; // after a "bot" error, skip the no-cookie attempt for 10 min
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const ts = () => new Date().toISOString();
const debug = (step, ...args) => {
  if (DEBUG) console.log(`[${ts()}] [yt-dlp:debug] [${step}]`, ...args);
};
const info = (step, ...args) => console.log(`[${ts()}] [yt-dlp] [${step}]`, ...args);
const warn = (step, ...args) => console.warn(`[${ts()}] [yt-dlp:warn] [${step}]`, ...args);
const error = (step, ...args) => console.error(`[${ts()}] [yt-dlp:error] [${step}]`, ...args);

info("config", {
  debug: DEBUG,
  debugRaw: DEBUG_RAW,
  nodeEnv: process.env.NODE_ENV || "(unset)",
  platform: process.platform,
  cacheTtlMs: URL_CACHE_TTL_MS,
  fastTimeoutMs: FAST_TIMEOUT_MS,
  cookieTimeoutMs: YTDLP_TIMEOUT_MS,
  maxConcurrent: MAX_CONCURRENT,
});

/* ------------------------------------------------------------------ */
/* Setup: binary + cookies + yt-dlp cache dir                         */
/* ------------------------------------------------------------------ */

debug("setup", "downloading/locating yt-dlp binary...");
const binaryPath = await helpers.downloadYtDlp();
try {
  fs.chmodSync(binaryPath, 0o755);
} catch (e) {
  debug("setup", "chmod skipped:", e.message);
}
info("setup", "binary:", binaryPath);

// Render secret files are read-only, but yt-dlp rewrites the cookie file on
// exit. Work on a writable copy in the OS temp dir (works on Windows + Linux).
const secretCookiesPath = process.env.YTDLP_COOKIES_PATH;
let cookiesPath = null;

debug("setup", "YTDLP_COOKIES_PATH =", secretCookiesPath || "(unset)");

if (secretCookiesPath && fs.existsSync(secretCookiesPath)) {
  cookiesPath = path.join(os.tmpdir(), "ytdlp-cookies.txt");
  fs.copyFileSync(secretCookiesPath, cookiesPath);
  try {
    fs.chmodSync(cookiesPath, 0o600);
  } catch {
    /* not meaningful on Windows */
  }
  info("setup", "cookies copied:", secretCookiesPath, "->", cookiesPath);
  debug("setup", "cookie file size (bytes):", fs.statSync(cookiesPath).size);
} else {
  warn(
    "setup",
    `cookies not found (YTDLP_COOKIES_PATH=${secretCookiesPath || "unset"}). Running without cookies.`,
  );
}

// Lets yt-dlp keep the downloaded player/signature data between requests.
const cacheDir = path.join(os.tmpdir(), "yt-dlp-cache");
debug("setup", "yt-dlp cache dir:", cacheDir);

/* ------------------------------------------------------------------ */
/* TTL cache                                                          */
/* ------------------------------------------------------------------ */

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

  sweep() {
    const now = Date.now();
    let removed = 0;
    for (const [key, { expiresAt }] of this.store) {
      if (now > expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    debug("cache", `sweep removed ${removed}, ${this.store.size} remaining`);
  }
}

const urlCache = new TTLCache(URL_CACHE_TTL_MS);
setInterval(() => urlCache.sweep(), 10 * 60 * 1000).unref();

// Requests currently being resolved, so duplicates share one yt-dlp process.
const inflight = new Map();

/* ------------------------------------------------------------------ */
/* Concurrency limiter (keeps a small CPU from being overloaded)      */
/* ------------------------------------------------------------------ */

let active = 0;
const waiters = [];

async function acquire() {
  if (active < MAX_CONCURRENT) {
    active++;
    debug("queue", `slot acquired (${active}/${MAX_CONCURRENT})`);
    return;
  }
  debug("queue", `waiting for a slot (${waiters.length + 1} queued)`);
  await new Promise((resolveSlot) => waiters.push(resolveSlot));
  debug("queue", "slot handed over");
}

function release() {
  const next = waiters.shift();
  if (next) next(); // hand the slot straight to the next waiter
  else active--;
  debug("queue", `slot released (${active}/${MAX_CONCURRENT} active, ${waiters.length} queued)`);
}

/* ------------------------------------------------------------------ */
/* yt-dlp                                                             */
/* ------------------------------------------------------------------ */

function lastYtdlpError(stderr = "") {
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("ERROR:"));
  return lines.length ? lines[lines.length - 1] : null;
}

const BOT_ERROR_RE = /sign in to confirm|not a bot|use --cookies|cookies/i;
let cookieOnlyUntil = 0; // timestamp until which we skip the no-cookie attempt

async function runYtdlp(url, useCookies, timeoutMs) {
  const withCookies = Boolean(useCookies && cookiesPath);

  const args = [
    "--js-runtime",
    "node",
    "--cache-dir",
    cacheDir,
    ...(withCookies ? ["--cookies", cookiesPath] : []),
    "--dump-single-json",
    "--no-playlist",
    // In debug mode we want yt-dlp's full verbose output and its warnings.
    ...(DEBUG ? ["--verbose"] : ["--no-warnings"]),
    "--", // everything after this is a URL, never an option
    url,
  ];

  debug("exec", `cookies=${withCookies} timeout=${timeoutMs}ms`);
  debug("exec", "command:", binaryPath, args.join(" "));

  await acquire();
  const started = Date.now();
  try {
    const { stdout, stderr } = await execFileP(binaryPath, args, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: timeoutMs,
    });

    info("exec", `yt-dlp finished in ${Date.now() - started}ms (cookies=${withCookies})`);
    debug("exec", `stdout ${stdout.length} bytes`);

    if (stderr) {
      if (DEBUG) debug("exec", "yt-dlp stderr (verbose):\n" + stderr.trim());
      else warn("exec", "yt-dlp stderr:", stderr.trim());
    }

    const parsed = JSON.parse(stdout);
    debug("exec", "JSON parsed OK");
    return parsed;
  } catch (err) {
    warn("exec", `yt-dlp failed after ${Date.now() - started}ms (cookies=${withCookies})`);
    debug("exec", "failure details:", {
      code: err.code,
      killed: err.killed,
      signal: err.signal,
    });
    const ytError = lastYtdlpError(err.stderr);
    const e = new Error(ytError || err.message || "yt-dlp failed");
    e.stderr = err.stderr;
    e.stdout = err.stdout;
    e.code = err.code;
    e.killed = err.killed; // true when the timeout fired
    throw e;
  } finally {
    release();
  }
}

// Fast path first (no cookies), then fall back to the slower cookie path.
async function fetchInfo(url) {
  const cookiesAvailable = Boolean(cookiesPath);

  if (cookiesAvailable && Date.now() < cookieOnlyUntil) {
    debug("strategy", "recent bot-check seen: going straight to cookies");
    return runYtdlp(url, true, YTDLP_TIMEOUT_MS);
  }

  try {
    debug("strategy", "attempt 1: no cookies (fast path)");
    return await runYtdlp(url, false, FAST_TIMEOUT_MS);
  } catch (firstErr) {
    if (!cookiesAvailable) throw firstErr;

    const text = `${firstErr.message} ${firstErr.stderr || ""}`;
    if (BOT_ERROR_RE.test(text)) {
      cookieOnlyUntil = Date.now() + COOKIE_ONLY_MS;
      warn("strategy", `bot-check detected, skipping no-cookie attempts for ${COOKIE_ONLY_MS / 60000} min`);
    }

    warn("strategy", `no-cookie attempt failed (${firstErr.message}); retrying with cookies`);
    debug("strategy", "attempt 2: with cookies");
    return runYtdlp(url, true, YTDLP_TIMEOUT_MS);
  }
}

/* ------------------------------------------------------------------ */
/* Format parsing                                                     */
/* ------------------------------------------------------------------ */

function formatPayload(data) {
  const all = data.formats || [];
  debug("formats", `yt-dlp returned ${all.length} formats`);

  const formats = all.filter(
    (f) =>
      f.url &&
      // skip storyboards and non-direct streams
      !String(f.format_id || "").startsWith("sb") &&
      f.protocol !== "mhtml" &&
      (f.protocol === "https" || f.protocol === "http"),
  );
  debug("formats", `${formats.length} direct http(s) formats after filtering`);

  const hasAudio = (f) => f.acodec && f.acodec !== "none";
  const hasVideo = (f) => f.vcodec && f.vcodec !== "none";

  const audios = formats
    .filter((f) => hasAudio(f) && !hasVideo(f))
    .map((f) => ({
      quality: Math.round(f.abr || f.tbr || 0),
      ext: f.ext || f.audio_ext,
      codec: f.acodec,
      filesize: f.filesize || f.filesize_approx || null,
      url: f.url,
    }))
    .sort((a, b) => b.quality - a.quality);

  const videos = formats
    .filter((f) => hasVideo(f) && !hasAudio(f) && f.height)
    .map((f) => ({
      quality: `${f.height}p`,
      height: f.height,
      width: f.width,
      fps: f.fps,
      bitrate: f.vbr || f.tbr || null,
      ext: f.ext || f.video_ext,
      codec: f.vcodec,
      url: f.url,
    }))
    .sort((a, b) => b.height - a.height);

  const mixed = formats
    .filter((f) => hasVideo(f) && hasAudio(f) && f.height)
    .map((f) => ({
      quality: `${f.height}p`,
      height: f.height,
      width: f.width,
      fps: f.fps,
      videoBitrate: f.vbr || null,
      audioBitrate: f.abr || null,
      ext: f.ext,
      url: f.url,
    }))
    .sort((a, b) => b.height - a.height);

  debug("formats", `audios=${audios.length} videos=${videos.length} mixed=${mixed.length}`);
  if (DEBUG) {
    debug("formats", "audio list:", audios.map((a) => `${a.quality}kbps ${a.ext}/${a.codec}`));
    debug("formats", "video list:", videos.map((v) => `${v.quality}${v.fps ? "@" + v.fps : ""} ${v.ext}/${v.codec}`));
    debug("formats", "mixed list:", mixed.map((m) => `${m.quality} ${m.ext}`));
  }

  return { audios, videos, mixed };
}

/* ------------------------------------------------------------------ */
/* Resolve                                                            */
/* ------------------------------------------------------------------ */

async function resolve(id) {
  const url = `https://youtu.be/${id}`;
  info("resolve", `resolving ${id}`);

  const data = await fetchInfo(url);

  debug("resolve", "video info:", {
    id: data.id,
    title: data.title,
    uploader: data.uploader,
    duration: data.duration,
    live_status: data.live_status,
    availability: data.availability,
    extractor: data.extractor_key,
    formatCount: data.formats?.length ?? 0,
  });
  if (DEBUG_RAW) debug("resolve", "RAW JSON:", JSON.stringify(data, null, 2));

  const payload = formatPayload(data);

  if (!payload.audios.length && !payload.videos.length && !payload.mixed.length) {
    throw new Error("yt-dlp returned no playable direct formats");
  }

  urlCache.set(id, payload);
  debug("cache", `stored ${id} (ttl ${URL_CACHE_TTL_MS}ms), size now ${urlCache.store.size}`);
  return payload;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export default async function getUrl(id) {
  debug("getUrl", "called with id:", id);

  if (typeof id !== "string" || !VIDEO_ID_RE.test(id)) {
    warn("getUrl", "invalid video id:", id);
    return { error: true, message: "Invalid video id." };
  }

  const cached = urlCache.get(id);
  if (cached) {
    debug("cache", `HIT ${id}`);
    return cached;
  }
  debug("cache", `MISS ${id}`);

  if (inflight.has(id)) {
    debug("inflight", `joining existing request for ${id}`);
    return inflight.get(id);
  }

  const started = Date.now();
  const promise = resolve(id)
    .then((result) => {
      info("getUrl", `resolved ${id} in ${Date.now() - started}ms`);
      return result;
    })
    .catch((err) => {
      error("getUrl", `extraction failed for ${id} after ${Date.now() - started}ms:`, err.message);
      if (err.killed) error("getUrl", "yt-dlp timed out");
      if (err.stderr) error("getUrl", "yt-dlp stderr:\n" + err.stderr);
      if (DEBUG && err.stack) debug("getUrl", "stack:", err.stack);

      // Errors are not cached, so the next request retries.
      return {
        error: true,
        message: "Unable to resolve this video right now.",
      };
    })
    .finally(() => {
      inflight.delete(id);
      debug("inflight", `cleared ${id}`);
    });

  inflight.set(id, promise);
  return promise;
}

/**
 * Warm the cache for songs the user is likely to play next.
 * Fire and forget: `prefetch(["id1", "id2"]);` (no await needed).
 * Runs one at a time, skips cached ids, never throws.
 */
export async function prefetch(ids = [], max = 3) {
  const list = [...new Set(ids)].filter((id) => VIDEO_ID_RE.test(id)).slice(0, max);
  debug("prefetch", "requested:", list);

  for (const id of list) {
    if (urlCache.get(id) || inflight.has(id)) {
      debug("prefetch", `skip ${id} (already cached or in flight)`);
      continue;
    }
    try {
      await getUrl(id);
    } catch (e) {
      debug("prefetch", `failed ${id}:`, e.message);
    }
  }
}