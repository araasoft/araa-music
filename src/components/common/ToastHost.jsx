import React, { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { subscribeToast } from '../../utils/toast.js'

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 2600)
    })
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed z-[200] bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slideUp flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-elev)] border border-[var(--border)] shadow-xl text-sm"
        >
          <CheckCircle2 size={16} className="text-[var(--accent-a)] shrink-0" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
