import React, { useState } from 'react'
import { usePlayer } from '../../hooks/usePlayer.js'
import { formatTime } from '../../utils/format.js'

export default function ProgressBar({ compact = false }) {
  const { currentTime, duration, seek } = usePlayer()
  const [dragValue, setDragValue] = useState(null)

  const shown = dragValue ?? currentTime
  const pct = duration ? (shown / duration) * 100 : 0

  if (compact) {
    return (
      <div className="w-full h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
        <div className="h-full gradient-fill transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[11px] font-mono text-[var(--text-faint)] w-9 text-right shrink-0">
        {formatTime(shown)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={shown}
        onChange={(e) => setDragValue(Number(e.target.value))}
        onMouseUp={(e) => {
          seek(Number(e.target.value))
          setDragValue(null)
        }}
        onTouchEnd={(e) => {
          seek(Number(e.target.value))
          setDragValue(null)
        }}
        className="flex-1 min-w-0"
        style={{
          background: `linear-gradient(to right, var(--accent-a) ${pct}%, var(--border) ${pct}%)`,
        }}
        aria-label="Seek"
      />
      <span className="text-[11px] font-mono text-[var(--text-faint)] w-9 shrink-0">{formatTime(duration)}</span>
    </div>
  )
}
