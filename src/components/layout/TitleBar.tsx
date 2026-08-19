import { useEffect, useState, type ReactElement } from 'react'
import { Copy, Minus, Square, X } from '@phosphor-icons/react'
import { useT } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { Toolbar } from '../toolbar/Toolbar'
import { SettingsDialog } from './SettingsDialog'

export function TitleBar({ onAbout }: { onAbout?: () => void }): ReactElement {
  const t = useT()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const toggleSidebarCollapsed = useSettingsStore((s) => s.toggleSidebarCollapsed)
  const [isMac, setIsMac] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    setIsMac(window.rowport.platform === 'darwin')
    void window.rowport.window
      .isMaximized()
      .then(setIsMaximized)
      .catch(() => undefined)
    return window.rowport.window.onMaximizedChange(setIsMaximized)
  }, [])

  return (
    <header className="app-drag-region relative flex h-10 shrink-0 items-center justify-between border-b border-app-edge bg-app-bg-muted select-none w-full">
      <div className="app-no-drag flex min-w-0 items-center gap-2">
        <Toolbar
          onSettings={() => setSettingsOpen(true)}
          toggleSidebar={() => toggleSidebarCollapsed()}
          onAbout={onAbout}
        />
      </div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="hidden sm:block text-[12px] font-medium text-app-fg-muted">
          {t('app.name')}
        </span>
      </div>

      {isMac ? (
        <div className="app-no-drag flex items-center gap-2 px-3">
          <span className="size-3 rounded-full bg-app-danger" />
          <span className="size-3 rounded-full bg-app-warning" />
          <span className="size-3 rounded-full bg-app-success" />
        </div>
      ) : (
        <div className="app-no-drag flex items-center">
          <button
            type="button"
            title={t('window.minimize')}
            onClick={() => void window.rowport.window.minimize()}
            className="flex h-10 w-12 items-center justify-center text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            title={isMaximized ? t('window.restore') : t('window.maximize')}
            onClick={() => void window.rowport.window.toggleMaximize()}
            className="flex h-10 w-12 items-center justify-center text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
          >
            {isMaximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button
            type="button"
            title={t('window.close')}
            onClick={() => void window.rowport.window.close()}
            className="flex h-10 w-12 items-center justify-center text-app-fg-muted transition-colors hover:bg-app-danger hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  )
}
