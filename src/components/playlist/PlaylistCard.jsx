import React from 'react'
import { Link } from 'react-router-dom'
import { Play, ListMusic } from 'lucide-react'
import { useAPI } from '../../context/APIContext.jsx'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function PlaylistCard({ playlist, layout = 'shelf' }) {
  const { songsFor } = useAPI()
  const { play } = usePlayer()
  
  function handlePlay(e) {
    e.preventDefault()
    e.stopPropagation()
    const list = songsFor(playlist?.songIds)
    if (list?.length) play(list[0], list)
  }

  if (layout === 'grid') {
    return (
      <Link
        to={`/playlist/${playlist.id}`}
        className="group rounded-xl p-3 bg-[var(--surface)]/60 hover:bg-[var(--surface)] transition-colors flex flex-col"
      >
        <div className="relative rounded-lg overflow-hidden aspect-square mb-3 gradient-ring">
          <img src={playlist?.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          <button
            onClick={handlePlay}
            aria-label={`Play ${playlist?.title}`}
            className="absolute bottom-2 right-2 w-10 h-10 rounded-full gradient-fill flex items-center justify-center shadow-lg opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
          >
            <Play size={16} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
          </button>
        </div>
        <p className="text-sm font-semibold truncate">{playlist?.title}</p>
        <p className="text-xs text-[var(--text-dim)] truncate mt-0.5 flex items-center gap-1">
          <ListMusic size={11} /> {playlist?.songIds?.length} songs
        </p>
      </Link>
    )
  }

  return (
    <Link
      to={`/playlist/${playlist?.id}`}
      className="group w-[160px] sm:w-[180px] shrink-0 text-left rounded-xl p-3 hover:bg-[var(--surface)] transition-colors block"
    >
      <div className="relative rounded-lg overflow-hidden aspect-square mb-3 gradient-ring">
        <img src={playlist?.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <button
          onClick={handlePlay}
          aria-label={`Play ${playlist?.title}`}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full gradient-fill flex items-center justify-center shadow-lg opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
        >
          <Play size={16} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
        </button>
      </div>
      <p className="text-sm font-medium truncate">{playlist?.title}</p>
      <p className="text-xs text-[var(--text-dim)] truncate mt-0.5">{playlist?.description || `By ${playlist?.owner}`}</p>
    </Link>
  )
}
