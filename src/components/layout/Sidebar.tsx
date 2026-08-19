import { useEffect, useState, type ReactElement } from 'react'
import { CaretDoubleLeft, FolderPlus, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { ConnectionTree } from '../connection/ConnectionTree'
import { ConnectionForm } from '../connection/ConnectionForm'
import { FolderForm } from '../connection/FolderForm'
import { ContextMenu } from '../common/ContextMenu'
import { cn } from '../../lib/utils'
import type { Connection, ConnectionFolder } from '../../types/connection'
import { useT } from '../../lib/i18n'

const MIN_WIDTH = 200
const MAX_WIDTH = 400

export function Sidebar(): ReactElement {
  const t = useT()
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useSettingsStore((s) => s.sidebarWidth)
  const setSidebarWidth = useSettingsStore((s) => s.setSidebarWidth)
  const toggleSidebarCollapsed = useSettingsStore((s) => s.toggleSidebarCollapsed)
  const connectionCount = useConnectionStore((s) => s.connections.length)
  const connect = useConnectionStore((s) => s.connect)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Connection | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folderFormOpen, setFolderFormOpen] = useState(false)
  const [folderEditTarget, setFolderEditTarget] = useState<ConnectionFolder | null>(null)
  const [search, setSearch] = useState('')
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{ x: number; y: number } | null>(
    null
  )

  useEffect(() => {
    const onNewConnection = (event: CustomEvent<{ folderId?: string }>): void => {
      setEditTarget(null)
      setFolderId(event.detail?.folderId ?? null)
      setFormOpen(true)
    }
    window.addEventListener('rowport:new-connection', onNewConnection as EventListener)
    return () =>
      window.removeEventListener('rowport:new-connection', onNewConnection as EventListener)
  }, [])

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const onMove = (moveEvent: PointerEvent): void => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX))
      setSidebarWidth(next)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function openNewConnection(): void {
    setEditTarget(null)
    setFolderId(null)
    setFormOpen(true)
  }

  function openEditConnection(connection: Connection): void {
    setEditTarget(connection)
    setFormOpen(true)
  }

  function openNewFolder(): void {
    setFolderEditTarget(null)
    setFolderFormOpen(true)
  }

  function openEditFolder(folder: ConnectionFolder): void {
    setFolderEditTarget(folder)
    setFolderFormOpen(true)
  }

  const formDialogs = (
    <>
      <ConnectionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setFolderId(null)
        }}
        existing={editTarget}
        onCreated={(id) => void connect(id).catch(() => undefined)}
        folderId={folderId}
      />

      <FolderForm
        open={folderFormOpen}
        onClose={() => setFolderFormOpen(false)}
        existing={folderEditTarget}
      />
    </>
  )

  if (sidebarCollapsed) {
    return (
      <>
        <div className="flex shrink-0 flex-col items-center border-r border-app-edge bg-app-bg-muted py-2">
          <IconColumnButton title="New connection" onClick={openNewConnection}>
            <Plus size={16} />
          </IconColumnButton>
          <IconColumnButton title={t('sidebar.newFolder')} onClick={openNewFolder}>
            <FolderPlus size={16} />
          </IconColumnButton>
          <div className="flex-1" />
          <IconColumnButton title={t('sidebar.expandSidebar')} onClick={toggleSidebarCollapsed}>
            <CaretDoubleLeft size={15} className="rotate-180" />
          </IconColumnButton>
        </div>
        {formDialogs}
      </>
    )
  }

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-app-edge bg-app-bg-muted"
      style={{ width: sidebarWidth }}
    >
      <div className="flex items-center gap-1 px-2 py-2">
        <span className="text-xs font-semibold tracking-wide text-app-fg">
          {t('sidebar.title')}
        </span>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest('input')) return
          event.preventDefault()
          setSidebarContextMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        <div className="px-2 pb-1">
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-app-fg-soft"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t('sidebar.filterConnections')}
              className="w-full rounded border border-app-edge bg-app-bg py-1.5 pr-7 pl-7 text-xs outline-none focus:border-app-fg-muted"
            />
            {search && (
              <button
                type="button"
                title={t('sidebar.clearSearch')}
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-1 flex size-5 -translate-y-1/2 items-center justify-center rounded text-app-fg-soft hover:bg-app-bg-soft hover:text-app-fg"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>
        </div>
        <ConnectionTree onEdit={openEditConnection} onEditFolder={openEditFolder} search={search} />
      </div>

      <div className="flex items-center justify-between border-t border-app-edge px-2 py-1">
        <span className="text-[10px] text-app-fg-soft">
          {t('sidebar.connectionCount', { count: connectionCount })}
        </span>
        <IconButton title={t('sidebar.collapseSidebar')} onClick={toggleSidebarCollapsed}>
          <CaretDoubleLeft size={14} />
        </IconButton>
      </div>

      <div
        onPointerDown={handleResizeStart}
        className="absolute top-0 bottom-0 z-10 w-px cursor-col-resize hover:bg-app-fg-soft"
        style={{ left: sidebarWidth - 1 }}
      />

      <ConnectionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setFolderId(null)
        }}
        existing={editTarget}
        onCreated={(id) => void connect(id).catch(() => undefined)}
        folderId={folderId}
      />

      <FolderForm
        open={folderFormOpen}
        onClose={() => setFolderFormOpen(false)}
        existing={folderEditTarget}
      />
      {sidebarContextMenu && (
        <ContextMenu
          items={[
            {
              label: t('tree.newConnection'),
              onClick: () => {
                openNewConnection()
                setSidebarContextMenu(null)
              }
            },
            {
              label: t('tree.newFolder'),
              onClick: () => {
                openNewFolder()
                setSidebarContextMenu(null)
              }
            }
          ]}
          anchorPoint={sidebarContextMenu}
          onClose={() => setSidebarContextMenu(null)}
        />
      )}
    </aside>
  )
}

interface IconColumnButtonProps {
  title: string
  onClick: () => void
  children: React.ReactNode
}

function IconColumnButton({ title, onClick, children }: IconColumnButtonProps): ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
    >
      {children}
    </button>
  )
}

function IconButton({ title, onClick, children }: IconColumnButtonProps): ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'flex size-8 items-center justify-center rounded text-app-fg-muted',
        'transition-colors hover:bg-app-bg-soft hover:text-app-fg'
      )}
    >
      {children}
    </button>
  )
}
