import { useEffect, useState, type ReactElement } from 'react'
import {
  CaretRight,
  Columns,
  Database,
  SpinnerGap,
  Table,
  WarningCircle,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { useTabStore } from '../../stores/useTabStore'
import { useSchemaStore } from '../../stores/useSchemaStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import {
  getCachedSqlSchema,
  invalidateSqlSchemaCache,
  loadMongoSchema,
  type SchemaTable
} from '../../lib/schema'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

export function SchemaPanel(): ReactElement {
  const t = useT()
  const connections = useConnectionStore((s) => s.connections)
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const statusById = useConnectionStore((s) => s.statusById)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setSql = useTabStore((s) => s.setSql)
  const openTab = useTabStore((s) => s.openTab)
  const runQuery = useTabStore((s) => s.runQuery)

  const [tables, setTables] = useState<SchemaTable[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const schemaVersion = useSchemaStore((s) => s.version)
  const selectLimit = useSettingsStore((s) => s.selectLimit)

  const active = connections.find((c) => c.id === activeConnectionId)
  const connected = active && statusById[active.id] === 'connected'

  useEffect(() => {
    if (!active || !connected) {
      setTables([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const load = async (): Promise<void> => {
      try {
        const data =
          active.dbType === 'mongodb' ? [] : await getCachedSqlSchema(active.dbType, active.id)
        if (!cancelled) setTables(data)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [active, connected, reloadKey, schemaVersion])

  function handleRefresh(): void {
    if (!active) return
    invalidateSqlSchemaCache(active.id)
    setReloadKey((key) => key + 1)
  }

  function insertSelect(table: SchemaTable): void {
    const schemaPart = table.schema && table.schema !== 'main' ? `${table.schema}.` : ''
    const sql = `SELECT * FROM ${schemaPart}"${table.name}" LIMIT ${selectLimit};`
    if (activeTabId) {
      setSql(activeTabId, sql)
      void runQuery(activeTabId)
    } else if (active) {
      openTab(active.id)
      setTimeout(() => {
        const tab = useTabStore.getState().tabs.at(-1)
        if (tab) {
          setSql(tab.id, sql)
          void runQuery(tab.id)
        }
      }, 0)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-app-edge px-3 py-2">
        <Database size={13} className="text-app-fg-muted" />
        <span className="flex-1 truncate text-xs font-semibold text-app-fg">
          {active ? active.name : t('schema.database')}
        </span>
        {connected && (
          <button
            type="button"
            title={t('schema.refreshSchema')}
            onClick={handleRefresh}
            className="flex size-7 items-center justify-center rounded text-app-fg-soft transition-colors hover:bg-app-bg-soft hover:text-app-fg"
          >
            <ArrowsClockwise size={13} className={cn(loading && 'animate-spin')} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {!active || !connected ? (
          <p className="px-2 py-4 text-xs leading-relaxed text-app-fg-soft">
            {t('schema.connectFirst')}
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-xs text-app-fg-muted">
            <SpinnerGap size={14} className="animate-spin" />
            {t('schema.loadingSchema')}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 px-2 py-4 text-xs text-app-danger">
            <WarningCircle size={14} className="mt-0.5 shrink-0" />
            <span className="min-w-0 wrap-break-words">{error}</span>
          </div>
        ) : active.dbType === 'mongodb' ? (
          <MongoSchema />
        ) : tables.length === 0 ? (
          <p className="px-2 py-4 text-xs text-app-fg-soft">{t('schema.noTables')}</p>
        ) : (
          <div className="space-y-1">
            {groupBySchema(tables).map(([schema, schemaTables]) => (
              <SchemaGroup
                key={schema}
                schema={schema}
                tables={schemaTables}
                onInsert={insertSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MongoSchema(): ReactElement {
  const t = useT()
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId)
  const [databases, setDatabases] = useState<Array<{ database: string; collections: string[] }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeConnectionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadMongoSchema(activeConnectionId)
      .then((nodes) => {
        if (!cancelled) setDatabases(nodes)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeConnectionId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-4 text-xs text-app-fg-muted">
        <SpinnerGap size={14} className="animate-spin" />
        {t('schema.loadingCollections')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 px-2 py-4 text-xs text-app-danger">
        <WarningCircle size={14} className="mt-0.5 shrink-0" />
        <span className="min-w-0 wrap-break-words">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {databases.map((node) => (
        <MongoDatabaseGroup key={node.database} {...node} />
      ))}
    </div>
  )
}

function MongoDatabaseGroup({
  database,
  collections
}: {
  database: string
  collections: string[]
}): ReactElement {
  const [expanded, setExpanded] = useState(true)
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-2 text-left text-xs font-medium text-app-fg hover:bg-app-bg-soft"
      >
        <CaretRight
          size={11}
          className={cn('shrink-0 text-app-fg-soft transition-transform', expanded && 'rotate-90')}
        />
        <span className="min-w-0 flex-1 truncate">{database}</span>
        <span className="text-[10px] text-app-fg-soft">{collections.length}</span>
      </button>
      {expanded &&
        collections.map((collection) => (
          <div
            key={collection}
            className="flex items-center gap-1.5 py-1.5 pl-6 pr-2 text-xs text-app-fg-muted"
          >
            <Table size={12} className="shrink-0 text-app-fg-soft" />
            <span className="min-w-0 truncate">{collection}</span>
          </div>
        ))}
    </div>
  )
}

function SchemaGroup({
  schema,
  tables,
  onInsert
}: {
  schema: string
  tables: SchemaTable[]
  onInsert: (table: SchemaTable) => void
}): ReactElement {
  const [expanded, setExpanded] = useState(true)
  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-2 text-left text-xs font-medium text-app-fg hover:bg-app-bg-soft"
      >
        <CaretRight
          size={11}
          className={cn('shrink-0 text-app-fg-soft transition-transform', expanded && 'rotate-90')}
        />
        <Database size={13} className="shrink-0 text-app-fg-soft" />
        <span className="min-w-0 flex-1 truncate">{schema}</span>
        <span className="text-[10px] text-app-fg-soft">{tables.length}</span>
      </button>
      {expanded &&
        tables.map((table) => (
          <TableRow key={`${table.schema}.${table.name}`} table={table} onInsert={onInsert} />
        ))}
    </div>
  )
}

function TableRow({
  table,
  onInsert
}: {
  table: SchemaTable
  onInsert: (table: SchemaTable) => void
}): ReactElement {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        type="button"
        title={t('schema.insertSelect')}
        onClick={() => setExpanded((value) => !value)}
        onDoubleClick={() => onInsert(table)}
        className="group flex w-full items-center gap-1.5 rounded px-2 py-2 pl-6 text-left text-xs text-app-fg-muted hover:bg-app-bg-soft hover:text-app-fg"
      >
        {table.columns.length > 0 ? (
          <CaretRight
            size={10}
            className={cn(
              'shrink-0 text-app-fg-soft transition-transform',
              expanded && 'rotate-90'
            )}
          />
        ) : (
          <span className="w-[10px] shrink-0" />
        )}
        <Table size={12} className="shrink-0 text-app-fg-soft" />
        <span className="min-w-0 flex-1 truncate">{table.name}</span>
        <span className="text-[10px] text-app-fg-soft">
          {table.kind === 'view' ? t('schema.view') : table.columns.length}
        </span>
      </button>
      {expanded &&
        table.columns.map((column) => (
          <div
            key={column.name}
            className="flex items-center gap-1.5 py-1 pl-9 pr-2 text-[11px] text-app-fg-muted"
          >
            <Columns size={11} className="shrink-0 text-app-fg-soft" />
            <span className="min-w-0 flex-1 truncate">{column.name}</span>
            <span className="shrink-0 text-app-fg-soft">{column.dataType}</span>
          </div>
        ))}
    </div>
  )
}

function groupBySchema(tables: SchemaTable[]): Array<[string, SchemaTable[]]> {
  const groups = new Map<string, SchemaTable[]>()
  for (const table of tables) {
    const list = groups.get(table.schema) ?? []
    list.push(table)
    groups.set(table.schema, list)
  }
  return Array.from(groups.entries())
}
