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

// Loaded once, kept in memory (read-only catalog data — safe to share).
const _artists = loadJSON("artists.json");
const _albums = loadJSON("album.json");
const _for_you = loadJSON("new_beate.json");

const _songs_raw = loadJSON("songs.json");
const _songs = Object.entries(_songs_raw).map(([key, val]) => val);

const _playlists_raw = loadJSON("playlists.json");
const _playlists = Object.entries(_playlists_raw).map(([key, val]) => val);
const _keywords = loadJSON("keywords.json");
const _indexes = loadJSON("indexes.json");

const prefixMap = new Map();
for (const keyword of Object.keys(_keywords)) {
  const word = keyword.toLowerCase().trim();

  if (!word) continue;

  const maxLength = Math.min(3, word?.length);

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

console.log(`✅ Keywords: ${Object.keys(_keywords)?.length}`);
console.log(`✅ Prefixes: ${prefixMap.size}`);

export async function findBeateSong(id) {
  try {
    const beateOfSong = _for_you?.[id];
    const dataOfSong = _songs_raw?.[id];
  } catch (error) {
    console.error("Failed beat songs:", error);
  }
}

function findMatchingKeywords(searchWord) {
  searchWord = searchWord.toLowerCase().trim();
  if (!searchWord) {
    return [];
  }
  if (searchWord?.length <= 3) {
    return prefixMap.get(searchWord) || [];
  }
  const prefix = searchWord.slice(0, 3);
  const candidates = prefixMap.get(prefix) || [];
  return candidates.filter((keyword) => keyword.startsWith(searchWord));
}

function searchSongData(query, keywordParts) {
  const scores = new Map();
  for (const searchWord of keywordParts) {
    const matchingKeywords = findMatchingKeywords(searchWord);
    for (const keyword of matchingKeywords) {
      const songIds = Object.keys(_keywords?.[keyword]?.songs || {});
      for (const songId of songIds) {
        const oldScore = scores.get(songId) || 0;
        scores.set(songId, oldScore + 1);
      }
    }
  }

  const results = [];

  for (const [songId, keywordScore] of scores) {
    const song = _songs_raw?.[songId];
    if (!song) continue;
    const title = song.title?.toLowerCase().trim() || "";
    let score = keywordScore;
    if (title === query) {
      score += 100;
    }
    if (title.startsWith(query)) {
      score += 50;
    }
    if (title.includes(query)) {
      score += 25;
    }

    const titleWords = title.split(/\s+/);
    for (const word of keywordParts) {
      if (titleWords.includes(word)) {
        score += 20;
      }
    }

    results.push({
      id: song.id || songId,
      title: song.title || "",
      cover: song.cover || "",
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function searchArtistData(query, keywordParts) {
  const scores = new Map();
  for (const searchWord of keywordParts) {
    const matchingKeywords = findMatchingKeywords(searchWord);
    for (const keyword of matchingKeywords) {
      const artistIds = Object.keys(_keywords?.[keyword]?.artists || {});
      for (const artistId of artistIds) {
        const oldScore = scores.get(artistId) || 0;
        scores.set(artistId, oldScore + 1);
      }
    }
  }

  const results = [];

  for (const [artistId, keywordScore] of scores) {
    const artist = _artists?.[artistId];
    if (!artist) continue;
    const name = (artist.name || artist.title || "").toLowerCase().trim();
    let score = keywordScore;
    if (name === query) {
      score += 100;
    }
    if (name.startsWith(query)) {
      score += 50;
    }
    if (name.includes(query)) {
      score += 25;
    }
    const nameWords = name.split(/\s+/);

    for (const word of keywordParts) {
      if (nameWords.includes(word)) {
        score += 20;
      }
    }

    results.push({
      id: artist.id || artistId,
      name: artist.name || artist.title || "",
      cover: artist.cover || artist.thumbnail || artist.image || "",
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}

function searchPlaylistData(query, keywordParts) {
  const scores = new Map();

  for (const searchWord of keywordParts) {
    const matchingKeywords = findMatchingKeywords(searchWord);

    for (const keyword of matchingKeywords) {
      const playlistIds = Object.keys(_keywords?.[keyword]?.playlists || {});

      for (const playlistId of playlistIds) {
        const oldScore = scores.get(playlistId) || 0;

        scores.set(playlistId, oldScore + 1);
      }
    }
  }

  const results = [];

  for (const [playlistId, keywordScore] of scores) {
    const playlist = _playlists_raw?.[playlistId];

    if (!playlist) continue;

    const title = (playlist.title || playlist.name || "").toLowerCase().trim();

    let score = keywordScore;

    if (title === query) {
      score += 100;
    }

    if (title.startsWith(query)) {
      score += 50;
    }

    if (title.includes(query)) {
      score += 25;
    }

    const titleWords = title.split(/\s+/);

    for (const word of keywordParts) {
      if (titleWords.includes(word)) {
        score += 20;
      }
    }

    results.push({
      ...playlist,
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

const searchSong = (req) => {
  const startTime = Date.now();

  try {
    const query = String(req || "")
      .toLowerCase()
      .trim();
    console.log("🔎 searching...", query);
    if (!query) {
      return { error: "Search query is required" };
    }

    const keywordParts = [...new Set(query.split(/\s+/).filter(Boolean))];

    const songs = searchSongData(query, keywordParts).slice(0, 50);
    const artists = searchArtistData(query, keywordParts).slice(0, 20);
    const playlists = searchPlaylistData(query, keywordParts).slice(0, 20);
    const endTime = Date.now();

    return {
      query,
      words: keywordParts,
      searchTime: `${endTime - startTime}ms`,
      songs,
      artists,
      playlists,
    };
  } catch (error) {
    console.error("❌ Search error:", error);
    return { error: "Search failed" };
  }
};

const artistById = new Map(_artists?.map((a) => [a.id, a]));
const albumById = new Map(_albums?.map((a) => [a.id, a]));
const songById = new Map(_songs?.map((s) => [s.id, s]));
const playlistById = new Map(_playlists?.map((p) => [p.id, p]));

function searchIndex(index, allItems, q) {
  const words = q.toLowerCase().split(/\W+/).filter(Boolean);
  if (words?.length === 0) return [];
  let resultSet = null;
  for (const w of words) {
    const matchedIds = new Set();
    for (const [word, items] of index) {
      if (word.includes(w)) {
        for (const item of items) matchedIds.add(item.id);
      }
    }
    resultSet =
      resultSet === null
        ? matchedIds
        : new Set([...resultSet].filter((id) => matchedIds.has(id)));
    if (resultSet.size === 0) break;
  }
  if (!resultSet || resultSet.size === 0) return [];
  return allItems.filter((i) => resultSet.has(i.id));
}

// ---- Public API (kept async to match existing route usage) ----
export const artists = async () => _artists;
export const albums = async () => _albums;
export const songs = async () => _songs;
export const playlists = async () =>
  _playlists.map((list) => {
    const songIds = _indexes?.playlists?.[list.id]?.songs ?? {};
    const filter_ids = Object.keys(songIds);
    const data = {
      ...list,
      songIds: filter_ids,
    };
    return data;
  });

export function findSong(id) {
  return songById.get(id) || null;
}
export function findAlbum(id) {
  return albumById.get(id) || null;
}

export function findPlaylist(id) {
  const playlist = playlistById.get(id);

  if (!playlist) {
    return null;
  }

  const songIds = _indexes?.playlists?.[playlist.id]?.songs ?? {};
  const filter_ids = Object.keys(songIds);

  return {
    ...playlist,
    songIds: filter_ids,
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
  const startTime = Date.now();
  const q = String(query || "").trim();
  if (!q) return { songs: [], albums: [], playlists: [], artists: [] };
  const songSearch = await searchSong(query);
  return songSearch;
}