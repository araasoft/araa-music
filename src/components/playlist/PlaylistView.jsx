import React, { useEffect, useRef } from 'react'
import { Play, Shuffle, Heart, Download, Loader2 } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import { totalDuration } from '../../utils/format.js'
import SongRow from '../music/SongRow.jsx'

export default function PlaylistView({
  title,
  description,
  cover,
  owner,
  songs,
  round = false,
  kind = 'Playlist',
  playlistId,
  isCustom = false,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) {
  const { play } = usePlayer()
  const { toggleShuffle, shuffle } = usePlayer()
  const duration = songs.reduce((sum, s) => sum + s.duration, 0)
  const sentinelRef = useRef(null)

  // Infinite scroll: load the next 20-song batch a little before the user hits the bottom.
  useEffect(() => {
    if (!onLoadMore || !hasMore) return
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore])

  const batchMeta = playlistId ? { playlistId, isCustom, hasMore, onLoadMore } : null

  function handlePlay() {
    if (songs.length) play(songs[0], songs, batchMeta)
  }

  function handleShufflePlay() {
    if (!songs.length) return
    if (!shuffle) toggleShuffle()
    const idx = Math.floor(Math.random() * songs.length)
    play(songs[idx], songs, batchMeta)
  }

  return (
    <div className="animate-slideUp">
      <div className="relative px-4 sm:px-6 pt-4 sm:pt-8 pb-6">
        <div className="aurora-glow opacity-40">
          <span />
          <span />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
          <img
            src={cover}
            alt=""
            className={`w-40 h-40 sm:w-52 sm:h-52 object-cover shadow-2xl gradient-ring ${round ? 'rounded-full' : 'rounded-2xl'}`}
          />
          <div className="text-center sm:text-left min-w-0">
            <p className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-2">{kind}</p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2 break-words">{title}</h1>
            {description && <p className="text-sm text-[var(--text-dim)] mb-2 max-w-md">{description}</p>}
            <p className="text-sm text-[var(--text-faint)]">
              {owner} • {songs.length}{hasMore ? '+' : ''} songs • {totalDuration(duration)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 flex items-center gap-3 mb-4">
        <button
          onClick={handlePlay}
          disabled={!songs.length}
          className="w-12 h-12 rounded-full gradient-fill flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
          aria-label="Play"
        >
          <Play size={20} color="var(--on-accent)" fill="var(--on-accent)" className="ml-0.5" />
        </button>
        <button
          onClick={handleShufflePlay}
          disabled={!songs.length}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors disabled:opacity-40 ${
            shuffle ? 'text-[var(--accent-a)] border-[var(--accent-a)]' : 'border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]'
          }`}
          aria-label="Shuffle play"
        >
          <Shuffle size={17} />
        </button>
        <button
          className="w-11 h-11 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] flex items-center justify-center transition-colors"
          aria-label="Like playlist"
        >
          <Heart size={17} />
        </button>
        <button
          className="w-11 h-11 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] flex items-center justify-center transition-colors hidden sm:flex"
          aria-label="Download"
        >
          <Download size={17} />
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-4">
        {songs.map((song, i) => (
          <SongRow key={song.id} song={song} index={i + 1} list={songs} showAlbum batchMeta={batchMeta} />
        ))}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-6 text-[var(--text-faint)] text-sm gap-2">
            {loadingMore && <Loader2 size={16} className="animate-spin" />}
            {loadingMore ? 'Loading more…' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
