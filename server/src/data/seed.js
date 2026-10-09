// Catalog data loader — loads the generated JSON datasets once at startup,
// builds O(1) id-lookup maps and a lightweight inverted search index so
// every request is fast even with 20k+ songs / 10k+ artists / 8k+ albums /
// 5k+ playlists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_DIR = path.join(__dirname, "json");

function loadJSON(name) {
  const file = path.join(JSON_DIR, name);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Accepts either an array or an object keyed by id and always returns an
// array of items that have an `id`.
function toArray(raw) {
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw || {}).map(([key, val]) => ({
    ...val,
    id: val?.id ?? key,
  }));
}

/* ------------------------------------------------------------------ */
/* Load data (once, kept in memory — read-only, safe to share)        */
/* ------------------------------------------------------------------ */

const _artists_raw = loadJSON("artists.json");
const _albums_raw = loadJSON("album.json");
const _for_you = loadJSON("new_beate.json");
const _songs_raw = loadJSON("songs.json");
const _playlists_raw = loadJSON("playlists.json");
const _keywords = loadJSON("keywords.json");
const _indexes = loadJSON("indexes.json");

const _artists = toArray(_artists_raw);
const _albums = toArray(_albums_raw);
const _songs = toArray(_songs_raw);
const _playlists = toArray(_playlists_raw);

/* ------------------------------------------------------------------ */
/* Id lookup maps                                                     */
/* ------------------------------------------------------------------ */

const artistById = new Map(_artists.map((a) => [a.id, a]));
const albumById = new Map(_albums.map((a) => [a.id, a]));
const songById = new Map(_songs.map((s) => [s.id, s]));
const playlistById = new Map(_playlists.map((p) => [p.id, p]));

/* ------------------------------------------------------------------ */
/* Keyword prefix index                                               */
/* ------------------------------------------------------------------ */

const prefixMap = new Map();
for (const keyword of Object.keys(_keywords)) {
  const word = keyword.toLowerCase().trim();
  if (!word) continue;

  const maxLength = Math.min(3, word.length);

  for (let i = 1; i <= maxLength; i++) {
    const prefix = word.slice(0, i);

    let list = prefixMap.get(prefix);
    if (!list) {
      list = [];
      prefixMap.set(prefix, list);
    }
    list.push(word);
  }
}

console.log(`✅ Keywords: ${Object.keys(_keywords).length}`);
console.log(`✅ Prefixes: ${prefixMap.size}`);

/* ------------------------------------------------------------------ */
/* Random helper (refreshes lists on every request)                   */
/* ------------------------------------------------------------------ */

// Random sample without touching the shared catalog arrays.
// limit:   how many items to return (omit for all items, shuffled)
// exclude: ids to skip, e.g. what the user has already seen
function randomPick(arr, { limit, exclude } = {}) {
  let pool = arr;
  if (exclude?.length) {
    const skip = new Set(exclude);
    pool = arr.filter((x) => !skip.has(x.id));
  }

  const a = pool.slice(); // copy, never mutate the original
  const n = limit > 0 ? Math.min(limit, a.length) : a.length;

  // partial Fisher-Yates: only shuffles the first n positions
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/* ------------------------------------------------------------------ */
/* Search                                                             */
/* ------------------------------------------------------------------ */

export async function findBeateSong(id) {
  try {
    return {
      beat: _for_you?.[id] ?? null,
      song: _songs_raw?.[id] ?? songById.get(id) ?? null,
    };
  } catch (error) {
    console.error("Failed beat songs:", error);
    return null;
  }
}

function findMatchingKeywords(searchWord) {
  searchWord = searchWord.toLowerCase().trim();
  if (!searchWord) return [];

  if (searchWord.length <= 3) {
    return prefixMap.get(searchWord) || [];
  }

  const prefix = searchWord.slice(0, 3);
  const candidates = prefixMap.get(prefix) || [];
  return candidates.filter((keyword) => keyword.startsWith(searchWord));
}

// Collects keyword hit counts per id for one entity type
// ("songs" | "artists" | "playlists").
function keywordScores(keywordParts, type) {
  const scores = new Map();
  for (const searchWord of keywordParts) {
    for (const keyword of findMatchingKeywords(searchWord)) {
      const ids = Object.keys(_keywords?.[keyword]?.[type] || {});
      for (const id of ids) {
        scores.set(id, (scores.get(id) || 0) + 1);
      }
    }
  }
  return scores;
}

// Bonus points for how well a name/title matches the query.
function textScore(text, query, keywordParts) {
  let score = 0;
  if (text === query) score += 100;
  if (text.startsWith(query)) score += 50;
  if (text.includes(query)) score += 25;

  const words = text.split(/\s+/);
  for (const word of keywordParts) {
    if (words.includes(word)) score += 20;
  }
  return score;
}

function searchSongData(query, keywordParts) {
  const results = [];

  for (const [songId, keywordScore] of keywordScores(keywordParts, "songs")) {
    const song = _songs_raw?.[songId] ?? songById.get(songId);
    if (!song) continue;

    const title = song.title?.toLowerCase().trim() || "";

    results.push({
      id: song.id || songId,
      title: song.title || "",
      cover: song.cover || "",
      score: keywordScore + textScore(title, query, keywordParts),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function searchArtistData(query, keywordParts) {
  const results = [];

  for (const [artistId, keywordScore] of keywordScores(keywordParts, "artists")) {
    const artist = artistById.get(artistId);
    if (!artist) continue;

    const name = (artist.name || artist.title || "").toLowerCase().trim();

    results.push({
      id: artist.id || artistId,
      name: artist.name || artist.title || "",
      cover: artist.cover || artist.thumbnail || artist.image || "",
      score: keywordScore + textScore(name, query, keywordParts),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function searchPlaylistData(query, keywordParts) {
  const results = [];

  for (const [playlistId, keywordScore] of keywordScores(keywordParts, "playlists")) {
    const playlist = playlistById.get(playlistId);
    if (!playlist) continue;

    const title = (playlist.title || playlist.name || "").toLowerCase().trim();

    results.push({
      ...playlist,
      score: keywordScore + textScore(title, query, keywordParts),
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

const searchSong = (req) => {
  const startTime = Date.now();

  try {
    const query = String(req || "").toLowerCase().trim();
    console.log("🔎 searching...", query);
    if (!query) {
      return { error: "Search query is required" };
    }

    const keywordParts = [...new Set(query.split(/\s+/).filter(Boolean))];

    const songs = searchSongData(query, keywordParts).slice(0, 50);
    const artists = searchArtistData(query, keywordParts).slice(0, 20);
    const playlists = searchPlaylistData(query, keywordParts).slice(0, 20);

    return {
      query,
      words: keywordParts,
      searchTime: `${Date.now() - startTime}ms`,
      songs,
      artists,
      playlists,
    };
  } catch (error) {
    console.error("❌ Search error:", error);
    return { error: "Search failed" };
  }
};

/* ------------------------------------------------------------------ */
/* Public API (kept async to match existing route usage)              */
/* ------------------------------------------------------------------ */

export const artists = async () => _artists_raw;
export const albums = async () => _albums_raw;

// Random order on every call. Options: { limit, exclude }
//   songs()                              -> all songs, shuffled
//   songs({ limit: 50 })                 -> 50 random songs
//   songs({ limit: 50, exclude: [ids] }) -> 50 random songs not in `ids`
export const songs = async (opts) => randomPick(_songs, opts);

// Same options as songs(). Playlists are picked first and mapped afterwards,
// so songIds are only computed for the playlists actually returned.
export const playlists = async (opts) =>
  randomPick(_playlists, opts).map((list) => {
    const songIds = _indexes?.playlists?.[list.id]?.songs ?? {};
    return { ...list, songIds: Object.keys(songIds) };
  });

export function findSong(id) {
  return songById.get(id) || null;
}

export function findAlbum(id) {
  return albumById.get(id) || null;
}

export function findPlaylist(id) {
  const playlist = playlistById.get(id);
  if (!playlist) return null;

  const songIds = _indexes?.playlists?.[playlist.id]?.songs ?? {};
  return {
    ...playlist,
    songIds: Object.keys(songIds),
  };
}

export function findArtist(id) {
  return artistById.get(id) || null;
}

export function songsFor(ids = []) {
  const out = [];
  for (const id of ids) {
    const s = songById.get(id);
    if (s) out.push(s);
  }
  return out;
}

export async function searchCatalog(query) {
  const q = String(query || "").trim();
  if (!q) return { songs: [], albums: [], playlists: [], artists: [] };
  return searchSong(q);
}