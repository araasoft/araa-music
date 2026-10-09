import React, { useState } from 'react'
import { ListMusic } from 'lucide-react'
import Modal from '../common/Modal.jsx'
import { api } from '../../lib/api.js'

const COVER_SEEDS = ['create-1', 'create-2', 'create-3', 'create-4', 'create-5', 'create-6']

export default function CreatePlaylist({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [seed, setSeed] = useState(COVER_SEEDS[0])

  function reset() {
    setTitle('')
    setDescription('')
    setSeed(COVER_SEEDS[0])
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({
      title: title.trim(),
      description: description.trim(),
      cover: `${api.baseUrl}/covers/${seed}-${Date.now()}.svg?label=${encodeURIComponent(title.trim())}`,
    })
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Create playlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-4">
          <img
            src={`${api.baseUrl}/covers/${seed}.svg?label=${encodeURIComponent(title || seed)}`}
            alt=""
            className="w-20 h-20 rounded-lg object-cover shrink-0 gradient-ring"
          />
          <div className="flex-1 min-w-0">
            <label className="text-xs text-[var(--text-dim)] mb-1 block">Cover</label>
            <div className="flex flex-wrap gap-2">
              {COVER_SEEDS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSeed(s)}
                  className={`w-7 h-7 rounded-md overflow-hidden border-2 transition-colors ${
                    seed === s ? 'border-[var(--accent-a)]' : 'border-transparent'
                  }`}
                >
                  <img src={`${api.baseUrl}/covers/${s}.svg`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="pl-title" className="text-xs text-[var(--text-dim)] mb-1 block">
            Name
          </label>
          <input
            id="pl-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My new playlist"
            className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
          />
        </div>

        <div>
          <label htmlFor="pl-desc" className="text-xs text-[var(--text-dim)] mb-1 block">
            Description <span className="text-[var(--text-faint)]">(optional)</span>
          </label>
          <textarea
            id="pl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add an optional description"
            rows={2}
            className="w-full resize-none rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent-a)] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!title.trim()}
          className="mt-1 w-full flex items-center justify-center gap-2 rounded-full gradient-fill py-2.5 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          style={{ color: 'var(--on-accent)' }}
        >
          <ListMusic size={16} />
          Create playlist
        </button>
      </form>
    </Modal>
  )
}
