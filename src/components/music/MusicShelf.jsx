import React, { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MusicShelf({ title, subtitle, children, seeAll, noPadding = false }) {
  const scrollerRef = useRef(null)
  const pad = noPadding ? '' : 'px-4 sm:px-6'

  function scrollBy(dx) {
    scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  }

  return (
    <section className="mb-8">
      <div className={`flex items-end justify-between mb-3 ${pad}`}>
        <div>
          <h2 className="font-display text-lg sm:text-xl font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-[var(--text-dim)] mt-0.5">{subtitle}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {seeAll}
          <button
            onClick={() => scrollBy(-400)}
            aria-label="Scroll left"
            className="p-1.5 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent-a)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(400)}
            aria-label="Scroll right"
            className="p-1.5 rounded-full border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent-a)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className={`flex gap-1 overflow-x-auto no-scrollbar pb-1 scroll-smooth ${pad}`}>
        {children}
      </div>
    </section>
  )
}
