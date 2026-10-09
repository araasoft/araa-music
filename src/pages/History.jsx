import React from 'react'
import { History as HistoryIcon } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer.js'
import SongRow from '../components/music/SongRow.jsx'
import EmptyState from '../components/common/EmptyState.jsx'

function dayLabel(ts) {
  const date = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(date, today)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

export default function History() {
  const { history } = usePlayer()

  if (!history.length) {
    return (
      <div className="px-4 sm:px-6 pt-6">
        <h1 className="font-display text-xl sm:text-2xl font-bold mb-6">History</h1>
        <EmptyState
          icon={HistoryIcon}
          title="Nothing played yet"
          description="Songs you play will show up here so you can find them again."
        />
      </div>
    )
  }

  const groups = []
  for (const track of history) {
    const label = dayLabel(track.playedAt)
    let group = groups.find((g) => g.label === label)
    if (!group) {
      group = { label, tracks: [] }
      groups.push(group)
    }
    group.tracks.push(track)
  }

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-6 animate-slideUp">
      <h1 className="font-display text-xl sm:text-2xl font-bold mb-6">History</h1>
      {groups.map((group) => (
        <section key={group.label} className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-[var(--text-faint)] font-semibold mb-2 px-1">
            {group.label}
          </h2>
          <div className="flex flex-col gap-0.5">
            {group.tracks.map((song, i) => (
              <SongRow
                key={`${song.id}-${song.playedAt}`}
                song={song}
                index={i + 1}
                list={group.tracks}
                showAlbum
                showIndex={false}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
