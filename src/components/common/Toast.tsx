import { useEffect, useState, type ReactElement } from 'react'
import { WarningCircle, CheckCircle, Info } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

interface ToastItem {
  id: number
  message: string
  variant: 'error' | 'success' | 'info'
}

let nextId = 0

function ToastIcon({ variant }: { variant: ToastItem['variant'] }): ReactElement {
  switch (variant) {
    case 'error':
      return <WarningCircle size={15} className="text-app-danger" />
    case 'success':
      return <CheckCircle size={15} className="text-app-success" />
    case 'info':
      return <Info size={15} className="text-app-accent" />
  }
}

export function Toaster(): ReactElement | null {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handleToast(event: Event): void {
      const detail = (event as CustomEvent<{ message: string; variant?: string }>).detail
      const id = nextId++
      const variant = (detail.variant as ToastItem['variant']) ?? 'info'
      setToasts((prev) => [...prev, { id, message: detail.message, variant }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    }
    window.addEventListener('rowport:toast', handleToast)
    return () => window.removeEventListener('rowport:toast', handleToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-14 left-1/2 z-[9999] flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 rounded-lg border border-app-edge bg-app-bg px-4 py-2.5 text-sm text-app-fg shadow-lg',
            'animate-in fade-in slide-in-from-bottom-2'
          )}
        >
          <ToastIcon variant={toast.variant} />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
