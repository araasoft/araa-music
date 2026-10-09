import React from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import { formatTime } from '../../utils/format.js'
import SongMenu from './SongMenu.jsx'

export default function SongRow({ song, index, list, showAlbum = false, showIndex = true, batchMeta = null }) {
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer()
  const isCurrent = currentTrack?.id === song.id

  function handleClick() {
    if (isCurrent) togglePlay()
    else play(song, list, batchMeta)
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`group flex items-center gap-3 sm:gap-4 px-2 sm:px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isCurrent ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]'
      }`}
    >
      <div className="flex items-center justify-center text-sm text-[var(--text-faint)] w-6 shrink-0">
        {isCurrent && isPlaying ? (
          <Volume2 size={15} className="text-[var(--accent-a)]" />
        ) : (
          <>
            {showIndex && <span className="group-hover:hidden">{index}</span>}
            <Play size={13} className={`hidden group-hover:block ${!showIndex ? '!block' : ''} text-[var(--text)]`} fill="currentColor" />
          </>
        )}
      </div>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img src={song.cover} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" loading="lazy" />
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isCurrent ? 'gradient-text' : 'text-[var(--text)]'}`}>{song.title}</p>
          <p className="text-xs text-[var(--text-dim)] truncate">{song.artist}</p>
        </div>
      </div>

      {showAlbum && (
        <p className="hidden md:block text-sm text-[var(--text-dim)] truncate w-40 shrink-0">{song.album}</p>
      )}

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="text-xs text-[var(--text-faint)] font-mono hidden xs:inline">{formatTime(song.duration)}</span>
        <SongMenu song={song} />
      </div>
    </div>
  )
}
