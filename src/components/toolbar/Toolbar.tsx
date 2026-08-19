import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { workspaceApi } from '../../lib/electron-api'
import {
  copyActive,
  cutActive,
  deleteActive,
  pasteActive,
  selectAllActive,
  undoActive
} from '../../lib/editor-commands'
import { openNewConnectionDialog, openNewFolderDialog } from '../../lib/ui-events'
import type { ConnectionInput, DbType, SslMode } from '../../types/connection'
import { useT } from '../../lib/i18n'

type MenuItem = {
  label?: string
  onClick?: () => void
  shortcut?: string
  disabled?: boolean
  divider?: boolean
}

export interface ToolbarProps {
  onSettings?: () => void
  toggleSidebar?: () => void
  onAbout?: () => void
}

const MENU_KEYS = ['file', 'edit', 'view', 'window', 'help'] as const
type MenuKey = (typeof MENU_KEYS)[number]

const DB_TYPES: readonly DbType[] = ['postgres', 'mysql', 'sqlite', 'mongodb']
const SSL_MODES: readonly SslMode[] = ['disable', 'require', 'verify-full']

function asDbType(value: string): DbType {
  return (DB_TYPES as readonly string[]).includes(value) ? (value as DbType) : 'postgres'
}

function asSslMode(value: string): SslMode {
  return (SSL_MODES as readonly string[]).includes(value) ? (value as SslMode) : 'disable'
}

function toConnectionInput(json: Record<string, unknown>): ConnectionInput {
  return {
    name: String(json.name ?? 'Connection'),
    dbType: asDbType(String(json.dbType ?? 'postgres')),
    host: String(json.host ?? ''),
    port: typeof json.port === 'number' ? json.port : 0,
    username: String(json.username ?? ''),
    password: '',
    database: String(json.database ?? ''),
    filePath: String(json.filePath ?? ''),
    uri: String(json.uri ?? ''),
    sslMode: asSslMode(String(json.sslMode ?? 'disable')),
    readOnly: json.readOnly === true,
    folderId: null
  }
}

export function Toolbar({ onSettings, toggleSidebar, onAbout }: ToolbarProps): ReactElement {
  const t = useT()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const zoom = useSettingsStore((s) => s.zoom)
  const setZoom = useSettingsStore((s) => s.setZoom)
  const rightPanelOpen = useSettingsStore((s) => s.rightPanelOpen)
  const setRightPanelOpen = useSettingsStore((s) => s.setRightPanelOpen)

  function togglePanel(): void {
    setRightPanelOpen(!rightPanelOpen)
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function zoomBy(delta: number): void {
    setZoom(Math.min(2, Math.max(0.5, Math.round((zoom + delta) * 100) / 100)))
  }

  async function openWorkspace(): Promise<void> {
    const path = await window.rowport.dialog.open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Rowport Workspace', extensions: ['rpw'] }]
    })
    if (!path || Array.isArray(path)) return
    try {
      const workspace = await workspaceApi.loadWorkspace(path)
      const known = new Set(useConnectionStore.getState().connections.map((c) => c.name))
      for (const summary of workspace.connections) {
        if (known.has(summary.name)) continue
        known.add(summary.name)
        await useConnectionStore.getState().addConnection({
          name: summary.name,
          dbType: asDbType(summary.db_type),
          host: summary.host ?? '',
          port: summary.port ?? 0,
          username: '',
          password: '',
          database: summary.database ?? '',
          filePath: '',
          uri: '',
          sslMode: 'disable',
          readOnly: summary.read_only,
          folderId: null
        })
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('rowport:toast', {
          detail: { message: 'Failed to load workspace', variant: 'error' }
        })
      )
    }
  }

  async function saveWorkspaceAs(): Promise<void> {
    const path = await window.rowport.dialog.save({
      defaultPath: 'Untitled.rpw',
      filters: [{ name: 'Rowport Workspace', extensions: ['rpw'] }]
    })
    if (!path) return
    try {
      const baseName = path.split(/[\\/]/).pop() ?? 'Untitled'
      await workspaceApi.saveWorkspace(path, baseName.replace(/\.rpw$/i, ''))
    } catch {
      window.dispatchEvent(
        new CustomEvent('rowport:toast', {
          detail: { message: 'Failed to save workspace', variant: 'error' }
        })
      )
    }
  }

  async function exportConnections(): Promise<void> {
    try {
      const { connections } = useConnectionStore.getState()
      const path = await window.rowport.dialog.save({
        defaultPath: 'rowport-connections.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (!path) return
      const exportable = connections.map(({ ...rest }) => rest)
      await window.rowport.fs.writeTextFile(path, JSON.stringify(exportable, null, 2))
    } catch {
      window.dispatchEvent(
        new CustomEvent('rowport:toast', { detail: { message: 'Export failed', variant: 'error' } })
      )
    }
  }

  async function importConnections(): Promise<void> {
    const path = await window.rowport.dialog.open({
      multiple: false,
      directory: false,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!path || Array.isArray(path)) return
    try {
      const content = await window.rowport.fs.readTextFile(path)
      const parsed: unknown = JSON.parse(content)
      if (!Array.isArray(parsed)) return
      const addConnection = useConnectionStore.getState().addConnection
      for (const entry of parsed) {
        if (entry && typeof entry === 'object') {
          await addConnection(toConnectionInput(entry as Record<string, unknown>))
        }
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('rowport:toast', {
          detail: { message: 'Failed to import connections', variant: 'error' }
        })
      )
    }
  }

  function buildMenuItems(key: MenuKey): MenuItem[] {
    switch (key) {
      case 'file': {
        return [
          {
            label: t('menu.newConnection'),
            onClick: openNewConnectionDialog,
            shortcut: 'Ctrl/Cmd+N'
          },
          {
            label: t('menu.newFolder'),
            onClick: openNewFolderDialog,
            shortcut: 'Ctrl/Cmd+Shift+N'
          },
          { divider: true },
          {
            label: t('menu.openWorkspace'),
            onClick: () => void openWorkspace(),
            shortcut: 'Ctrl/Cmd+O'
          },
          {
            label: t('menu.saveWorkspaceAs'),
            onClick: () => void saveWorkspaceAs(),
            shortcut: 'Ctrl/Cmd+Shift+S'
          },
          { divider: true },
          {
            label: t('menu.import'),
            onClick: () => void importConnections(),
            shortcut: 'Ctrl/Cmd+I'
          },
          {
            label: t('menu.export'),
            onClick: () => void exportConnections(),
            shortcut: 'Ctrl/Cmd+Shift+E'
          },
          { divider: true },
          {
            label: t('menu.exit'),
            onClick: () => void window.rowport.window.close(),
            shortcut: 'Ctrl/Cmd+Q'
          }
        ]
      }
      case 'edit': {
        return [
          { label: t('menu.undo'), onClick: undoActive, shortcut: 'Ctrl/Cmd+Z' },
          { divider: true },
          { label: t('menu.cut'), onClick: cutActive, shortcut: 'Ctrl/Cmd+X' },
          { label: t('menu.copy'), onClick: copyActive, shortcut: 'Ctrl/Cmd+C' },
          { label: t('menu.paste'), onClick: pasteActive, shortcut: 'Ctrl/Cmd+V' },
          { divider: true },
          { label: t('menu.delete'), onClick: deleteActive, shortcut: 'Delete' },
          { divider: true },
          { label: t('menu.selectAll'), onClick: selectAllActive, shortcut: 'Ctrl/Cmd+A' }
        ]
      }
      case 'view': {
        return [
          { label: t('menu.preferences'), onClick: () => onSettings?.() },
          { divider: true },
          { label: t('menu.sidebar'), onClick: () => toggleSidebar?.(), shortcut: 'Ctrl/Cmd+B' },
          { label: t('menu.panel'), onClick: togglePanel, shortcut: 'Ctrl/Cmd+Shift+B' },
          { divider: true },
          { label: t('menu.zoomIn'), onClick: () => zoomBy(0.1), shortcut: 'Ctrl/Cmd+=' },
          { label: t('menu.zoomOut'), onClick: () => zoomBy(-0.1), shortcut: 'Ctrl/Cmd+-' },
          { label: t('menu.resetZoom'), onClick: () => setZoom(1), shortcut: 'Ctrl/Cmd+0' }
        ]
      }
      case 'window': {
        return [
          { label: t('menu.minimize'), onClick: () => void window.rowport.window.minimize() },
          { divider: true },
          { label: t('menu.maximize'), onClick: () => void window.rowport.window.toggleMaximize() },
          { divider: true },
          { label: t('menu.close'), onClick: () => void window.rowport.window.close() }
        ]
      }
      case 'help': {
        return [{ label: t('menu.aboutRowport'), onClick: () => onAbout?.() }]
      }
      default:
        return []
    }
  }

  return (
    <nav
      ref={rootRef}
      className="flex h-9 shrink-0 items-center gap-1 border-app-edge bg-app-bg-muted px-2 select-none w-full"
    >
      {MENU_KEYS.map((key) => {
        const label = t(`menu.${key}`)
        const isOpen = openMenu === key
        return (
          <div key={key} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpenMenu(isOpen ? null : key)}
              className={`rounded px-2.5 py-1 text-[13px] text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg ${isOpen ? 'bg-app-bg-soft text-app-fg' : ''}`}
            >
              {label}
            </button>
            {isOpen && <Menu items={buildMenuItems(key)} onClose={() => setOpenMenu(null)} />}
          </div>
        )
      })}
    </nav>
  )
}

function Menu({ items, onClose }: { items: MenuItem[]; onClose: () => void }): ReactElement {
  return (
    <div
      role="menu"
      className="absolute left-0 top-full z-50 mt-1 w-max min-w-64 rounded-md border border-app-edge bg-app-bg p-1 shadow-lg"
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <hr key={i} className="my-1 border-app-edge" />
        }
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.()
              onClose()
            }}
            className={
              item.disabled
                ? 'flex w-full items-center gap-2 rounded px-2 py-1 text-[13px] text-app-fg-soft cursor-not-allowed'
                : 'flex w-full items-center gap-2 rounded px-2 py-1 text-[13px] text-app-fg-muted hover:bg-app-bg-soft hover:text-app-fg transition-colors cursor-pointer'
            }
          >
            <span className="text-nowrap">{item.label}</span>
            {item.shortcut && (
              <span className="text-app-fg-soft text-nowrap ml-auto pl-6">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
