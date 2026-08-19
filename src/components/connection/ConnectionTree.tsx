import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import {
  CaretDown,
  Cube,
  Database,
  FileSql,
  FolderSimple,
  PencilSimple,
  SquaresFour,
  Stack,
  Trash
} from '@phosphor-icons/react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Connection, ConnectionFolder, ConnectionStatus, DbType } from '../../types/connection'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ConnectionInfoModal } from './ConnectionInfoModal'
import { ContextMenu } from '../common/ContextMenu'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import { buildConnectionString } from '../../lib/connection-uri'

function DbIcon({ dbType }: { dbType: DbType }): ReactElement {
  const className = 'shrink-0 text-app-fg-muted'
  if (dbType === 'postgres') return <Database size={13} weight="fill" className={className} />
  if (dbType === 'mysql') return <Stack size={13} weight="fill" className={className} />
  if (dbType === 'sqlite') return <FileSql size={13} weight="fill" className={className} />
  return <Cube size={13} weight="fill" className={className} />
}

function StatusDot({ status }: { status: ConnectionStatus }): ReactElement {
  const color: Record<ConnectionStatus, string> = {
    idle: 'bg-app-fg-soft',
    connecting: 'bg-app-warning animate-pulse',
    connected: 'bg-app-success',
    error: 'bg-app-danger'
  }
  return <span className={cn('size-1.5 shrink-0 rounded-full', color[status])} />
}
interface ConnectionRowProps {
  connection: Connection
  status: ConnectionStatus
  active: boolean
  suppressClickRef: { current: boolean }
  onOpenInfo: (connection: Connection) => void
  onDelete?: (connection: Connection) => void
}

function ConnectionRow({
  connection,
  status,
  active,
  suppressClickRef,
  onOpenInfo,
  onDelete
}: ConnectionRowProps): ReactElement {
  const connect = useConnectionStore((s) => s.connect)
  const disconnect = useConnectionStore((s) => s.disconnect)
  const duplicateConnection = useConnectionStore((s) => s.duplicateConnection)
  const setActiveConnection = useConnectionStore((s) => s.setActiveConnection)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `conn-${connection.id}`,
    data: { kind: 'connection' }
  })
  const t = useT()

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current)
    },
    []
  )

  const connected = status === 'connected'

  async function handleConnect(): Promise<void> {
    if (status === 'connecting') return
    if (connected) {
      setActiveConnection(connection.id)
      return
    }
    try {
      await connect(connection.id)
    } catch {
      // status is already marked as error in the store
    }
  }

  function handleClick(): void {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (openTimer.current) clearTimeout(openTimer.current)
    openTimer.current = setTimeout(() => onOpenInfo(connection), 250)
  }

  function handleDoubleClick(): void {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    void handleConnect()
  }

  function handleContextMenu(event: React.MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') onOpenInfo(connection)
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      setContextMenu({ x: rect.left, y: rect.bottom })
    }
  }

  const menuItems = contextMenu
    ? [
        {
          label: connected ? t('tree.disconnect') : t('tree.connect'),
          onClick: () => {
            if (connected) disconnect(connection.id)
            else connect(connection.id)
          }
        },
        { divider: true },
        {
          label: t('tree.editConnection'),
          onClick: () => {
            onOpenInfo(connection)
          }
        },
        {
          label: t('tree.duplicate'),
          onClick: () => {
            void duplicateConnection(connection.id)
          }
        },
        {
          label: t('tree.copyConnectionString'),
          onClick: () => {
            void window.rowport.clipboard.writeText(buildConnectionString(connection))
          }
        },
        { divider: true },
        {
          label: t('tree.deleteConnection'),
          variant: 'danger',
          onClick: () => {
            onDelete?.(connection)
          }
        }
      ]
    : null

  return (
    <>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left select-none',
          active && 'bg-app-bg',
          !active && 'hover:bg-app-bg-soft',
          isDragging && 'cursor-grabbing opacity-50'
        )}
      >
        {connection.colorTag && (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: connection.colorTag }}
          />
        )}
        <DbIcon dbType={connection.dbType} />
        <span className="min-w-0 flex-1 truncate text-xs text-app-fg">{connection.name}</span>
        <StatusDot status={status} />
      </div>
      {contextMenu && (
        <ContextMenu
          items={menuItems!}
          anchorPoint={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

interface IconButtonProps {
  title: string
  onClick: () => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

function IconButton({
  title,
  onClick,
  disabled,
  className,
  children
}: IconButtonProps): ReactElement {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'flex size-8 items-center justify-center rounded text-app-fg-muted transition-colors hover:bg-app-bg hover:text-app-fg',
        disabled && 'opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

interface DeleteTarget {
  kind: 'connection' | 'folder'
  id: string
  name: string
}

type TreeItemKind = 'folder' | 'connection'

interface TreeItemData {
  kind: TreeItemKind
}

type TreeContainers = Record<string, string[]>

function buildContainers(folders: ConnectionFolder[], connections: Connection[]): TreeContainers {
  const containers: TreeContainers = { folders: [], ungrouped: [] }
  containers.folders = folders.map((folder) => `folder-${folder.id}`)
  for (const folder of folders) containers[`folder-${folder.id}`] = []
  for (const connection of connections) {
    if (connection.folderId) {
      const folderItems = (containers[`folder-${connection.folderId}`] ??= [])
      folderItems.push(`conn-${connection.id}`)
    } else {
      ;(containers.ungrouped ??= []).push(`conn-${connection.id}`)
    }
  }
  return containers
}

function findContainerId(containers: TreeContainers, itemId: string): string | null {
  for (const [container, items] of Object.entries(containers)) {
    if (items.includes(itemId)) return container
  }
  return null
}

function orderByIds<T>(items: T[], itemIds: string[], toId: (item: T) => string): T[] {
  const byId = new Map(items.map((item) => [toId(item), item]))
  const ordered: T[] = []
  for (const itemId of itemIds) {
    const item = byId.get(itemId)
    if (item) ordered.push(item)
  }
  return ordered
}

export function ConnectionTree({
  onEdit,
  onEditFolder,
  search = ''
}: {
  onEdit: (connection: Connection) => void
  onEditFolder: (folder: ConnectionFolder) => void
  search?: string
}): ReactElement {
  const connections = useConnectionStore((s) => s.connections)
  const folders = useConnectionStore((s) => s.folders)
  const statusById = useConnectionStore((s) => s.statusById)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const removeConnection = useConnectionStore((s) => s.removeConnection)
  const removeFolder = useConnectionStore((s) => s.removeFolder)
  const t = useT()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [infoTarget, setInfoTarget] = useState<Connection | null>(null)
  const [dragItems, setDragItems] = useState<TreeContainers | null>(null)
  const [activeDragKind, setActiveDragKind] = useState<TreeItemKind | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const suppressClickRef = useRef(false)
  const dragItemsRef = useRef<TreeContainers | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const query = search.trim().toLowerCase()
  const visibleConnections = query
    ? connections.filter((c) => c.name.toLowerCase().includes(query))
    : connections
  const ungrouped = visibleConnections.filter((c) => !c.folderId)

  const containers = useMemo(
    () => dragItems ?? buildContainers(folders, visibleConnections),
    [dragItems, folders, visibleConnections]
  )

  function commitItems(next: TreeContainers): void {
    dragItemsRef.current = next
    setDragItems(next)
  }

  function handleDragStart(event: DragStartEvent): void {
    const data = event.active.data.current as TreeItemData | undefined
    if (!data) return
    setActiveDragKind(data.kind)
    setOverId(null)
    const built = buildContainers(folders, visibleConnections)
    dragItemsRef.current = built
    setDragItems(built)
  }

  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event
    const activeId = String(active.id)
    setOverId(over ? String(over.id) : null)
    if (!over) return
    const overIdStr = String(over.id)
    const activeData = active.data.current as TreeItemData | undefined
    const overData = over.data.current as TreeItemData | undefined
    const current = dragItemsRef.current
    if (!activeData || !overData || !current) return

    if (activeData.kind === 'folder') {
      if (overData.kind !== 'folder') return
      const items = current.folders ?? []
      const oldIndex = items.indexOf(activeId)
      const newIndex = items.indexOf(overIdStr)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      commitItems({ ...current, folders: arrayMove(items, oldIndex, newIndex) })
      return
    }

    if (overData.kind === 'folder') {
      const targetContainer = `folder-${overIdStr.slice(7)}`
      if (findContainerId(current, activeId) === targetContainer) return
      const next: TreeContainers = {}
      for (const [key, items] of Object.entries(current)) {
        next[key] = items.filter((id) => id !== activeId)
      }
      next[targetContainer] = [...(current[targetContainer] ?? []), activeId]
      commitItems(next)
      return
    }

    const activeContainer = findContainerId(current, activeId)
    const overContainer = findContainerId(current, overIdStr)
    if (!activeContainer || !overContainer) return
    if (activeContainer === overContainer) {
      const items = current[activeContainer] ?? []
      const oldIndex = items.indexOf(activeId)
      const newIndex = items.indexOf(overIdStr)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      commitItems({ ...current, [activeContainer]: arrayMove(items, oldIndex, newIndex) })
    } else {
      const activeItems = current[activeContainer] ?? []
      const overItems = current[overContainer] ?? []
      const oldIndex = activeItems.indexOf(activeId)
      const overIndex = overItems.indexOf(overIdStr)
      if (oldIndex === -1 || overIndex === -1) return
      const next: TreeContainers = {}
      for (const [key, items] of Object.entries(current)) {
        next[key] = key === activeContainer ? items.filter((id) => id !== activeId) : items
      }
      const overList = next[overContainer] ?? []
      next[overContainer] = [
        ...overList.slice(0, overIndex),
        activeId,
        ...overList.slice(overIndex)
      ]
      commitItems(next)
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    const data = event.active.data.current as TreeItemData | undefined
    const final = dragItemsRef.current
    dragItemsRef.current = null
    setDragItems(null)
    setActiveDragKind(null)
    setOverId(null)
    if (event.over) suppressClickRef.current = true
    if (!data || !final || !event.over) return
    persistDrag(data.kind, final)
  }

  function handleDragCancel(): void {
    dragItemsRef.current = null
    setDragItems(null)
    setActiveDragKind(null)
    setOverId(null)
  }

  function persistDrag(kind: TreeItemKind, final: TreeContainers): void {
    const state = useConnectionStore.getState()
    if (kind === 'folder') {
      const order = final.folders ?? []
      const entries: Array<{ id: string; sortOrder: number }> = []
      for (let index = 0; index < order.length; index++) {
        const item = order[index]
        if (!item) continue
        const folderId = item.replace('folder-', '')
        const folder = state.folders.find((f) => f.id === folderId)
        if (folder && folder.sortOrder !== index) entries.push({ id: folderId, sortOrder: index })
      }
      if (entries.length > 0) state.setFoldersOrder(entries)
      return
    }
    const entries: Array<{ id: string; folderId: string | null; sortOrder: number }> = []
    for (const [container, items] of Object.entries(final)) {
      if (container === 'folders') continue
      const folderId = container === 'ungrouped' ? null : container.replace('folder-', '')
      for (let index = 0; index < items.length; index++) {
        const item = items[index]
        if (!item) continue
        const connectionId = item.replace('conn-', '')
        const conn = state.connections.find((c) => c.id === connectionId)
        if (conn && (conn.folderId !== folderId || conn.sortOrder !== index)) {
          entries.push({ id: connectionId, folderId, sortOrder: index })
        }
      }
    }
    if (entries.length > 0) state.setConnectionsOrder(entries)
  }

  function handleConfirmDelete(): void {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'connection') {
      void removeConnection(deleteTarget.id)
    } else {
      void removeFolder(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  function handleEditFromModal(connection: Connection): void {
    setInfoTarget(null)
    onEdit(connection)
  }

  function handleDeleteFromModal(connection: Connection): void {
    setInfoTarget(null)
    setDeleteTarget({ kind: 'connection', id: connection.id, name: connection.name })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-3 px-2 pb-2">
        {folders.length > 0 && (
          <div className="space-y-0.5">
            <SortableContext
              items={containers.folders ?? []}
              strategy={verticalListSortingStrategy}
            >
              {orderByIds(folders, containers.folders ?? [], (folder) => `folder-${folder.id}`).map(
                (folder) => (
                  <FolderGroup
                    key={folder.id}
                    folder={folder}
                    connections={orderByIds(
                      visibleConnections.filter((c) => c.folderId === folder.id),
                      containers[`folder-${folder.id}`] ?? [],
                      (c) => `conn-${c.id}`
                    )}
                    connectionCount={connections.filter((c) => c.folderId === folder.id).length}
                    containerItems={containers[`folder-${folder.id}`] ?? []}
                    isDropTarget={
                      activeDragKind === 'connection' && overId === `folder-${folder.id}`
                    }
                    suppressClickRef={suppressClickRef}
                    statusById={statusById}
                    activeConnectionId={activeConnectionId}
                    onOpenInfo={setInfoTarget}
                    onEditFolder={onEditFolder}
                    onDeleteFolder={(name) =>
                      setDeleteTarget({ kind: 'folder', id: folder.id, name })
                    }
                  />
                )
              )}
            </SortableContext>
          </div>
        )}

        <div className="space-y-0.5">
          <SortableContext
            items={containers.ungrouped ?? []}
            strategy={verticalListSortingStrategy}
          >
            {orderByIds(ungrouped, containers.ungrouped ?? [], (c) => `conn-${c.id}`).map(
              (connection) => (
                <ConnectionRow
                  key={connection.id}
                  connection={connection}
                  status={statusById[connection.id] ?? 'idle'}
                  active={activeConnectionId === connection.id}
                  suppressClickRef={suppressClickRef}
                  onOpenInfo={setInfoTarget}
                  onDelete={(c) => setDeleteTarget({ kind: 'connection', id: c.id, name: c.name })}
                />
              )
            )}
          </SortableContext>
          {visibleConnections.length === 0 && (
            <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
              <SquaresFour size={20} className="text-app-fg-soft" />
              <p className="text-xs text-app-fg-soft">
                {query ? t('tree.noMatchingConnections') : t('tree.noConnectionsYet')}
              </p>
            </div>
          )}
        </div>

        {infoTarget && (
          <ConnectionInfoModal
            connection={infoTarget}
            onClose={() => setInfoTarget(null)}
            onEdit={handleEditFromModal}
            onDelete={handleDeleteFromModal}
          />
        )}

        <ConfirmDialog
          open={deleteTarget !== null}
          title={
            deleteTarget?.kind === 'connection'
              ? t('tree.deleteConnectionTitle')
              : t('tree.deleteFolderTitle')
          }
          description={
            deleteTarget?.kind === 'connection'
              ? t('tree.deleteConnectionDescription', { name: deleteTarget.name })
              : t('tree.deleteFolderDescription', { name: deleteTarget?.name ?? '' })
          }
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      </div>
    </DndContext>
  )
}

interface FolderGroupProps {
  folder: ConnectionFolder
  connections: Connection[]
  connectionCount: number
  containerItems: string[]
  isDropTarget: boolean
  suppressClickRef: { current: boolean }
  statusById: Record<string, ConnectionStatus>
  activeConnectionId: string | null
  onOpenInfo: (connection: Connection) => void
  onEditFolder: (folder: ConnectionFolder) => void
  onDeleteFolder: (name: string) => void
}

function FolderGroup({
  folder,
  connections,
  connectionCount,
  containerItems,
  isDropTarget,
  suppressClickRef,
  statusById,
  activeConnectionId,
  onOpenInfo,
  onEditFolder,
  onDeleteFolder
}: FolderGroupProps): ReactElement {
  const t = useT()
  const [expanded, setExpanded] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `folder-${folder.id}`,
    data: { kind: 'folder' }
  })

  useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current)
    },
    []
  )

  function handleContextMenu(event: React.MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (openTimer.current) clearTimeout(openTimer.current)
      openTimer.current = setTimeout(() => onEditFolder(folder), 250)
    }
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      const target = event.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      setContextMenu({ x: rect.left, y: rect.bottom })
    }
  }

  const menuItems = contextMenu
    ? [
        {
          label: t('tree.newConnection'),
          onClick: () => {
            window.dispatchEvent(
              new CustomEvent('rowport:new-connection', { detail: { folderId: folder.id } })
            )
          }
        },
        {
          label: t('tree.editFolder'),
          onClick: () => {
            onEditFolder(folder)
          }
        },
        { divider: true },
        {
          label: t('tree.deleteFolder'),
          variant: 'danger',
          onClick: () => {
            onDeleteFolder(folder.name)
          }
        }
      ]
    : null

  return (
    <>
      <div className="space-y-0.5">
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false
              return
            }
            if (openTimer.current) clearTimeout(openTimer.current)
            openTimer.current = setTimeout(() => onEditFolder(folder), 250)
          }}
          onContextMenu={handleContextMenu}
          onKeyDown={handleKeyDown}
          style={{ transform: CSS.Transform.toString(transform), transition }}
          className={cn(
            'flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-2 hover:bg-app-bg-soft',
            isDropTarget && 'bg-app-bg-soft ring-1 ring-inset ring-app-fg-soft',
            isDragging && 'cursor-grabbing opacity-50'
          )}
        >
          <button
            type="button"
            title={expanded ? t('tree.collapseFolder') : t('tree.expandFolder')}
            onClick={(event) => {
              event.stopPropagation()
              setExpanded(!expanded)
            }}
            className="flex size-4 shrink-0 items-center justify-center rounded text-app-fg-soft hover:text-app-fg"
          >
            <CaretDown
              size={12}
              className={cn('transition-transform', !expanded && '-rotate-90')}
            />
          </button>
          {folder.colorTag && (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: folder.colorTag }}
            />
          )}
          <FolderSimple size={14} weight="bold" className="text-app-fg-muted" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-app-fg">
            {folder.name}
          </span>
          <span className="text-[10px] text-app-fg-soft">{connectionCount}</span>
          <span className="hidden items-center gap-0.5">
            <IconButton title={t('tree.editFolder')} onClick={() => onEditFolder(folder)}>
              <PencilSimple size={14} />
            </IconButton>
            <IconButton
              title={t('tree.deleteFolder')}
              className="hover:text-app-danger"
              onClick={() => onDeleteFolder(folder.name)}
            >
              <Trash size={14} />
            </IconButton>
          </span>
        </div>
        {expanded && (
          <div className="space-y-0.5">
            <SortableContext items={containerItems} strategy={verticalListSortingStrategy}>
              {connections.map((connection) => (
                <div className="pl-3" key={connection.id}>
                  <ConnectionRow
                    connection={connection}
                    status={statusById[connection.id] ?? 'idle'}
                    active={activeConnectionId === connection.id}
                    suppressClickRef={suppressClickRef}
                    onOpenInfo={onOpenInfo}
                  />
                </div>
              ))}
            </SortableContext>
          </div>
        )}
      </div>
      {contextMenu && (
        <ContextMenu
          items={menuItems!}
          anchorPoint={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
