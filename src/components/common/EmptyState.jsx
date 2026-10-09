import React from 'react'

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-slideUp">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl gradient-fill flex items-center justify-center mb-5 opacity-90">
          <Icon size={28} color="var(--on-accent)" />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold mb-1.5">{title}</h3>
      {description && <p className="text-sm text-[var(--text-dim)] max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
