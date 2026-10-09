import React from 'react'
import { useAPI } from '../context/APIContext.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { greeting } from '../utils/format.js'
import MusicShelf from '../components/music/MusicShelf.jsx'
import SongCard from '../components/music/SongCard.jsx'
import AlbumCard from '../components/music/AlbumCard.jsx'
import PlaylistCard from '../components/playlist/PlaylistCard.jsx'
import { usePlayer } from '../hooks/usePlayer.js'
import { Play, WifiOff } from 'lucide-react'
import Loader from '../components/common/Loader.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

export default function Home() {
  const { songs, albums, playlists, loading, error, refetch } = useAPI()
  const { user } = useAuth()
  const { play } = usePlayer()

  if (loading && !songs.length) {
    return <Loader full label="Loading your music…" />
  }

  if (error && !songs.length) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Can't reach the AraaMusic server"
        description={`Make sure the backend is running (npm run server), then try again. (${error})`}
        action={
          <button
            onClick={refetch}
            className="rounded-full gradient-fill px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ color: 'var(--on-accent)' }}
          >
            Retry
          </button>
        }
      />
    )
  }

  const quickAccess = playlists.slice(0, 3)
  const trending = [...songs].sort((a, b) => b.plays - a.plays).slice(0, 10)
  const recent = songs.slice(4, 14)
  const fresh = songs.slice(8, 18)

  return (
    <div className="pt-4 sm:pt-6 pb-4 animate-slideUp">
      <div className="relative px-4 sm:px-6 mb-8">
        <div className="aurora-glow opacity-30">
          <span />
          <span />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
            {greeting()}
            {user ? `, ${user.displayName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[var(--text-dim)]">Here's what's playing in your world.</p>
        </div>

        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
          {quickAccess.map((p) => (
            <button
              key={p?.id}
              onClick={() => {
                const list = p?.songIds?.map((id) => songs?.find((s) => s?.id === id)).filter(Boolean)
                if (list?.length) play(list[0], list)
              }}
              className="group flex items-center gap-3 rounded-lg bg-[var(--surface)]/70 hover:bg-[var(--surface)] pr-3 overflow-hidden transition-colors text-left"
            >
              <img src={p?.cover} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover shrink-0" />
              <span className="text-sm font-high truncate flex-1">{p?.title}</span>
              <Play
                size={14}
                fill="currentColor"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-a)] shrink-0"
              />
            </button>
          ))}
        </div>
      </div>

      <MusicShelf title="Trending now" subtitle="What everyone's playing this week">
        {trending?.map((s) => (
          <SongCard key={s?.id} song={s} list={trending} />
        ))}
      </MusicShelf>

      <MusicShelf title="Made for you" subtitle="Playlists tuned to your taste">
        {playlists.map((p) => (
          <PlaylistCard key={p?.id} playlist={p} />
        ))}
      </MusicShelf>

      <MusicShelf title="New releases" subtitle="Fresh albums to explore">
        {albums.map((a) => (
          <AlbumCard key={a?.id} album={a} to={`/album/${a?.id}`} />
        ))}
      </MusicShelf>

      <MusicShelf title="Recently added" subtitle="Recently added to AraaMusic">
        {recent.map((s) => (
          <SongCard key={s?.id} song={s} list={recent} />
        ))}
      </MusicShelf>

      <MusicShelf title="Because you listen to Nova Wilder" subtitle="More like what you love">
        {fresh?.map((s) => (
          <SongCard key={s?.id} song={s} list={fresh} />
        ))}
      </MusicShelf>
    </div>
  )
}
