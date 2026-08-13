import { useEffect, useState, type ReactElement } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsDialog } from './components/layout/SettingsDialog'
import { AboutRowportDialog } from './components/layout/AboutRowportDialog'
import { QueryWorkspace } from './components/query/QueryWorkspace'
import { RightPanel } from './components/panel/RightPanel'
import {
  resolveSystemTheme,
  resolveTheme,
  useThemeStore,
  type ResolvedTheme
} from './stores/useThemeStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { useConnectionStore } from './stores/useConnectionStore'
import { useHistoryStore } from './stores/useHistoryStore'
import type { Connection, ConnectionFolder } from './types/connection'
import { EDITOR_FONT_STACKS, UI_FONT_STACKS } from './lib/fonts'
import { ConnectionForm } from './components/connection/ConnectionForm'
import { FolderForm } from './components/connection/FolderForm'
import { Toaster } from './components/common/Toast'

function App(): ReactElement {
  const theme = useThemeStore((s) => s.theme)
  const rightPanelOpen = useSettingsStore((s) => s.rightPanelOpen)
  const uiFont = useSettingsStore((s) => s.uiFont)
  const editorFont = useSettingsStore((s) => s.editorFont)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled)
  const zoom = useSettingsStore((s) => s.zoom)
  const language = useSettingsStore((s) => s.language)
  const load = useConnectionStore((s) => s.load)
  const loadHistory = useHistoryStore((s) => s.load)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Connection | null>(null)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folderFormOpen, setFolderFormOpen] = useState(false)
  const [folderEditTarget, setFolderEditTarget] = useState<ConnectionFolder | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemTheme(resolveSystemTheme())
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = resolveTheme(theme, systemTheme)

  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('data-theme', resolved)
  }, [resolved])

  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--editor-font-size', `${editorFontSize}px`)
  }, [editorFontSize])

  useEffect(() => {
    const el = document.documentElement
    el.style.setProperty('--ui-font', UI_FONT_STACKS[uiFont])
    el.style.setProperty('--code-font', EDITOR_FONT_STACKS[editorFont])
  }, [uiFont, editorFont])

  useEffect(() => {
    document.documentElement.style.zoom = String(zoom)
  }, [zoom])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  useEffect(() => {
    document.documentElement.classList.toggle('animations-off', !animationsEnabled)
  }, [animationsEnabled])

  useEffect(() => {
    void load()
    void loadHistory()
  }, [load, loadHistory])

  useEffect(() => {
    const onNewConnection = (event: CustomEvent<{ folderId?: string }>): void => {
      setEditTarget(null)
      setFolderId(event.detail?.folderId ?? null)
      setFormOpen(true)
    }
    const onNewFolder = (): void => {
      setFolderEditTarget(null)
      setFolderFormOpen(true)
    }
    window.addEventListener('rowport:new-connection', onNewConnection as EventListener)
    window.addEventListener('rowport:new-folder', onNewFolder)
    return () => {
      window.removeEventListener('rowport:new-connection', onNewConnection as EventListener)
      window.removeEventListener('rowport:new-folder', onNewFolder)
    }
  }, [])

  return (
    <div className="flex h-full flex-col bg-app-bg text-app-fg">
      <TitleBar onAbout={() => setAboutOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <QueryWorkspace />
        {rightPanelOpen && <RightPanel />}
      </div>
      <StatusBar />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutRowportDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ConnectionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setFolderId(null)
        }}
        existing={editTarget}
        onCreated={() => void load().catch(() => undefined)}
        folderId={folderId}
      />
      <FolderForm
        open={folderFormOpen}
        onClose={() => setFolderFormOpen(false)}
        existing={folderEditTarget}
      />
      <Toaster />
    </div>
  )
}

export default App
