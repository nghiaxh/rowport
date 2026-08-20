import { Plus, TreeStructure, X } from '@phosphor-icons/react'
import { useTabStore } from '../../stores/useTabStore'
import { useConnectionStore } from '../../stores/useConnectionStore'
import type { DbType } from '../../types/connection'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import type { ReactElement } from 'react'

const DB_CODES: Record<DbType, string> = {
  postgres: 'PG',
  mysql: 'MY',
  sqlite: 'SQ',
  mongodb: 'MO'
}

export function TabBar(): ReactElement {
  const t = useT()
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const activateTab = useTabStore((s) => s.activateTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const openTab = useTabStore((s) => s.openTab)
  const openErTab = useTabStore((s) => s.openErTab)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const connections = useConnectionStore((s) => s.connections)
  const activeConnection = connections.find((c) => c.id === activeConnectionId)

  return (
    <div className="flex shrink-0 items-end gap-px overflow-x-auto border-b border-app-edge bg-app-bg-muted px-1 pt-1">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId
        const connection = connections.find((c) => c.id === tab.connectionId)
        const tooltip = connection
          ? `${tab.title} · ${t(`dbType.${connection.dbType}`)}`
          : tab.title
        return (
          <div
            key={tab.id}
            role="button"
            tabIndex={0}
            title={tooltip}
            onClick={() => activateTab(tab.id)}
            onAuxClick={(event) => {
              if (event.button === 1) closeTab(tab.id)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') activateTab(tab.id)
            }}
            className={cn(
              'relative flex min-w-0 max-w-52 cursor-pointer items-center gap-1.5 rounded-t px-2.5 py-2 text-xs',
              active ? 'bg-app-bg' : 'text-app-fg-muted hover:bg-app-bg-soft'
            )}
          >
            {active && (
              <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-app-accent" />
            )}
            <span className="flex min-w-0 items-center gap-1.5">
              {tab.kind === 'er' ? (
                <TreeStructure size={13} className="shrink-0 text-app-fg-soft" />
              ) : (
                connection && (
                  <span className="flex shrink-0 items-center gap-1">
                    {connection.colorTag && (
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: connection.colorTag }}
                      />
                    )}
                    <span className="flex size-4 shrink-0 items-center justify-center rounded bg-app-bg-soft font-mono text-[9px] font-bold text-app-fg-muted">
                      {DB_CODES[connection.dbType]}
                    </span>
                  </span>
                )
              )}
              <span className={cn('truncate', active && 'text-app-fg')}>{tab.title}</span>
            </span>
            <button
              type="button"
              title={t('tabs.closeTab')}
              onClick={(event) => {
                event.stopPropagation()
                closeTab(tab.id)
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded text-app-fg-soft transition-colors hover:bg-app-bg-soft hover:text-app-fg"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
      {activeConnectionId && (
        <button
          type="button"
          title={t('tabs.newQueryTab')}
          onClick={() => openTab(activeConnectionId)}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded text-app-fg-muted hover:bg-app-bg-soft hover:text-app-fg"
        >
          <Plus size={16} />
        </button>
      )}
      {activeConnection && activeConnection.dbType !== 'mongodb' && (
        <button
          type="button"
          title={t('tabs.newErDiagram')}
          onClick={() => openErTab(activeConnection.id)}
          className="flex h-10 w-8 shrink-0 items-center justify-center rounded text-app-fg-muted hover:bg-app-bg-soft hover:text-app-fg"
        >
          <TreeStructure size={16} />
        </button>
      )}
      <div className="flex-1" />
    </div>
  )
}
