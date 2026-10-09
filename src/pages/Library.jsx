import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Heart, History as HistoryIcon, Grid2x2, List, ListMusic } from 'lucide-react'
import { useAPI } from '../context/APIContext.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { api } from '../lib/api.js'
import PlaylistCard from '../components/playlist/PlaylistCard.jsx'
import CreatePlaylist from '../components/playlist/CreatePlaylist.jsx'
import Loader from '../components/common/Loader.jsx'
import { showToast } from '../utils/toast.js'

const CUSTOM_KEY = 'araamusic.customPlaylists.v1'

function loadLocalCustom() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalCustom(list) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
  } catch {
    // storage unavailable — custom playlists stay in-memory only
  }
}

export default function Library() {
  const { playlists } = useAPI()
  const { isAuthenticated } = useAuth()
  const [custom, setCustom] = useState([])
  const [customLoading, setCustomLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState('grid')

  const loadCustom = useCallback(async () => {
    setCustomLoading(true)
    if (isAuthenticated) {
      try {
        const remote = await api.get('/me/playlists')
        setCustom(remote)
      } catch {
        setCustom([])
      }
    } else {
      setCustom(loadLocalCustom())
    }
    setCustomLoading(false)
  }, [isAuthenticated])

  useEffect(() => {
    loadCustom()
  }, [loadCustom])

  async function handleCreate(data) {
    if (isAuthenticated) {
      try {
        const created = await api.post('/me/playlists', data)
        setCustom((prev) => [created, ...prev])
        showToast('Playlist created')
      } catch (err) {
        showToast(err.message || 'Could not create playlist')
      }
    } else {
      const playlist = { id: `local-${Date.now()}`, songIds: [], owner: 'You', ...data }
      const next = [playlist, ...custom]
      setCustom(next)
      saveLocalCustom(next)
      showToast('Playlist created (saved on this device)')
    }
  }

  const allPlaylists = [...custom, ...playlists]

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 animate-slideUp">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl sm:text-2xl font-bold">Your library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
            aria-label="Toggle view"
            className="p-2 rounded-full text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
          >
            {view === 'grid' ? <List size={17} /> : <Grid2x2 size={17} />}
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-full gradient-fill pl-3 pr-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ color: 'var(--on-accent)' }}
          >
            <Plus size={16} /> Create
          </button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 px-4 py-3 mb-5 text-sm text-[var(--text-dim)]">
          <Link to="/login" className="text-[var(--accent-a)] font-medium hover:underline">
            Sign in
          </Link>{' '}
          to sync playlists you create across devices. For now they're saved on this device only.
        </div>
      )}

      <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar">
        <Link
          to="/likes"
          className="flex items-center gap-3 shrink-0 rounded-xl bg-gradient-to-br from-[var(--accent-a)] to-[var(--accent-b)] px-4 py-3 min-w-[160px]"
        >
          <Heart size={20} color="var(--on-accent)" fill="var(--on-accent)" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--on-accent)' }}>Liked Songs</p>
          </div>
        </Link>
        <Link
          to="/history"
          className="flex items-center gap-3 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 min-w-[160px] hover:border-[var(--accent-a)] transition-colors"
        >
          <HistoryIcon size={20} className="text-[var(--text-dim)]" />
          <p className="text-sm font-semibold">History</p>
        </Link>
      </div>

      {customLoading ? (
        <Loader full label="Loading your library…" />
      ) : allPlaylists.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16">
          <div className="w-16 h-16 rounded-2xl gradient-fill flex items-center justify-center mb-5">
            <ListMusic size={28} color="var(--on-accent)" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1.5">Build your first playlist</h3>
          <p className="text-sm text-[var(--text-dim)] max-w-sm mb-5">
            It's easy — give it a name and start adding songs you love.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-full gradient-fill px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ color: 'var(--on-accent)' }}
          >
            Create playlist
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {allPlaylists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} layout="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {allPlaylists.map((p) => (
            <Link key={p.id} to={`/playlist/${p.id}`} className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity">
              <img src={p.cover} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.title}</p>
                <p className="text-xs text-[var(--text-dim)] truncate">{p.songIds.length} songs • {p.owner}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreatePlaylist open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  )
}
