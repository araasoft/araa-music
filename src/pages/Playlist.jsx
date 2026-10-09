import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ListMusic } from 'lucide-react'
import { useAPI } from '../context/APIContext.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { loadPlaylistBatch, loadNextBatch, getCachedPlaylist } from '../lib/playlistCache.js'
import PlaylistView from '../components/playlist/PlaylistView.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import Loader from '../components/common/Loader.jsx'

const CUSTOM_KEY = 'araamusic.customPlaylists.v1'

function loadLocalCustom() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function Playlist() {
  const { id } = useParams()
  const { getPlaylist, songsFor } = useAPI()
  const { isAuthenticated } = useAuth()
  const [custom, setCustom] = useState(null)
  const [loading, setLoading] = useState(false)
  const [songs, setSongs] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const builtin = getPlaylist(id)
  const isCustom = !builtin
  const paginated = !isCustom || isAuthenticated // guest custom playlists have no server copy to paginate

  // Guest custom playlist: small, local-only, no network batching needed.
  useEffect(() => {
    if (!isCustom || isAuthenticated) return
    const local = loadLocalCustom().find((p) => p.id === id)
    setCustom(local || null)
    setSongs(local ? songsFor(local.songIds) : [])
    setHasMore(false)
  }, [id, isCustom, isAuthenticated, songsFor])

  const fetchFirstBatch = useCallback(async () => {
    setLoading(true)
    try {
      const cached = getCachedPlaylist(id, isCustom)
      const entry = cached || (await loadPlaylistBatch(id, isCustom))
      setSongs(entry.songs)
      setHasMore(entry.hasMore)
      if (isCustom) setCustom(entry.meta)
    } catch {
      if (isCustom) setCustom(null)
    } finally {
      setLoading(false)
    }
  }, [id, isCustom])

  useEffect(() => {
    if (!paginated) return
    fetchFirstBatch()
  }, [fetchFirstBatch, paginated])

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    try {
      const entry = await loadNextBatch(id, isCustom)
      if (entry) {
        setSongs(entry.songs)
        setHasMore(entry.hasMore)
      }
    } finally {
      setLoadingMore(false)
    }
  }, [id, isCustom, hasMore, loadingMore])

  if (loading) return <Loader full label="Loading playlist…" />

  if (builtin) {
    return (
      <PlaylistView
        playlistId={id}
        isCustom={false}
        title={builtin.title}
        description={builtin.description}
        cover={builtin.cover}
        owner={builtin.owner}
        songs={songs}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={handleLoadMore}
      />
    )
  }

  if (!custom) {
    return (
      <EmptyState
        icon={ListMusic}
        title="Playlist not found"
        description="This playlist may have been removed or never existed."
        action={
          <Link to="/library" className="text-sm font-medium text-[var(--accent-a)] hover:underline">
            Back to your library
          </Link>
        }
      />
    )
  }

  return (
    <PlaylistView
      playlistId={id}
      isCustom
      title={custom.title}
      description={custom.description}
      cover={custom.cover}
      owner={custom.owner}
      songs={songs}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={paginated ? handleLoadMore : undefined}
    />
  )
}
