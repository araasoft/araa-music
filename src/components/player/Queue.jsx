import React from 'react'
import { X, GripVertical } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'
import { formatTime } from '../../utils/format.js'
import EmptyState from '../common/EmptyState.jsx'
import { ListMusic } from 'lucide-react'

export default function Queue({ onClose }) {
  const { queue, queueIndex, playAt, currentTrack } = usePlayer()
  const upcoming = queue.slice(queueIndex + 1)
  const history = queue.slice(0, queueIndex)

  return (
    <aside className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-[var(--bg-elev)] border-l border-[var(--border)] z-[999] flex flex-col animate-slideUp shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-[var(--border)] shrink-0">
        <h2 className="font-display font-semibold text-base">Queue</h2>
        <button
          onClick={onClose}
          aria-label="Close queue"
          className="p-1.5 rounded-full text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {!currentTrack ? (
          <EmptyState icon={ListMusic} title="Queue is empty" description="Play a song to start building your queue." />
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] font-semibold px-2 mb-2">
              Now playing
            </p>
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[var(--surface)] mb-4">
              <img src={currentTrack.cover} alt="" className="w-10 h-10 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate gradient-text">{currentTrack.title}</p>
                <p className="text-xs text-[var(--text-dim)] truncate">{currentTrack.artist}</p>
              </div>
              <span className="text-xs font-mono text-[var(--text-faint)]">{formatTime(currentTrack.duration)}</span>
            </div>

            {upcoming.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] font-semibold px-2 mb-2">
                  Next up
                </p>
                <div className="flex flex-col gap-0.5 mb-4">
                  {upcoming.map((song, i) => (
                    <button
                      key={`${song.id}-${i}`}
                      onClick={() => playAt(queueIndex + 1 + i)}
                      className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--surface)] text-left transition-colors"
                    >
                      <GripVertical size={14} className="text-[var(--text-faint)] shrink-0" />
                      <img src={song.cover} alt="" className="w-9 h-9 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{song.title}</p>
                        <p className="text-xs text-[var(--text-dim)] truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs font-mono text-[var(--text-faint)]">{formatTime(song.duration)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {history.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-[var(--text-faint)] font-semibold px-2 mb-2">
                  Previously played
                </p>
                <div className="flex flex-col gap-0.5 opacity-60">
                  {history.map((song, i) => (
                    <button
                      key={`${song.id}-h${i}`}
                      onClick={() => playAt(i)}
                      className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--surface)] text-left transition-colors"
                    >
                      <img src={song.cover} alt="" className="w-9 h-9 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{song.title}</p>
                        <p className="text-xs text-[var(--text-dim)] truncate">{song.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
