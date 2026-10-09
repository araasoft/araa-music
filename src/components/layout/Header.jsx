import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom'
import { Search, Music2, User, Settings, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { user, isAuthenticated, logout } = useAuth()
  
  useEffect(() => {
    if (location.pathname === '/search') setQuery(searchParams.get('q') || '')
    else setQuery('')
  }, [location.pathname, searchParams])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false)
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  function handleSubmit(e) {
    e.preventDefault()
    navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ''}`)
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] bg-[var(--bg)] border-b border-[var(--border)]">
      <Link to="/" className="md:hidden flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg gradient-fill flex items-center justify-center">
          <Music2 size={15} color="var(--on-accent)" />
        </div>
      </Link>

      <form onSubmit={handleSubmit} className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => location.pathname !== '/search' && navigate('/search')}
            placeholder="Search songs, artists, playlists"
            className="w-full rounded-full bg-[var(--surface)] border border-[var(--border)] pl-10 pr-4 py-2 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
            aria-label="Search"
          />
        </div>
      </form>

      <div className="relative ml-auto shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Account menu"
          className="w-9 h-9 rounded-full overflow-hidden border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] hover:border-[var(--accent-a)] transition-colors"
        >
          {isAuthenticated ? (
            <img src={user?.photoURL} alt="" className="w-full h-full object-cover" loading="lazy"/>
          ) : (
            <User size={16} className="text-[var(--text-dim)]" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] shadow-2xl py-1.5 animate-popIn">
            {isAuthenticated ? (
              <>
                <div className="px-3.5 py-2 border-b border-[var(--border)] mb-1">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-[var(--text-dim)] truncate">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <User size={16} className="text-[var(--text-dim)]" /> Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Settings size={16} className="text-[var(--text-dim)]" /> Settings
                </Link>
                <button
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                    navigate('/')
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--surface-hover)] transition-colors text-[var(--danger)]"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <LogIn size={16} className="text-[var(--text-dim)]" /> Sign in
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <Settings size={16} className="text-[var(--text-dim)]" /> Settings
                </Link>
              </>
            )}
          </div>
        )}
      </div>
      
    </header>
  )
}
