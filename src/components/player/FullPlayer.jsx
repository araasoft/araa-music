import React from 'react'
import { ChevronDown, Heart, ListMusic, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import PlayerControls from './PlayerControls.jsx'
import ProgressBar from './ProgressBar.jsx'
import VolumeControl from './VolumeControl.jsx'
import { formatCount } from '../../utils/format.js'

export default function FullPlayer() {
  const {
    currentTrack,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    toggleLike,
    isLiked,
    isQueueOpen,
    setIsQueueOpen,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = usePlayer()

  if (!isFullPlayerOpen || !currentTrack) return null
  const liked = isLiked(currentTrack.id)

  return (
    <div className="fixed inset-0 z-[95] bg-[var(--bg)] flex flex-col overflow-hidden animate-slideUp">
      <div className="aurora-glow">
        <span />
        <span />
      </div>

      <div className="relative z-10 flex items-center justify-between px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))] shrink-0">
        <button
          onClick={() => setIsFullPlayerOpen(false)}
          aria-label="Minimize player"
          className="p-2 rounded-full hover:bg-[var(--surface)] transition-colors"
        >
          <ChevronDown size={22} />
        </button>
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-dim)]">Now Playing</p>
          <p className="text-xs text-[var(--text-faint)] truncate max-w-[50vw]">{currentTrack.album}</p>
        </div>
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          aria-label="Toggle queue"
          className={`p-2 rounded-full hover:bg-[var(--surface)] transition-colors ${
            isQueueOpen ? 'text-[var(--accent-a)]' : ''
          }`}
        >
          <ListMusic size={20} />
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-4 min-h-0 overflow-y-auto">
        <img
          src={currentTrack.cover}
          alt=""
          className="w-full max-w-[min(300px,60vh)] sm:max-w-[min(380px,55vh)] aspect-square object-cover rounded-2xl shadow-2xl gradient-ring mb-6 sm:mb-8 shrink-0"
        />

        <div className="w-full max-w-md text-center mb-6">
          <div className="flex items-center justify-center gap-3">
            <h1 className="font-display text-xl sm:text-2xl font-bold truncate">{currentTrack.title}</h1>
          </div>
          <p className="text-sm text-[var(--text-dim)] mt-1 truncate">{currentTrack.artist}</p>
          <p className="text-xs text-[var(--text-faint)] mt-1">{formatCount(currentTrack.plays)} plays</p>
        </div>

        <div className="w-full max-w-md flex flex-col gap-5 shrink-0 pb-[env(safe-area-inset-bottom)]">
          <ProgressBar />
          <div className="flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              aria-label="Shuffle"
              className={`p-2 transition-colors ${shuffle ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              <Shuffle size={18} />
            </button>
            <PlayerControls size="lg" />
            <button
              onClick={cycleRepeat}
              aria-label="Repeat"
              className={`p-2 transition-colors ${repeatMode !== 'off' ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => toggleLike(currentTrack.id)}
              aria-label="Like"
              className="flex items-center gap-1.5 text-[var(--text-dim)] hover:text-[var(--accent-a)] transition-colors"
            >
              <Heart size={19} className={liked ? 'text-[var(--accent-a)]' : ''} fill={liked ? 'var(--accent-a)' : 'none'} />
            </button>
            <div className="hidden sm:block">
              <VolumeControl />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
