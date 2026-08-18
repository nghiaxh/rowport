import { useEffect, useLayoutEffect, useRef, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

export interface ContextMenuItem {
  label?: string
  onClick?: () => void
  variant?: string
  divider?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  anchorPoint: { x: number; y: number } | null
  onClose: () => void
}

function MenuItem({
  item,
  onClose,
  index
}: {
  item: ContextMenuItem
  onClose: () => void
  index: number
}): ReactElement {
  if (item.divider) {
    return <hr key={index} className="my-1 border-app-edge" />
  }
  return (
    <button
      key={index}
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={item.disabled}
      onClick={() => {
        item.onClick?.()
        onClose()
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1 text-[13px] transition-colors',
        item.disabled
          ? 'text-app-fg-soft cursor-not-allowed'
          : item.variant === 'danger'
            ? 'text-app-danger hover:bg-app-danger/10'
            : 'text-app-fg-muted hover:bg-app-bg-soft hover:text-app-fg cursor-pointer'
      )}
    >
      <span className="text-nowrap">{item.label}</span>
    </button>
  )
}

export function ContextMenu({
  items,
  anchorPoint,
  onClose
}: ContextMenuProps): ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<HTMLButtonElement[]>([])

  useLayoutEffect(() => {
    if (!anchorPoint) return
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = anchorPoint.x
    let top = anchorPoint.y

    if (left + rect.width > viewportWidth) {
      left = viewportWidth - rect.width - 8
    }
    if (top + rect.height > viewportHeight) {
      top = viewportHeight - rect.height - 8
    }
    if (left < 8) left = 8
    if (top < 8) top = 8

    menu.style.left = `${left}px`
    menu.style.top = `${top}px`

    const focusFirstItem = (): void => {
      const firstItem = menu.querySelector('button:not(:disabled)') as HTMLElement | null
      firstItem?.focus()
    }
    focusFirstItem()

    const handleKeyDown = (event: KeyboardEvent): void => {
      const enabledItems = itemsRef.current.filter((item) => !item.disabled)
      const currentIndex = enabledItems.indexOf(document.activeElement as HTMLButtonElement)
      if (currentIndex === -1) return

      let nextIndex = currentIndex
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % enabledItems.length
        event.preventDefault()
      } else if (event.key === 'ArrowUp') {
        nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length
        event.preventDefault()
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        enabledItems[currentIndex]?.click()
        return
      } else if (event.key === 'Escape') {
        onClose()
        return
      } else {
        return
      }
      enabledItems[nextIndex]?.focus()
    }

    menu.addEventListener('keydown', handleKeyDown)
    return () => menu.removeEventListener('keydown', handleKeyDown)
  }, [anchorPoint, items, onClose])

  useEffect(() => {
    if (!anchorPoint) return
    const handlePointerDown = (event: PointerEvent): void => {
      const menu = menuRef.current
      if (menu && !menu.contains(event.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const handleScroll = (): void => onClose()

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchorPoint, onClose])

  if (!anchorPoint) return null

  return createPortal(
    <div
      ref={(el) => {
        if (el) {
          menuRef.current = el
          itemsRef.current = Array.from(el.querySelectorAll('button:not(:disabled)'))
        }
      }}
      role="menu"
      className="absolute z-50 min-w-48 rounded-md border border-app-edge bg-app-bg p-1 shadow-lg"
      style={{ left: anchorPoint.x, top: anchorPoint.y }}
    >
      {items.map((item, index) => (
        <MenuItem key={index} item={item} onClose={onClose} index={index} />
      ))}
    </div>,
    document.body
  )
}
