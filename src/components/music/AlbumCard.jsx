import React from 'react'
import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAPI } from '../../context/APIContext.jsx'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function AlbumCard({ album, to, round = false }) {
  const { songsFor } = useAPI()
  const { play } = usePlayer()

  function handlePlay(e) {
    e.preventDefault()
    e.stopPropagation()
    const list = songsFor(album.songIds)
    if (list.length) play(list[0], list)
  }

  return (
    <Link
      to={to}
      className="group w-[160px] sm:w-[180px] shrink-0 text-left rounded-xl p-3 hover:bg-[var(--surface)] transition-colors block"
    >
      <div className={`relative overflow-hidden aspect-square mb-3 gradient-ring ${round ? 'rounded-full' : 'rounded-lg'}`}>
        <img src={album.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
        <button
          onClick={handlePlay}
          aria-label={`Play ${album.title}`}
          className="absolute bottom-2 right-2 w-10 h-10 rounded-full gradient-fill flex items-center justify-center shadow-lg opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200"
        >
          <Play size={16} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
        </button>
      </div>
      <p className="text-sm font-medium truncate">{album.title}</p>
      <p className="text-xs text-[var(--text-dim)] truncate mt-0.5">{album.artist || album.owner}</p>
    </Link>
  )
}
