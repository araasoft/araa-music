import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, Settings as SettingsIcon, Heart, ListMusic, Check, Pencil } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { usePlayer } from '../hooks/usePlayer.js'
import { useAPI } from '../context/APIContext.jsx'
import { showToast } from '../utils/toast.js'

export default function Profile() {
  const { user, isAuthenticated, updateProfile, logout } = useAuth()
  const { likedIds, history } = usePlayer()
  const { playlists } = useAPI()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.displayName || '')

  if (!isAuthenticated) {
    return (
      <div className="px-4 sm:px-6 pt-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl gradient-fill flex items-center justify-center mb-5">
          <LogIn size={26} color="var(--on-accent)" />
        </div>
        <h1 className="font-display text-xl font-bold mb-2">You're not signed in</h1>
        <p className="text-sm text-[var(--text-dim)] max-w-sm mb-6">
          Sign in to see your profile, saved playlists, and listening activity.
        </p>
        <Link
          to="/login"
          className="rounded-full gradient-fill px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ color: 'var(--on-accent)' }}
        >
          Sign in
        </Link>
      </div>
    )
  }

  async function saveName() {
    if (!name.trim()) {
      setEditing(false)
      return
    }
    try {
      await updateProfile({ name: name.trim() })
      showToast('Profile updated')
    } catch (err) {
      showToast(err.message || 'Could not update profile')
    } finally {
      setEditing(false)
    }
  }

  const stats = [
    { label: 'Liked songs', value: likedIds.size, icon: Heart },
    { label: 'Playlists', value: playlists.length, icon: ListMusic },
    { label: 'Recently played', value: history.length, icon: SettingsIcon },
  ]

  return (
    <div className="px-4 sm:px-6 pt-6 sm:pt-10 pb-8 animate-slideUp max-w-2xl">
      <div className="relative flex flex-col items-center text-center mb-8">
        <div className="aurora-glow opacity-30">
          <span />
          <span />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full object-cover gradient-ring mb-4" />
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent-a)] text-center"
              />
              <button
                onClick={saveName}
                aria-label="Save name"
                className="p-2 rounded-full gradient-fill"
              >
                <Check size={15} color="var(--on-accent)" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 group">
              <h1 className="font-display text-2xl font-bold">{user.displayName}</h1>
              <Pencil size={14} className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <p className="text-sm text-[var(--text-dim)] mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 text-center">
            <Icon size={18} className="mx-auto mb-2 text-[var(--accent-a)]" />
            <p className="font-display text-lg font-bold">{value}</p>
            <p className="text-xs text-[var(--text-dim)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
        >
          <SettingsIcon size={18} className="text-[var(--text-dim)]" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition-colors text-[var(--danger)]"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  )
}
