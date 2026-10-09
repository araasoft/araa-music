import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAPI } from '../context/APIContext.jsx'
import PlaylistView from '../components/playlist/PlaylistView.jsx'
import EmptyState from '../components/common/EmptyState.jsx'
import { Disc3 } from 'lucide-react'

export default function Album() {
  const { id } = useParams()
  const { getAlbum, songsFor } = useAPI()
  const album = getAlbum(id)

  if (!album) {
    return (
      <EmptyState
        icon={Disc3}
        title="Album not found"
        description="This album may have been removed."
        action={
          <Link to="/" className="text-sm font-medium text-[var(--accent-a)] hover:underline">
            Back to home
          </Link>
        }
      />
    )
  }

  const songs = songsFor(album.songIds)

  return (
    <PlaylistView
      title={album.title}
      description={null}
      cover={album.cover}
      owner={album.artist}
      songs={songs}
    />
  )
}
