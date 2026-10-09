import React from 'react'
import { Volume2, Volume1, VolumeX } from 'lucide-react'
import { usePlayer } from '../../hooks/usePlayer.js'

export default function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = usePlayer()
  const effective = muted ? 0 : volume
  const Icon = effective === 0 ? VolumeX : effective < 0.5 ? Volume1 : Volume2

  return (
    <div className="flex items-center gap-2 w-32">
      <button
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="text-[var(--text-dim)] hover:text-[var(--text)] transition-colors shrink-0"
      >
        <Icon size={17} />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={(e) => setVolume(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--accent-a) ${effective * 100}%, var(--border) ${effective * 100}%)`,
        }}
        aria-label="Volume"
        className="flex-1"
      />
    </div>
  )
}
