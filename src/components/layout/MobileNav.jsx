import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, Library, Heart } from 'lucide-react'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/likes', label: 'Likes', icon: Heart },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[85] h-14 bg-[var(--bg-elev)] border-t border-[var(--border)] flex items-stretch pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              isActive ? 'text-[var(--accent-a)]' : 'text-[var(--text-faint)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={19} fill={isActive ? 'var(--accent-a)' : 'none'} strokeWidth={isActive ? 2.2 : 2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
