import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, Library, History, Heart, Music2, Plus, Settings } from 'lucide-react'
import { useAPI } from '../../context/APIContext.jsx'
import CreatePlaylist from '../playlist/CreatePlaylist.jsx'
import { showToast } from '../../utils/toast.js'

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Your library', icon: Library },
  { to: '/likes', label: 'Liked songs', icon: Heart },
  { to: '/history', label: 'History', icon: History },
]

export default function Sidebar() {
  const { playlists } = useAPI()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--bg-elev)]/60">
      <div className="px-5 pt-6 pb-4">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-fill flex items-center justify-center shrink-0">
            <Music2 size={18} color="var(--on-accent)" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">AraaMusic</span>
        </NavLink>
      </div>

      <nav className="px-3 flex flex-col gap-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--text)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={19} className={isActive ? 'text-[var(--accent-a)]' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-between px-5 mt-6 mb-2">
        <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] font-semibold">Playlists</p>
        <button
          onClick={() => setCreateOpen(true)}
          aria-label="Create playlist"
          className="p-1 rounded-full text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {playlists?.map((p) => (
          <NavLink
            key={p?.id}
            to={`/playlist/${p?.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-[var(--surface)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
              }`
            }
          >
            <img src={p?.cover} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
            <span className="truncate">{p?.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-[var(--border)]">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'bg-[var(--surface)] text-[var(--text)]' : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
            }`
          }
        >
          <Settings size={19} />
          Settings
        </NavLink>
      </div>

      <CreatePlaylist
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={() => showToast('Playlist created')}
      />
    </aside>
  )
}
