import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Play, Plus, X } from '@phosphor-icons/react'
import { Button, Chip } from '@heroui/react'
import { TabBar } from './TabBar'
import { SqlEditor } from './SqlEditor'
import { NoSQLEditor } from './NoSQLEditor'
import { ResultsGrid, type EditCellParams } from './ResultsGrid'
import { ErDiagram } from '../er/ErDiagram'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { ConnectionForm } from '../connection/ConnectionForm'
import { useTabStore } from '../../stores/useTabStore'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { isDestructiveQuery, runExecute } from '../../lib/query-executor'
import { cn, quoteIdent } from '../../lib/utils'
import { useT } from '../../lib/i18n'

const MIN_EDITOR_HEIGHT = 80
const MAX_EDITOR_HEIGHT = 500

export function QueryWorkspace(): ReactElement {
  const t = useT()
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setSql = useTabStore((s) => s.setSql)
  const setMongo = useTabStore((s) => s.setMongo)
  const runQuery = useTabStore((s) => s.runQuery)
  const loadMore = useTabStore((s) => s.loadMore)
  const cancelQuery = useTabStore((s) => s.cancelQuery)
  const openTab = useTabStore((s) => s.openTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const connections = useConnectionStore((s) => s.connections)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const connect = useConnectionStore((s) => s.connect)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const lastHandledRef = useRef<string | null>(null)
  const editorHeight = useSettingsStore((s) => s.editorHeight)
  const setEditorHeight = useSettingsStore((s) => s.setEditorHeight)
  const confirmDestructive = useSettingsStore((s) => s.confirmDestructive)

  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeConnection = connections.find((c) => c.id === activeConnectionId)
  const tabConnection = activeTab ? connections.find((c) => c.id === activeTab.connectionId) : null
  const isMongo = tabConnection?.dbType === 'mongodb'

  useEffect(() => {
    if (!activeConnectionId) return
    if (lastHandledRef.current === activeConnectionId) return
    lastHandledRef.current = activeConnectionId
    if (!tabs.some((t) => t.connectionId === activeConnectionId)) {
      openTab(activeConnectionId)
    }
  }, [activeConnectionId, tabs, openTab])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        if (event.shiftKey) {
          const state = useSettingsStore.getState()
          state.setRightPanelOpen(!state.rightPanelOpen)
        } else {
          useSettingsStore.getState().toggleSidebarCollapsed()
        }
        return
      }
      const target = event.target as HTMLElement | null
      const typing =
        target?.closest('.cm-editor') !== null ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true
      if (typing) return
      if (event.key === 't' || event.key === 'T') {
        event.preventDefault()
        if (activeConnectionId) openTab(activeConnectionId)
      } else if (event.key === 'w' || event.key === 'W') {
        event.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      } else if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        setFormOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeConnectionId, activeTabId, openTab, closeTab])

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = editorHeight
    const onMove = (moveEvent: PointerEvent): void => {
      const next = Math.min(
        MAX_EDITOR_HEIGHT,
        Math.max(MIN_EDITOR_HEIGHT, startHeight + (moveEvent.clientY - startY))
      )
      setEditorHeight(next)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function handleRun(): void {
    if (!activeTab) return
    if (isDestructiveQuery(activeTab.sql)) {
      if (!confirmDestructive) {
        void runQuery(activeTab.id, true)
        return
      }
      setConfirmOpen(true)
      return
    }
    void runQuery(activeTab.id)
  }

  function handleConfirmRun(): void {
    setConfirmOpen(false)
    if (activeTab) void runQuery(activeTab.id, true)
  }

  async function handleEditCell({
    table,
    column,
    pkColumns,
    row,
    value
  }: EditCellParams): Promise<void> {
    if (!activeTab) return
    if (tabConnection?.readOnly) {
      throw new Error(t('errors.readOnlyConnection'))
    }
    const where = pkColumns.map((pk) => `${quoteIdent(pk)} = ?`).join(' AND ')
    const sql = `UPDATE ${quoteIdent(table)} SET ${quoteIdent(column)} = ? WHERE ${where}`
    const params = [value, ...pkColumns.map((pk) => row[pk])]
    await runExecute(activeTab.connectionId, sql, params, true)
    await runQuery(activeTab.id)
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-app-bg">
      {!activeConnection ? (
        <EmptyState title={t('qw.connectTitle')} description={t('qw.connectDescription')}>
          <Button variant="primary" size="md" onPress={() => setFormOpen(true)}>
            <Plus size={15} />
            {t('qw.newConnection')}
          </Button>
        </EmptyState>
      ) : !activeTab ? (
        <EmptyState
          title={t('qw.openTabTitle')}
          description={t('qw.openTabDescription', { name: activeConnection.name })}
        >
          <Button variant="primary" size="md" onPress={() => openTab(activeConnection.id)}>
            <Plus size={15} />
            {t('qw.newQueryTab')}
          </Button>
        </EmptyState>
      ) : (
        <>
          <TabBar />
          <div className="flex shrink-0 items-center gap-2 border-b border-app-edge bg-app-bg-muted px-2 py-1.5">
            {tabConnection ? (
              <>
                <Chip size="sm" variant="soft">
                  {tabConnection.database || tabConnection.name}
                </Chip>
                <Chip size="sm" variant="secondary">
                  {t(`dbType.${tabConnection.dbType}`)}
                </Chip>
              </>
            ) : (
              <span className="text-[11px] text-app-fg-muted">{t('qw.noConnection')}</span>
            )}
            <div className="flex-1" />
            {activeTab.kind === 'query' && !isMongo && (
              <span title={t('qw.runQuery')}>
                {activeTab.result.status === 'running' ? (
                  <Button variant="ghost" size="sm" onPress={() => void cancelQuery(activeTab.id)}>
                    <X size={13} />
                    {t('common.cancel')}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onPress={handleRun}>
                    <Play size={13} />
                    {t('qw.run')}
                  </Button>
                )}
              </span>
            )}
          </div>
          {activeTab.kind === 'er' ? (
            <div className="min-h-0 flex-1">
              <ErDiagram
                connectionId={activeTab.connectionId}
                dbType={tabConnection?.dbType ?? 'postgres'}
              />
            </div>
          ) : isMongo ? (
            <>
              <NoSQLEditor
                mongo={activeTab.mongo}
                connectionId={activeTab.connectionId}
                height={editorHeight}
                onChange={(mongo) => setMongo(activeTab.id, mongo)}
                onRun={handleRun}
                onCancel={() => void cancelQuery(activeTab.id)}
                isRunning={activeTab.result.status === 'running'}
              />
              <ResizeHandle
                onResizeStart={handleResizeStart}
                onReset={() => setEditorHeight(176)}
              />
              <div className="min-h-0 flex-1">
                <ResultsGrid
                  result={activeTab.result}
                  connectionId={tabConnection?.id}
                  dbType={tabConnection?.dbType}
                  readOnly={tabConnection?.readOnly}
                  onEditCell={tabConnection ? handleEditCell : undefined}
                  onLoadMore={() => void loadMore(activeTab.id)}
                  loadingMore={activeTab.result.loadingMore}
                />
              </div>
              <StatusLine
                connectionName={tabConnection?.name ?? null}
                status={activeTab.result.status}
                durationMs={activeTab.result.durationMs}
                rowCount={activeTab.result.rowCount}
              />
            </>
          ) : (
            <>
              <SqlEditor
                value={activeTab.sql}
                dbType={tabConnection?.dbType ?? 'postgres'}
                connectionId={activeTab.connectionId}
                height={editorHeight}
                onChange={(value) => setSql(activeTab.id, value)}
                onRunQuery={handleRun}
              />
              <ResizeHandle
                onResizeStart={handleResizeStart}
                onReset={() => setEditorHeight(176)}
              />
              <div className="min-h-0 flex-1">
                <ResultsGrid
                  result={activeTab.result}
                  sql={activeTab.sql}
                  connectionId={tabConnection?.id}
                  dbType={tabConnection?.dbType}
                  readOnly={tabConnection?.readOnly}
                  onEditCell={tabConnection ? handleEditCell : undefined}
                  onLoadMore={() => void loadMore(activeTab.id)}
                  loadingMore={activeTab.result.loadingMore}
                />
              </div>
              <StatusLine
                connectionName={tabConnection?.name ?? null}
                status={activeTab.result.status}
                durationMs={activeTab.result.durationMs}
                rowCount={activeTab.result.rowCount}
              />
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={t('qw.confirmDestructiveTitle')}
        description={`${t('qw.confirmDestructiveDescription')}${
          tabConnection?.readOnly ? t('qw.readOnlySuffix') : ''
        }`}
        confirmLabel={t('qw.runAnyway')}
        variant="danger"
        onConfirm={handleConfirmRun}
        onClose={() => setConfirmOpen(false)}
      />

      <ConnectionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(id) => void connect(id).catch(() => undefined)}
      />
    </main>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  children?: React.ReactNode
}

function EmptyState({ title, description, children }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <h2 className="text-base font-semibold text-app-fg">{title}</h2>
      <p className="max-w-md text-xs leading-relaxed text-app-fg-muted">{description}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function ResizeHandle({
  onResizeStart,
  onReset
}: {
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
  onReset: () => void
}): ReactElement {
  const t = useT()
  return (
    <div
      title={t('qw.resizeHandle')}
      onPointerDown={onResizeStart}
      onDoubleClick={onReset}
      className="flex h-1.5 shrink-0 cursor-row-resize items-center justify-center border-b border-app-edge bg-app-bg-muted transition-colors hover:bg-app-fg-soft/30"
    >
      <div className="flex items-center gap-1">
        <span className="h-px w-3 bg-app-fg-soft/50" />
        <span className="h-px w-3 bg-app-fg-soft/50" />
      </div>
    </div>
  )
}

interface StatusLineProps {
  connectionName: string | null
  status: string
  durationMs: number | null
  rowCount: number | null
}

function StatusLine({
  connectionName,
  status,
  durationMs,
  rowCount
}: StatusLineProps): ReactElement {
  const t = useT()
  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-app-edge bg-app-bg-muted px-3 text-[10px] text-app-fg-soft">
      <span className="flex items-center gap-1.5">
        <Play size={9} className="text-app-fg-soft" />
        {connectionName ?? t('qw.noConnection')}
      </span>
      <span
        className={cn(
          'capitalize',
          status === 'running' && 'text-app-warning',
          status === 'error' && 'text-app-danger',
          status === 'success' && 'text-app-success'
        )}
      >
        {status === 'idle'
          ? t('status.ready')
          : status === 'running'
            ? t('status.running')
            : status === 'error'
              ? t('status.error')
              : status === 'success'
                ? t('status.success')
                : status}
      </span>
      {status === 'success' && durationMs !== null && <span>{durationMs}ms</span>}
      {status === 'success' && rowCount !== null && (
        <span>
          {rowCount === 1
            ? t('qw.rowsOne', { count: rowCount })
            : t('qw.rowsMany', { count: rowCount })}
        </span>
      )}
    </div>
  )
}
