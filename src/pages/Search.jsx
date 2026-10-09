import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon, SearchX } from 'lucide-react'
import { useAPI } from '../context/APIContext.jsx'
import { useDebounce } from '../hooks/useDebounce.js'
import SongRow from '../components/music/SongRow.jsx'
import AlbumCard from '../components/music/AlbumCard.jsx'
import PlaylistCard from '../components/playlist/PlaylistCard.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import MusicShelf from '../components/music/MusicShelf.jsx'
import Loader from '../components/common/Loader.jsx'

const genres = [
  { name: 'Indie Pop', a: '#a463ff', b: '#ff6fc7' },
  { name: 'Lo-fi', a: '#28d3c5', b: '#3fa9f5' },
  { name: 'Synthwave', a: '#ff8a4c', b: '#ff4d6d' },
  { name: 'Acoustic', a: '#ff6fa5', b: '#c893ff' },
  { name: 'Chillhop', a: '#3fb0ff', b: '#3ff0c7' },
  { name: 'Focus', a: '#7c4dff', b: '#ff5fa8' },
]

const emptyResults = { songs: [], albums: [], playlists: [], artists: [] }

export default function Search() {
  const { search } = useAPI()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const debounced = useDebounce(query, 300)
  const [results, setResults] = useState(emptyResults)
  const [searching, setSearching] = useState(false)

  const hasQuery = debounced.trim()?.length > 0
  const hasResults = results?.songs?.length || results?.albums?.length || results?.playlists?.length

  useEffect(() => {
    let cancelled = false
    if (!hasQuery) {
      setResults(emptyResults)
      return
    }
    search(debounced)
      .then((data) => {
        if (!cancelled) setResults(data.data)
      })
      .catch(() => {
        if (!cancelled) setResults(emptyResults)
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debounced, hasQuery, search])

  function handleChange(e) {
    const value = e.target.value
    setQuery(value)
    setSearchParams(value ? { q: value } : {})
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 animate-slideUp">
      <div className="relative mb-6 max-w-xl md:hidden">
        <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search songs, artists, playlists"
          className="w-full rounded-full bg-[var(--surface)] border border-[var(--border)] pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
          autoFocus
        />
      </div>

      {!hasQuery && (
        <>
          <h1 className="font-display text-xl font-semibold mb-4 hidden md:block">Search</h1>
          <p className="text-sm text-[var(--text-dim)] mb-4">Browse by mood and genre</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {genres.map((g) => (
              <button
                key={g.name}
                onClick={() => handleChange({ target: { value: g.name } })}
                className="relative h-24 rounded-xl overflow-hidden p-4 text-left font-display font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${g.a}, ${g.b})` }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}

      {hasQuery && searching && !hasResults && <Loader full label="Searching…" />}

      {hasQuery && !searching && !hasResults && (
        <EmptyState
          icon={SearchX}
          title={`No results for "${debounced}"`}
          description="Try searching for a different song, artist, or playlist name."
        />
      )}

      {hasQuery && hasResults && (
        <div className="flex flex-col gap-6">
          {results?.songs?.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-2">Songs</h2>
              <div className="flex flex-col gap-0.5">
                {results.songs.slice(0, 8).map((song, i) => (
                  <SongRow key={song.id} song={song} index={i + 1} list={results.songs} showAlbum showIndex={false} />
                ))}
              </div>
            </section>
          )}

          {results?.playlists?.length > 0 && (
            <MusicShelf title="Playlists" noPadding>
              {results.playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </MusicShelf>
          )}

          {results?.albums?.length > 0 && (
            <MusicShelf title="Albums" noPadding>
              {results.albums.map((a) => (
                <AlbumCard key={a.id} album={a} to={`/album/${a.id}`} />
              ))}
            </MusicShelf>
          )}
        </div>
      )}
    </div>
  )
}
