import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api.js";
import { useAuth } from "./AuthContext.jsx";

const APIContext = createContext(null);

export function APIProvider({ children }) {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [songsRes, albumsRes, playlistsRes, artistsRes] = await Promise.all(
        [
          api.get("/catalog/songs", { auth: true }),
          api.get("/catalog/albums", { auth: true }),
          api.get("/catalog/playlists", { auth: true }),
          api.get("/catalog/artists", { auth: true }),
        ],
      );
      const song_data = songsRes;
      const album_data = albumsRes;
      const playlist_data = playlistsRes;
      const artist_data = artistsRes;

      setSongs(Object.entries(song_data.data).map(([key, data]) => data));
      setAlbums(Object.entries(album_data.data).map(([key, data]) => data));
      setPlaylists(
        Object.entries(playlist_data.data).map(([key, data]) => data),
      );
      setArtists(Object.entries(artist_data.data).map(([key, data]) => data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog, user]);

  const getSongById = useCallback(
    (id) => songs.find((s) => s.id === id),
    [songs],
  );
  const songsFor = useCallback(
    (ids = []) => ids.map(getSongById).filter(Boolean),
    [getSongById],
  );
  const getPlaylist = useCallback(
    (id) => playlists.find((p) => p.id === id),
    [playlists],
  );
  const getAlbum = useCallback(
    (id) => albums.find((a) => a.id === id),
    [albums],
  );

  const search = useCallback(async (query) => {
    if (!query || !query.trim())
      return { songs: [], albums: [], playlists: [], artists: [] };
    return api.get(`/catalog/search?q=${encodeURIComponent(query)}`, {
      auth: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      songs,
      albums,
      playlists,
      artists,
      loading,
      error,
      refetch: loadCatalog,
      getSongById,
      songsFor,
      getPlaylist,
      getAlbum,
      search,
    }),
    [
      songs,
      albums,
      playlists,
      artists,
      loading,
      error,
      loadCatalog,
      getSongById,
      songsFor,
      getPlaylist,
      getAlbum,
      search,
    ],
  );

  return <APIContext.Provider value={value}>{children}</APIContext.Provider>;
}

export function useAPI() {
  const ctx = useContext(APIContext);
  if (!ctx) throw new Error("useAPI must be used within APIProvider");
  return ctx;
}
