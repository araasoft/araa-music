import React from 'react'
import { SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function PlayerControls({ size = 'md' }) {
  const { isPlaying, togglePlay, next, prev, shuffle, toggleShuffle, repeatMode, cycleRepeat, currentTrack, loading } =
    usePlayer()

  const big = size === 'lg'
  const playSize = big ? 26 : 18
  const sideSize = big ? 22 : 18
  const smallSize = big ? 18 : 15

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <button
        onClick={toggleShuffle}
        aria-label="Shuffle"
        aria-pressed={shuffle}
        className={`hidden sm:flex items-center justify-center transition-colors ${
          shuffle ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
        }`}
      >
        <Shuffle size={smallSize} />
      </button>

      <button
        onClick={prev}
        disabled={!currentTrack}
        aria-label="Previous"
        className="text-[var(--text)] hover:scale-110 active:scale-95 transition-transform disabled:opacity-30"
      >
        <SkipBack size={sideSize} fill="currentColor" />
      </button>

      <button
        onClick={togglePlay}
        disabled={!currentTrack}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className={`flex items-center justify-center rounded-full gradient-fill shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 ${
          big ? 'w-14 h-14' : 'w-9 h-9'
        }`}
      >
        {loading ? (
          <div
            className="rounded-full border-2 border-white/30 animate-spin"
            style={{ width: playSize * 0.7, height: playSize * 0.7, borderTopColor: 'var(--on-accent)' }}
          />
        ) : isPlaying ? (
          <Pause size={playSize} color="var(--on-accent)" fill="var(--on-accent)" />
        ) : (
          <Play size={playSize} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
        )}
      </button>

      <button
        onClick={next}
        disabled={!currentTrack}
        aria-label="Next"
        className="text-[var(--text)] hover:scale-110 active:scale-95 transition-transform disabled:opacity-30"
      >
        <SkipForward size={sideSize} fill="currentColor" />
      </button>

      <button
        onClick={cycleRepeat}
        aria-label="Repeat"
        className={`hidden sm:flex items-center justify-center transition-colors ${
          repeatMode !== 'off' ? 'text-[var(--accent-a)]' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
        }`}
      >
        {repeatMode === 'one' ? <Repeat1 size={smallSize} /> : <Repeat size={smallSize} />}
      </button>
    </div>
  )
}
