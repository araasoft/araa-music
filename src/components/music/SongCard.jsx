import React from 'react'
import { Play, Pause } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function SongCard({ song, list }) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer()
  const isCurrent = currentTrack?.id === song.id

  function handleClick() {
    if (isCurrent) togglePlay()
    else play(song, list)
  }

  return (
    <button
      onClick={handleClick}
      className="group w-[160px] sm:w-[180px] shrink-0 text-left rounded-xl p-3 hover:bg-[var(--surface)] transition-colors"
    >
      <div className="relative rounded-lg overflow-hidden aspect-square mb-3 gradient-ring">
        <img src={song.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <div
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full gradient-fill flex items-center justify-center shadow-lg transition-all duration-200 ${
            isCurrent ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause size={16} color="var(--on-accent)" fill="var(--on-accent)" />
          ) : (
            <Play size={16} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
          )}
        </div>
      </div>
      <p className={`text-sm font-medium truncate ${isCurrent ? 'gradient-text' : 'text-[var(--text)]'}`}>
        {song.title}
      </p>
      <p className="text-xs text-[var(--text-dim)] truncate mt-0.5">{song.artist}</p>
    </button>
  )
}
