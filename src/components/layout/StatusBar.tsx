import { useConnectionStore } from '../../stores/useConnectionStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useT } from '../../lib/i18n'
import { ThemeToggle } from '../common/ThemeToggle'
import { SidebarSimple } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import type { ReactElement } from 'react'

export function StatusBar(): ReactElement {
  const t = useT()
  const connections = useConnectionStore((s) => s.connections)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const statusById = useConnectionStore((s) => s.statusById)
  const rightPanelOpen = useSettingsStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useSettingsStore((s) => s.setRightPanelOpen)

  const active = connections.find((c) => c.id === activeConnectionId)
  const status = active ? (statusById[active.id] ?? 'idle') : 'idle'

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-app-edge bg-app-bg-muted px-3 text-[11px] text-app-fg-muted">
      <div className="flex min-w-0 items-center gap-2">
        {active ? (
          <>
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                status === 'connected' && 'bg-app-success',
                status === 'connecting' && 'bg-app-warning',
                status === 'error' && 'bg-app-danger',
                status === 'idle' && 'bg-app-fg-soft'
              )}
            />
            <span className="truncate">{active.name}</span>
            <span className="text-app-fg-soft">
              {status === 'connected'
                ? t('status.connected')
                : status === 'connecting'
                  ? t('status.connecting')
                  : status === 'error'
                    ? t('status.error')
                    : status === 'idle'
                      ? t('status.idle')
                      : t('status.noActiveConnection')}
            </span>
          </>
        ) : (
          <span>{t('status.noActiveConnection')}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={rightPanelOpen ? t('panel.hide') : t('panel.show')}
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          className={cn(
            'flex size-7 items-center justify-center rounded text-app-fg-soft transition-colors hover:bg-app-bg-soft hover:text-app-fg',
            rightPanelOpen && 'text-app-fg'
          )}
        >
          <SidebarSimple size={14} />
        </button>
        <ThemeToggle />
      </div>
    </footer>
  )
}
