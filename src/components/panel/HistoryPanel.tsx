import { useEffect, useState, type ReactElement } from 'react'
import { CheckCircle, Clock, List, WarningCircle, XCircle } from '@phosphor-icons/react'
import { useHistoryStore } from '../../stores/useHistoryStore'
import { useTabStore } from '../../stores/useTabStore'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { formatDuration } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import { ContextMenu } from '../common/ContextMenu'
import { HistoryDetailModal } from './HistoryDetailModal'

export function HistoryPanel(): ReactElement {
  const t = useT()
  const entries = useHistoryStore((s) => s.entries)
  const loaded = useHistoryStore((s) => s.loaded)
  const load = useHistoryStore((s) => s.load)
  const remove = useHistoryStore((s) => s.remove)
  const clear = useHistoryStore((s) => s.clear)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setSql = useTabStore((s) => s.setSql)
  const connections = useConnectionStore((s) => s.connections)

  const [contextMenu, setContextMenu] = useState<{
    entry: (typeof entries)[0]
    x: number
    y: number
  } | null>(null)
  const [detailEntry, setDetailEntry] = useState<(typeof entries)[0] | null>(null)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  function loadIntoActiveTab(queryText: string): void {
    if (activeTabId) setSql(activeTabId, queryText)
  }

  function handleContextMenu(event: React.MouseEvent, entry: (typeof entries)[0]): void {
    event.preventDefault()
    setContextMenu({ entry, x: event.clientX, y: event.clientY })
  }

  function handleDoubleClick(entry: (typeof entries)[0]): void {
    loadIntoActiveTab(entry.queryText)
  }

  function handleKeyDown(event: React.KeyboardEvent, entry: (typeof entries)[0]): void {
    if (event.key === 'Enter') loadIntoActiveTab(entry.queryText)
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      setContextMenu({ entry, x: rect.left, y: rect.bottom })
    }
  }

  const menuItems = contextMenu
    ? [
        {
          label: t('history.addToEditor'),
          onClick: () => {
            loadIntoActiveTab(contextMenu.entry.queryText)
            setContextMenu(null)
          }
        },
        {
          label: t('history.details'),
          onClick: () => {
            setDetailEntry(contextMenu.entry)
            setContextMenu(null)
          }
        },
        { divider: true },
        {
          label: t('history.deleteEntry'),
          variant: 'danger',
          onClick: () => {
            setContextMenu(null)
            void remove(contextMenu.entry.id)
          }
        }
      ]
    : null

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-1.5 border-b border-app-edge px-3 py-2">
          <List size={13} className="text-app-fg-muted" />
          <span className="flex-1 text-xs font-semibold text-app-fg">{t('history.title')}</span>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => void clear()}
              className="text-[10px] text-app-fg-soft hover:text-app-danger"
            >
              {t('history.clear')}
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {entries.length === 0 ? (
            <p className="px-2 py-4 text-xs leading-relaxed text-app-fg-soft">
              {t('history.empty')}
            </p>
          ) : (
            <div className="space-y-0.5">
              {entries.map((entry) => {
                const connection = connections.find((c) => c.id === entry.connectionId)
                return (
                  <div
                    key={entry.id}
                    role="button"
                    tabIndex={0}
                    title={t('history.loadInto')}
                    onDoubleClick={() => handleDoubleClick(entry)}
                    onContextMenu={(event) => handleContextMenu(event, entry)}
                    onKeyDown={(event) => handleKeyDown(event, entry)}
                    className="group cursor-pointer rounded px-2 py-2 hover:bg-app-bg-soft"
                  >
                    <div className="flex items-center gap-1.5">
                      {entry.status === 'success' ? (
                        <CheckCircle size={12} className="shrink-0 text-app-success" />
                      ) : (
                        <XCircle size={12} className="shrink-0 text-app-danger" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[11px] text-app-fg">
                        {connection?.name ?? entry.connectionName ?? t('history.unknown')}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-app-fg-soft">
                        <Clock size={9} />
                        {formatDuration(entry.durationMs ?? 0)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 line-clamp-2 whitespace-pre-wrap font-mono text-[10px] leading-snug',
                        entry.status === 'success' ? 'text-app-fg-muted' : 'text-app-danger/80'
                      )}
                    >
                      {entry.queryText}
                    </p>
                    {entry.errorMessage && (
                      <p className="mt-0.5 flex items-start gap-1 text-[10px] text-app-danger/80">
                        <WarningCircle size={9} className="mt-0.5 shrink-0" />
                        <span className="min-w-0 wrap-break-words">{entry.errorMessage}</span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          items={menuItems!}
          anchorPoint={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
      <HistoryDetailModal
        entry={detailEntry}
        onClose={() => setDetailEntry(null)}
        onAddToEditor={loadIntoActiveTab}
        onDelete={remove}
      />
    </>
  )
}
