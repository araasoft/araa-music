import React from 'react'
import { Heart, ListMusic, Maximize2 } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import PlayerControls from './PlayerControls.jsx'
import ProgressBar from './ProgressBar.jsx'
import VolumeControl from './VolumeControl.jsx'

export default function MiniPlayer() {
  const { currentTrack, isFullPlayerOpen, setIsFullPlayerOpen, isQueueOpen, setIsQueueOpen, toggleLike, isLiked } =
    usePlayer()

  if (!currentTrack) return null

  const liked = isLiked(currentTrack.id)

  return (
    <div
      className={`fixed bottom-14 md:bottom-0 left-0 right-0 z-[80] border-t border-[var(--border)] bg-[var(--bg-elev)] transition-transform pb-[env(safe-area-inset-bottom)] md:pb-0 ${
        isFullPlayerOpen ? 'translate-y-full md:translate-y-0 md:opacity-0 md:pointer-events-none' : ''
      }`}
    >
      <div className="md:hidden px-3 pt-1.5">
        <ProgressBar compact />
      </div>
      <div className="flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3">
        <button
          onClick={() => setIsFullPlayerOpen(true)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left"
          aria-label="Open now playing"
        >
          <img src={currentTrack.cover} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-[var(--text-dim)] truncate">{currentTrack.artist}</p>
          </div>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleLike(currentTrack.id)
          }}
          aria-label="Like"
          className="hidden xs:flex text-[var(--text-dim)] hover:text-[var(--accent-a)] transition-colors shrink-0"
        >
          <Heart size={18} className={liked ? 'text-[var(--accent-a)]' : ''} fill={liked ? 'var(--accent-a)' : 'none'} />
        </button>

        <PlayerControls />

        <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
          <div className="w-52 max-w-[30vw]">
            <ProgressBar />
          </div>
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            aria-label="Toggle queue"
            className={`transition-colors ${isQueueOpen ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
          >
            <ListMusic size={18} />
          </button>
          <VolumeControl />
          <button
            onClick={() => setIsFullPlayerOpen(true)}
            aria-label="Expand player"
            className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
