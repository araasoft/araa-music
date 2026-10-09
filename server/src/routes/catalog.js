import { Router } from "express";
import {
  songs,
  albums,
  playlists,
  artists,
  findSong,
  findAlbum,
  findPlaylist,
  findArtist,
  songsFor,
  searchCatalog,
} from "../data/seed.js";
import getUrl from "../data/yt-dlp.js";
import {
  paginateArray,
  validatePaginationParams,
  formatResponse,
  formatError,
  cacheControl,
} from "../data/pagination-utils.js";
import {
  paginationValidator,
  searchValidator,
  idValidator,
} from "../data/api-middleware.js";

const router = Router();

router.use(cacheControl(60));

const audio = (n) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

// GET /songs
router.get("/songs/url/:id", async (req, res) => {
  const id = req.params.id;
  const ytdata = await getUrl(id);
  
  try {
    res.status(200).json({
      message: `song is : ${id}`,
      data: ytdata,
    });
  } catch (error) {
    res
      .status(500)
      .json(
        formatError("Failed to fetch songs", 500, { message: error.message }),
      );
  }
});

// GET /songs
router.get("/songs", paginationValidator, async (req, res) => {
  try {
    const { page, limit } = validatePaginationParams(req.query);
    const { data, pagination } = paginateArray(await songs(), page, limit);
    res.json(formatResponse(data, pagination));
  } catch (error) {
    res
      .status(500)
      .json(
        formatError("Failed to fetch songs", 500, { message: error.message }),
      );
  }
});

// GET /songs/:id
router.get("/songs/:id", idValidator, (req, res) => {
  const song = findSong(req.params.id);
  if (!song) return res.status(404).json(formatError("Song not found", 404));
  res.json(formatResponse(song));
});

// GET /albums
router.get("/albums", paginationValidator, async (req, res) => {
  try {
    const { page, limit } = validatePaginationParams(req.query);
    const { data, pagination } = paginateArray(await albums(), page, limit);
    res.json(formatResponse(data, pagination));
  } catch (error) {
    res
      .status(500)
      .json(
        formatError("Failed to fetch albums", 500, { message: error.message }),
      );
  }
});

// GET /albums/:id (paginated songs within the album)
router.get("/albums/:id", idValidator, paginationValidator, (req, res) => {
  const album = findAlbum(req.params.id);
  if (!album) return res.status(404).json(formatError("Album not found", 404));

  const { page, limit } = validatePaginationParams(req.query);
  const { data: pagedSongs, pagination } = paginateArray(
    songsFor(album.songIds),
    page,
    limit,
  );
  res.json(formatResponse({ ...album, songs: pagedSongs }, pagination));
});

// GET /playlists
router.get("/playlists", paginationValidator, async (req, res) => {
  try {
    const { page, limit } = validatePaginationParams(req.query);
    const { data, pagination } = paginateArray(await playlists(), page, limit);
    res.json(formatResponse(data, pagination));
  } catch (error) {
    res
      .status(500)
      .json(
        formatError("Failed to fetch playlists", 500, {
          message: error.message,
        }),
      );
  }
});

// GET /playlists/:id (paginated songs within the playlist)
router.get("/playlists/:id", idValidator, paginationValidator, (req, res) => {
  const playlist = findPlaylist(req.params.id);
  if (!playlist)
    return res.status(404).json(formatError("Playlist not found", 404));

  const { page, limit } = validatePaginationParams(req.query);
  const { data: pagedSongs, pagination } = paginateArray(
    songsFor(playlist.songIds),
    page,
    limit,
  );
  res.json(formatResponse({ ...playlist, songs: pagedSongs }, pagination));
});

// GET /artists
router.get("/artists", paginationValidator, async (req, res) => {
  try {
    const { page, limit } = validatePaginationParams(req.query);
    const { data, pagination } = paginateArray(await artists(), page, limit);
    res.json(formatResponse(data, pagination));
  } catch (error) {
    res
      .status(500)
      .json(
        formatError("Failed to fetch artists", 500, { message: error.message }),
      );
  }
});

// GET /artists/:id
router.get("/artists/:id", idValidator, (req, res) => {
  const artist = findArtist(req.params.id);
  if (!artist)
    return res.status(404).json(formatError("Artist not found", 404));
  res.json(formatResponse(artist));
});

// GET /search?q=...  (indexed lookup, not a linear scan)
router.get("/search", searchValidator, paginationValidator, async (req, res) => {
  const { page, limit = 20 } = validatePaginationParams(req.query);
  const results = await searchCatalog(req.query.q);

  const songsPage = paginateArray(results.songs, page, limit);
  const albumsPage = paginateArray(results.albums, page, limit);
  const playlistsPage = paginateArray(results.playlists, page, limit);
  const artistsPage = paginateArray(results.artists, page, limit);
  
  res.json(
    formatResponse(
      {
        songs: songsPage.data,
        albums: albumsPage.data,
        playlists: playlistsPage.data,
        artists: artistsPage.data,
      },
      null,
      {
        query: req.query.q,
        counts: {
          songs: results?.songs?.length,
          albums: results?.albums?.length,
          playlists: results?.playlists?.length,
          artists: results?.artists?.length,
        },
        page,
        limit,
      },
    ),
  );
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
