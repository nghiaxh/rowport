import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { FileCsv, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import type { EditCellParams, QueryResultState } from '../../types/query'
import { getCachedSqlSchema } from '../../lib/schema'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { DbType } from '../../types/connection'
import { buildCsv, inferTable } from '../../lib/grid-utils'
import { DataGrid, ToolbarButton, type EditMeta, type GridColumn } from '../grid/DataGrid'
import { useT } from '../../lib/i18n'

export type { EditCellParams } from '../../types/query'

interface ResultsGridProps {
  result: QueryResultState
  sql?: string
  connectionId?: string
  dbType?: DbType
  readOnly?: boolean
  onEditCell?: (params: EditCellParams) => Promise<void>
  onLoadMore?: () => void
  loadingMore?: boolean
}

export function ResultsGrid({
  result,
  sql,
  connectionId,
  dbType,
  readOnly,
  onEditCell,
  onLoadMore,
  loadingMore
}: ResultsGridProps): ReactElement {
  const t = useT()
  const [editMeta, setEditMeta] = useState<EditMeta | null>(null)
  const gridDensity = useSettingsStore((s) => s.gridDensity)
  const showRowNumbers = useSettingsStore((s) => s.showRowNumbers)

  const rowHeight = gridDensity === 'compact' ? 26 : gridDensity === 'comfortable' ? 40 : 32

  const columnsKey = result.columns.join('\u0000')

  const columns = useMemo<GridColumn[]>(
    () => [
      {
        id: '__select',
        header: '',
        accessorFn: () => undefined,
        size: 34,
        enableResizing: false,
        enableSorting: false,
        pinned: 'left'
      },
      ...(showRowNumbers
        ? [
            {
              id: '__index',
              header: '#',
              accessorFn: (_row: unknown, index: number) => index,
              size: 44,
              enableResizing: false,
              enableSorting: false,
              pinned: 'left' as const
            }
          ]
        : []),
      ...result.columns.map((column) => ({
        id: column,
        header: column,
        accessorFn: (row: Record<string, unknown>) => row[column],
        size: 150,
        minSize: 60
      }))
    ],
    [result.columns, showRowNumbers]
  )

  useEffect(() => {
    if (!columnsKey || !sql || !connectionId || !dbType || dbType === 'mongodb') {
      setEditMeta(null)
      return
    }
    let cancelled = false
    const table = inferTable(sql)
    if (!table?.name) {
      setEditMeta(null)
      return
    }
    const load = async (): Promise<void> => {
      try {
        const schema = await getCachedSqlSchema(dbType, connectionId)
        const info = schema.find(
          (t) =>
            t.name === table.name &&
            (t.schema === table.schema || (table.schema === undefined && t.schema !== undefined))
        )
        if (!info?.columns) {
          setEditMeta(null)
          return
        }
        const pkColumns = info.columns.filter((c) => c.isPrimaryKey).map((c) => c.name)
        const editableColumns = info.columns.filter((c) => !c.isPrimaryKey).map((c) => c.name)
        const columnTypes: Record<string, string> = {}
        for (const c of info.columns) columnTypes[c.name] = c.dataType
        if (cancelled) return
        setEditMeta({ table: info.name, pkColumns, editableColumns, columnTypes })
      } catch {
        if (!cancelled) setEditMeta(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [columnsKey, sql, connectionId, dbType])

  if (result.status === 'idle') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-app-fg-soft">
        {t('grid.runQueryToSeeResults')}
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-md items-start gap-2 rounded border border-app-danger/40 bg-app-danger/10 px-3 py-2 text-xs text-app-danger">
          <WarningCircle size={16} className="mt-0.5 shrink-0" />
          <pre className="whitespace-pre-wrap font-mono">{result.error}</pre>
        </div>
      </div>
    )
  }

  if (result.status === 'running') {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-xs text-app-fg-soft">
        <SpinnerGap size={14} className="animate-spin text-app-accent" />
        {t('grid.runningQuery')}
      </div>
    )
  }

  if (!result.columns.length && result.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-app-fg-soft">
        {t('grid.noRowsReturned')}
      </div>
    )
  }

  const handleCopy = async (): Promise<void> => {
    await window.rowport.clipboard.writeText(buildCsv(result.columns, result.rows))
  }

  const handleExportCsv = async (): Promise<void> => {
    const path = await window.rowport.dialog.save({ defaultPath: 'query-results.csv' })
    if (!path) return
    await window.rowport.fs.writeTextFile(path, buildCsv(result.columns, result.rows))
  }

  return (
    <DataGrid
      columns={columns}
      rows={result.rows}
      totalRows={result.paged ? undefined : result.rowCount}
      rowHeight={rowHeight}
      readOnly={readOnly}
      editMeta={editMeta}
      onEditCell={onEditCell}
      footer={
        onLoadMore ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-app-edge bg-app-bg-muted px-3 py-1.5">
            <span className="text-[10px] text-app-fg-soft">
              {result.totalRows != null && result.totalRows > result.rows.length
                ? t('grid.showingRows', {
                    shown: result.rows.length,
                    total: result.totalRows
                  })
                : t('qw.rowsMany', { count: result.rows.length })}
            </span>
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 rounded border border-app-edge bg-app-bg px-2.5 py-1 text-[11px] text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore && <SpinnerGap size={11} className="animate-spin text-app-accent" />}
              {loadingMore ? t('grid.loadingMore') : t('grid.loadMore')}
            </button>
          </div>
        ) : undefined
      }
      toolbar={({ notify }) => (
        <>
          <ToolbarButton
            title={t('grid.copyTableAsCsv')}
            onClick={() =>
              void handleCopy().then(
                () => notify('success', t('grid.csvCopied')),
                (error) => notify('error', error instanceof Error ? error.message : String(error))
              )
            }
          >
            <FileCsv size={11} />
            CSV
          </ToolbarButton>
          <ToolbarButton
            title={t('grid.exportAsCsv')}
            onClick={() =>
              void handleExportCsv().then(
                () => notify('success', t('grid.csvExported')),
                (error) => notify('error', error instanceof Error ? error.message : String(error))
              )
            }
          >
            <FileCsv size={11} />
            {t('grid.export')}
          </ToolbarButton>
        </>
      )}
    />
  )
}
