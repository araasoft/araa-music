import React from 'react'

export default function Loader({ size = 24, full = false, label="Loading...", height=50 }) {
  const spinner = (
    <div className={`w-full h-[${height}dvh] flex flex-ro items-center justify-center gap-3`}>
      <div
        className="rounded-full border-2 border-[var(--border)] animate-spin"
        style={{
          width: size,
          height: size,
          borderTopColor: 'var(--accent-a)',
          borderRightColor: 'var(--accent-b)',
        }}
      />
      {label && <p className="text-sm text-[var(--text-dim)]">{label}</p>}
    </div>
  )

  if (!full) return spinner

  return <div className="flex items-center justify-center w-full h-full py-24">{spinner}</div>
}
