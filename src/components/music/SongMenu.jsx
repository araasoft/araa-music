import React, { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Heart, ListPlus, ListEnd, Radio } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import { showToast } from '../../utils/toast.js'

export default function SongMenu({ song }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { addToQueue, playNext, toggleLike, isLiked } = usePlayer()
  const liked = isLiked(song.id)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const items = [
    {
      label: liked ? 'Remove from Likes' : 'Save to Likes',
      icon: Heart,
      onClick: () => {
        toggleLike(song.id)
        showToast(liked ? 'Removed from Likes' : 'Added to Likes')
      },
      active: liked,
    },
    {
      label: 'Play next',
      icon: ListEnd,
      onClick: () => {
        playNext(song)
        showToast('Playing next')
      },
    },
    {
      label: 'Add to queue',
      icon: ListPlus,
      onClick: () => {
        addToQueue(song)
        showToast('Added to queue')
      },
    },
    {
      label: `Go to ${song.artist}`,
      icon: Radio,
      onClick: () => showToast(`Showing more from ${song.artist}`),
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        aria-label="More options"
        aria-haspopup="menu"
        className="p-2 rounded-full text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] shadow-2xl py-1.5 z-50 animate-popIn"
        >
          {items.map(({ label, icon: Icon, onClick, active }) => (
            <button
              key={label}
              role="menuitem"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClick()
                setOpen(false)
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-left hover:bg-[var(--surface-hover)] transition-colors"
            >
              <Icon size={16} className={active ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)]'} fill={active ? 'var(--accent-a)' : 'none'} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
