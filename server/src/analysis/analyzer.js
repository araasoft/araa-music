// Batch song analyzer for a list of YouTube video IDs.
//
// Setup:
//   1. npm i fft-js
//   2. Create songs.js next to this file:
//        export const songs = ["id1", "id2", "id3"];
//   3. Run:  node song-batch-analyzer.js
//      Re-run the same command any time to resume.
//      Add --retry-failed to also retry songs that failed permanently.
//   Needs Node 18.15+, yt-dlp and ffmpeg in PATH.
//   Optional: COOKIES_BROWSER=chrome node song-batch-analyzer.js

import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import fft from "fft-js";
import { songs as rawSongs } from "./song.js";

/* ================================
   Settings
================================ */

const CONCURRENCY = 3; // 2-4 is safe
const CLIP_START = 45; // analyze 30s starting at 0:45...
const CLIP_LEN = 30; // ...(shifted earlier for short songs)
const MAX_ATTEMPTS = 3; // per song, for transient errors
const META_TIMEOUT_MS = 60_000;
const DL_TIMEOUT_MS = 120_000;
const FFMPEG_TIMEOUT_MS = 60_000;
const MIN_FREE_BYTES = 1024 ** 3; // stop if less than 1 GB free
const RATE_LIMIT_ABORT = 6; // consecutive rate-limit events before stopping
const EXTRACTOR_ABORT = 8; // consecutive yt-dlp extractor failures before stopping
const MAX_RATE_PAUSE_MS = 30 * 60_000;
const COOKIES_BROWSER = process.env.COOKIES_BROWSER || "";
const RETRY_FAILED = process.argv.includes("--retry-failed");

const OUT_DIR = "./analyzed";
const TMP_DIR = "./tmp_audio";
const RESULTS = path.join(OUT_DIR, "results.jsonl");
const FAILED = path.join(OUT_DIR, "failed.jsonl");
const SR = 44100;

/* ================================
   Errors
   kind: fatal | rate | extractor | permanent | transient
================================ */

class SongError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind;
  }
}

function toSongError(cmd, err, stderr) {
  const text = `${stderr}\n${err.message}`;
  const last =
    stderr
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-2)
      .join(" | ")
      .slice(0, 300) || String(err.message).slice(0, 300);

  if (err.code === "ENOENT") {
    return new SongError(
      `${cmd} not found - install it and add it to PATH`,
      "fatal",
    );
  }
  if (err.code === "ENOSPC" || /No space left on device/i.test(text)) {
    return new SongError("Disk is full", "fatal");
  }
  if (err.killed || err.signal === "SIGKILL") {
    return new SongError(`${cmd} timed out`, "transient");
  }
  if (/HTTP Error 429|Too Many Requests|not a bot|rate.?limit/i.test(text)) {
    return new SongError(`Rate limited: ${last}`, "rate");
  }
  if (
    /Video unavailable|Private video|has been removed|been terminated|not available in your country|blocked it|members-only|Join this channel|confirm your age|age-restricted|copyright|This video is not available|live event will begin|Premieres in/i.test(
      text,
    )
  ) {
    return new SongError(last, "permanent");
  }
  if (
    /Unable to extract|nsig|signature|Please report this issue|update yt-dlp|Requested format is not available|HTTP Error 403/i.test(
      text,
    )
  ) {
    return new SongError(`yt-dlp extractor problem: ${last}`, "extractor");
  }
  return new SongError(`${cmd}: ${last}`, "transient");
}

// Turns anything thrown (including our own bugs) into a SongError
function normalize(e) {
  if (e instanceof SongError) return e;
  if (["ENOSPC", "EACCES", "EPERM", "EROFS", "EMFILE"].includes(e?.code)) {
    return new SongError(`System error ${e.code}: ${e.message}`, "fatal");
  }
  if (
    e instanceof TypeError ||
    e instanceof ReferenceError ||
    e instanceof RangeError
  ) {
    return new SongError(`Bug in script: ${e.stack}`, "fatal");
  }
  return new SongError(`Unexpected: ${e?.message || e}`, "transient");
}

/* ================================
   Small helpers
================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fmt(ms) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function runCmd(
  cmd,
  args,
  { timeout, encoding = "utf8", maxBuffer = 50 * 1024 * 1024 } = {},
) {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout, encoding, maxBuffer, killSignal: "SIGKILL" },
      (err, stdout, stderr) => {
        if (!err) return resolve(stdout);
        reject(toSongError(cmd, err, String(stderr || "")));
      },
    );
  });
}

function removeDir(dir) {
  try {
    fs.rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 200,
    });
  } catch (e) {
    console.warn(`⚠️ Could not delete ${dir}: ${e.message}`);
  }
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null; // half-written last line after a crash
      }
    })
    .filter(Boolean);
}

function appendLine(file, obj) {
  try {
    fs.appendFileSync(file, JSON.stringify(obj) + "\n");
  } catch (e) {
    throw new SongError(`Cannot write ${file}: ${e.message}`, "fatal");
  }
}

function checkDisk() {
  try {
    const s = fs.statfsSync(TMP_DIR);
    if (s.bavail * s.bsize < MIN_FREE_BYTES) {
      throw new SongError(
        `Less than ${MIN_FREE_BYTES / 1024 ** 3} GB free disk space`,
        "fatal",
      );
    }
  } catch (e) {
    if (e instanceof SongError) throw e; // statfs not supported -> skip check
  }
}

/* ================================
   yt-dlp / ffmpeg
================================ */

async function getInfo(url) {
  const args = [
    "--dump-json",
    "--skip-download",
    "--no-playlist",
    "--no-warnings",
  ];
  if (COOKIES_BROWSER) args.push("--cookies-from-browser", COOKIES_BROWSER);
  args.push(url);

  const out = await runCmd("yt-dlp", args, { timeout: META_TIMEOUT_MS });
  const line = out
    .trim()
    .split("\n")
    .find((l) => l.startsWith("{"));
  if (!line) throw new SongError("yt-dlp returned no metadata", "transient");

  let info;
  try {
    info = JSON.parse(line);
  } catch {
    throw new SongError("yt-dlp returned invalid JSON", "transient");
  }
  if (info.is_live) throw new SongError("Live stream", "permanent");
  return info;
}

async function download(url, dir, start, len) {
  const args = [
    "-f",
    "bestaudio/best",
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "5",
    "-o",
    path.join(dir, "audio.%(ext)s"),
    "--no-playlist",
    "--no-warnings",
    "--quiet",
    "--socket-timeout",
    "30",
  ];
  if (len > 0) args.push("--download-sections", `*${start}-${start + len}`);
  if (COOKIES_BROWSER) args.push("--cookies-from-browser", COOKIES_BROWSER);
  args.push(url);

  await runCmd("yt-dlp", args, { timeout: DL_TIMEOUT_MS });

  const name = fs
    .readdirSync(dir)
    .find((f) => f.startsWith("audio.") && f.endsWith(".mp3"));
  if (!name) {
    throw new SongError(
      "yt-dlp finished but no mp3 was created (ffmpeg problem?)",
      "transient",
    );
  }
  const file = path.join(dir, name);
  if (fs.statSync(file).size < 10_000) {
    throw new SongError("Downloaded file is empty or too small", "transient");
  }
  return file;
}

async function getPCM(file) {
  const buf = await runCmd(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      file,
      "-t",
      String(CLIP_LEN + 5), // hard cap so memory can't blow up
      "-ac",
      "1",
      "-ar",
      String(SR),
      "-f",
      "s16le",
      "-",
    ],
    {
      timeout: FFMPEG_TIMEOUT_MS,
      encoding: "buffer",
      maxBuffer: 200 * 1024 * 1024,
    },
  );

  const n = Math.floor(buf.length / 2);
  if (n < SR * 3) {
    throw new SongError(
      `Audio too short (${(n / SR).toFixed(1)}s)`,
      "transient",
    );
  }

  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(i * 2) / 32768;
  return samples;
}

/* ================================
   Audio analysis
================================ */

function getEnergy(samples) {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / samples.length);
}

function getFrequency(samples) {
  const size = 4096;
  const hop = SR / 2;
  let bass = 0,
    mid = 0,
    high = 0;

  for (let start = 0; start + size <= samples.length; start += hop) {
    const spectrum = fft.fft(Array.from(samples.slice(start, start + size)));
    for (let i = 0; i < spectrum.length / 2; i++) {
      const f = (i * SR) / size;
      const m = Math.hypot(spectrum[i][0], spectrum[i][1]);
      if (f < 250) bass += m;
      else if (f < 4000) mid += m;
      else high += m;
    }
  }
  const total = bass + mid + high || 1;
  return { bass: bass / total, mid: mid / total, high: high / total };
}

function getBPM(samples) {
  const win = Math.floor(SR * 0.05);
  const energies = [];
  for (let i = 0; i < samples.length; i += win) {
    let v = 0;
    const end = Math.min(i + win, samples.length);
    for (let j = i; j < end; j++) v += samples[j] * samples[j];
    energies.push(v / win);
  }
  const peaks = [];
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i] > energies[i - 1] && energies[i] > energies[i + 1])
      peaks.push(i);
  }
  if (peaks.length < 2) return null;

  const intervals = [];
  for (let i = 1; i < peaks.length; i++)
    intervals.push(peaks[i] - peaks[i - 1]);
  intervals.sort((a, b) => a - b);

  let bpm = 60 / (intervals[Math.floor(intervals.length / 2)] * 0.05);
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm);
}

/* ================================
   One song: download -> analyze -> ALWAYS delete
================================ */

async function analyze(id) {
  checkDisk();

  const url = `https://www.youtube.com/watch?v=${id}`;
  const info = await getInfo(url);

  const duration = info.duration || 0;
  const len = duration > CLIP_LEN ? CLIP_LEN : 0; // 0 = download whole (short) song
  const start = len
    ? Math.max(0, Math.min(CLIP_START, Math.floor(duration - CLIP_LEN)))
    : 0;

  const dir = path.join(TMP_DIR, id); // own folder per song
  fs.mkdirSync(dir, { recursive: true });

  try {
    const file = await download(url, dir, start, len);
    const samples = await getPCM(file);

    const energy = getEnergy(samples);
    const f = getFrequency(samples);
    const bpm = getBPM(samples);

    if (![energy, f.bass, f.mid, f.high].every(Number.isFinite)) {
      throw new SongError("Analysis produced invalid numbers", "transient");
    }

    return {
      id,
      title: info.title || null,
      artist: info.artist || info.uploader || info.channel || null,
      album: info.album || null,
      duration,
      thumbnail: info.thumbnail || null,
      youtubeUrl: url,
      channel: info.channel || null,
      views: info.view_count || 0,
      audio: {
        bpm,
        energy: +energy.toFixed(4),
        bass: +f.bass.toFixed(4),
        mid: +f.mid.toFixed(4),
        high: +f.high.toFixed(4),
      },
      analyzedAt: new Date().toISOString(),
    };
  } finally {
    removeDir(dir); // removes mp3 + any .part/.webm/.m4a leftovers, even on errors
  }
}

/* ================================
   Retry / rate-limit control
================================ */

let stopping = false;
let fatalError = null;
let pauseUntil = 0;
const streak = { rate: 0, extractor: 0 };

function stop(reason) {
  if (!stopping) {
    stopping = true;
    console.log(`\n🛑 ${reason}`);
  }
}

async function waitForPause() {
  while (!stopping && Date.now() < pauseUntil) await sleep(1000);
}

// Returns { result } or { failure } or null (when shutting down). Throws only fatal errors.
async function processSong(id) {
  let attempt = 0;

  while (true) {
    if (stopping) return null;
    await waitForPause();
    if (stopping) return null;

    try {
      const result = await analyze(id);
      streak.rate = 0;
      streak.extractor = 0;
      return { result };
    } catch (e) {
      const err = normalize(e);
      if (stopping) return null; // killed by Ctrl+C / fatal elsewhere - not a real failure

      if (err.kind === "fatal") throw err;

      if (err.kind === "permanent") return { failure: err };

      if (err.kind === "rate") {
        if (Date.now() < pauseUntil) continue; // another worker already handled this event
        streak.rate++;
        if (streak.rate >= RATE_LIMIT_ABORT) {
          throw new SongError(
            `YouTube keeps rate-limiting/blocking this IP. Progress is saved - wait a few hours and re-run (or try COOKIES_BROWSER=chrome). Last error: ${err.message}`,
            "fatal",
          );
        }
        const wait = Math.min(
          MAX_RATE_PAUSE_MS,
          60_000 * 2 ** (streak.rate - 1),
        );
        pauseUntil = Date.now() + wait;
        console.log(`⏸️ Rate limited. All workers pause for ${fmt(wait)}...`);
        continue; // same song again, doesn't use an attempt
      }

      if (err.kind === "extractor") {
        streak.extractor++;
        if (streak.extractor >= EXTRACTOR_ABORT) {
          throw new SongError(
            `yt-dlp keeps failing to extract videos - it is probably outdated. Run: yt-dlp -U   then re-run. Last error: ${err.message}`,
            "fatal",
          );
        }
      }

      attempt++;
      if (attempt >= MAX_ATTEMPTS) return { failure: err };
      await sleep(3000 * attempt);
    }
  }
}

/* ================================
   Input
================================ */

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

function toId(x) {
  if (typeof x !== "string") return null;
  const s = x.trim();
  if (ID_RE.test(s)) return s;
  try {
    const u = new URL(s);
    const v =
      u.searchParams.get("v") ||
      (u.hostname === "youtu.be" ? u.pathname.slice(1) : "");
    return ID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

/* ================================
   Startup
================================ */

fs.mkdirSync(OUT_DIR, { recursive: true });
removeDir(TMP_DIR); // leftovers from a crashed run
fs.mkdirSync(TMP_DIR, { recursive: true });
process.on("exit", () => removeDir(TMP_DIR));

process.on("SIGINT", () => {
  if (stopping) process.exit(130);
  stop(
    "Stopping - unfinished songs will be redone next run (Ctrl+C again to force quit)",
  );
});
process.on("SIGTERM", () => stop("Terminated - stopping"));
process.on("unhandledRejection", (e) => {
  fatalError = normalize(e);
  stop(`Unexpected error: ${fatalError.message}`);
});

try {
  const v = await runCmd("yt-dlp", ["--version"], { timeout: 15_000 });
  await runCmd("ffmpeg", ["-version"], { timeout: 15_000 });
  console.log(`yt-dlp ${v.trim()} | ffmpeg OK`);
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exit(1);
}

const seen = new Set();
const ids = [];
const invalid = [];
let duplicates = 0;

for (const x of Array.isArray(rawSongs) ? rawSongs : []) {
  const id = toId(x);
  if (!id) invalid.push(x);
  else if (seen.has(id)) duplicates++;
  else {
    seen.add(id);
    ids.push(id);
  }
}

if (invalid.length) {
  fs.writeFileSync(
    path.join(OUT_DIR, "invalid.json"),
    JSON.stringify(invalid, null, 2),
  );
}
console.log(
  `Songs: ${ids.length} valid | ${duplicates} duplicates removed | ${invalid.length} invalid`,
);

if (!ids.length) {
  console.error(
    "❌ No valid YouTube video IDs found in songs.js (they must be 11 characters).",
  );
  process.exit(1);
}

const done = new Set(readJsonl(RESULTS).map((r) => r.id));
const permanentFails = RETRY_FAILED
  ? new Set()
  : new Set(
      readJsonl(FAILED)
        .filter((r) => r.kind === "permanent")
        .map((r) => r.id),
    );

const todo = ids.filter((id) => !done.has(id) && !permanentFails.has(id));
console.log(
  `Already done ${done.size} | skipping ${permanentFails.size} permanent failures | to do ${todo.length}\n`,
);

/* ================================
   Workers
================================ */

let next = 0,
  ok = 0,
  failed = 0;
const startedAt = Date.now();

async function worker() {
  while (!stopping && next < todo.length) {
    const id = todo[next++];

    try {
      const outcome = await processSong(id);
      if (!outcome) return;

      if (outcome.result) {
        appendLine(RESULTS, outcome.result);
        ok++;
      } else {
        const f = outcome.failure;
        appendLine(FAILED, {
          id,
          kind: f.kind,
          error: f.message,
          at: new Date().toISOString(),
        });
        failed++;
      }

      const n = ok + failed;
      const eta = ((Date.now() - startedAt) / n) * (todo.length - n);
      const status = outcome.result ? "✅" : `❌ ${outcome.failure.kind}`;
      console.log(
        `[${n}/${todo.length}] ${status} ${id} | ok ${ok} failed ${failed} | ETA ${fmt(eta)}`,
      );
    } catch (e) {
      fatalError = normalize(e);
      stop(`Fatal: ${fatalError.message}`);
      return;
    }

    await sleep(500 + Math.random() * 1000);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

/* ================================
   Finish
================================ */

try {
  const byId = new Map();
  for (const r of readJsonl(RESULTS)) byId.set(r.id, r);
  const tmp = path.join(OUT_DIR, "all.json.tmp");
  fs.writeFileSync(tmp, JSON.stringify([...byId.values()], null, 2));
  fs.renameSync(tmp, path.join(OUT_DIR, "all.json"));
  console.log(`\n📦 ${byId.size} songs saved in ${OUT_DIR}/all.json`);
} catch (e) {
  console.error(
    `❌ Could not write all.json: ${e.message} (results.jsonl is still intact)`,
  );
  process.exitCode = 1;
}

console.log(`This run: ${ok} ok, ${failed} failed. Failures are in ${FAILED}`);
if (fatalError) {
  console.error(`\n❌ Stopped early: ${fatalError.message}`);
  process.exitCode = 1;
}
