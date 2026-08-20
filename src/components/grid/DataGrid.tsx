import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type CSSProperties
} from 'react'
import { Check, SlidersHorizontal, X } from '@phosphor-icons/react'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type Header,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { EditCellParams } from '../../types/query'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { cn } from '../../lib/utils'
import {
  buildTsv,
  compareCells,
  formatCell,
  isObjectValue,
  validateCellEdit
} from '../../lib/grid-utils'
import { CellDetailsViewer } from './CellDetailsViewer'

export type GridRow = Record<string, unknown>

export interface GridColumn {
  id: string
  header: string
  accessorFn: (row: GridRow, index: number) => unknown
  size?: number
  minSize?: number
  maxSize?: number
  enableResizing?: boolean
  enableSorting?: boolean
  pinned?: 'left' | 'right' | false
}

export interface EditMeta {
  table: string
  pkColumns: string[]
  editableColumns: string[]
  columnTypes: Record<string, string>
}

interface DataGridProps {
  columns: GridColumn[]
  rows: GridRow[]
  totalRows?: number
  readOnly?: boolean
  editMeta?: EditMeta | null
  rowHeight?: number
  onEditCell?: (params: EditCellParams) => Promise<void>
  toolbar?: (api: { notify: (kind: 'success' | 'error', text: string) => void }) => React.ReactNode
  footer?: ReactNode
}

export function ToolbarButton({
  title,
  onClick,
  children
}: {
  title: string
  onClick: () => void
  children: ReactNode
}): ReactElement {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center gap-1 rounded border border-app-edge bg-app-bg px-2.5 py-1 text-[11px] text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
    >
      {children}
    </button>
  )
}

interface EditingState {
  rowIndex: number
  columnId: string
  value: string
}

interface SelectedCell {
  rowIndex: number
  columnId: string
}

interface Notice {
  kind: 'success' | 'error'
  text: string
}

export function DataGrid({
  columns,
  rows,
  totalRows,
  readOnly,
  editMeta,
  onEditCell,
  toolbar,
  footer,
  rowHeight = 32
}: DataGridProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [selected, setSelected] = useState<SelectedCell | null>(null)
  const clickTimerRef = useRef<number | null>(null)
  const [details, setDetails] = useState<{
    rowIndex: number
    columnId: string
  } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const columnsKey = columns.map((column) => column.id).join('\u0000')

  useEffect(() => {
    setSorting([])
    setColumnVisibility({})
    setColumnPinning({})
    setRowSelection({})
    setEditing(null)
    setSelected(null)
    setDetails(null)
    setNotice(null)
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
  }, [columnsKey])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const columnDefs = useMemo<ColumnDef<GridRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        header: column.header,
        accessorFn: column.accessorFn,
        size: column.size,
        minSize: column.minSize,
        maxSize: column.maxSize,
        enableResizing: column.enableResizing,
        enableSorting: column.enableSorting,
        pinned: column.pinned,
        sortingFn: (a, b, columnId) => compareCells(a.getValue(columnId), b.getValue(columnId))
      })),
    [columns]
  )

  const table = useReactTable<GridRow>({
    data: rows,
    columns: columnDefs,
    getRowId: (_row, index) => String(index),
    state: { sorting, columnVisibility, columnPinning, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
    enableSortingRemoval: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  const { rows: modelRows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: modelRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    overscan: 12
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const headerGroups = table.getHeaderGroups()
  const selectedRows = table.getSelectedRowModel().rows
  const canEdit = editMeta !== null && onEditCell !== undefined && !readOnly

  function pinnedStyle(column: Column<GridRow, unknown>): CSSProperties {
    const pinned = column.getIsPinned()
    if (!pinned) return {}
    return {
      position: 'sticky' as const,
      left: pinned === 'left' ? `${column.getStart('left')}px` : undefined,
      right: pinned === 'right' ? `${column.getAfter('right')}px` : undefined
    }
  }

  function notify(kind: 'success' | 'error', text: string): void {
    setNotice({ kind, text })
  }

  async function copyCell(value: unknown): Promise<void> {
    const text = formatCell(value)
    await window.rowport.clipboard.writeText(text)
    notify('success', text.length > 40 ? `Copied ${text.slice(0, 40)}…` : `Copied ${text}`)
  }

  async function copySelected(format: 'json' | 'tsv'): Promise<void> {
    const data = selectedRows.map((row) => row.original)
    const text =
      format === 'json'
        ? JSON.stringify(data, null, 2)
        : buildTsv(
            columns.filter((c) => c.id !== '__select' && c.id !== '__index').map((c) => c.id),
            data
          )
    await window.rowport.clipboard.writeText(text)
    notify('success', `${data.length} rows copied`)
  }

  function startEdit(rowIndex: number, columnId: string, value: unknown): void {
    if (!canEdit || !editMeta) return
    if (editMeta.pkColumns.includes(columnId)) {
      notify('error', 'Primary key columns cannot be edited')
      return
    }
    if (!editMeta.editableColumns.includes(columnId)) {
      notify('error', 'This column is not editable')
      return
    }
    setEditing({
      rowIndex,
      columnId,
      value: value === null ? '' : formatCell(value)
    })
  }

  async function commitEdit(): Promise<void> {
    if (!editing || !editMeta || !onEditCell) return
    const { rowIndex, columnId, value } = editing
    const row = modelRows[rowIndex]
    if (!row) return
    if (
      editMeta.pkColumns.some((pk) => row.original[pk] === null || row.original[pk] === undefined)
    ) {
      notify('error', 'Primary key values missing in result')
      setEditing(null)
      return
    }
    const validation = validateCellEdit(
      value,
      editMeta.columnTypes[columnId],
      isObjectValue(row.original[columnId])
    )
    if (!validation.ok) {
      notify('error', validation.error)
      setEditing(null)
      return
    }
    try {
      await onEditCell({
        table: editMeta.table,
        column: columnId,
        pkColumns: editMeta.pkColumns,
        row: row.original,
        value: validation.value
      })
      notify('success', 'Row updated')
    } catch (error) {
      notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setEditing(null)
    }
  }

  function handleCellClick(rowIndex: number, columnId: string): void {
    setSelected({ rowIndex, columnId })
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    clickTimerRef.current = window.setTimeout(() => {
      setDetails({ rowIndex, columnId })
    }, 220)
  }

  function handleCellDoubleClick(rowIndex: number, columnId: string, value: unknown): void {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current)
    startEdit(rowIndex, columnId, value)
  }

  function handleContainerKeyDown(event: React.KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement) return
    if (!selected) return
    const columnsList = table.getVisibleLeafColumns()
    const columnIndex = columnsList.findIndex((column) => column.id === selected.columnId)
    let next: SelectedCell | null = null
    switch (event.key) {
      case 'ArrowDown':
        next = {
          rowIndex: Math.min(selected.rowIndex + 1, modelRows.length - 1),
          columnId: selected.columnId
        }
        break
      case 'ArrowUp':
        next = {
          rowIndex: Math.max(selected.rowIndex - 1, 0),
          columnId: selected.columnId
        }
        break
      case 'ArrowRight': {
        const right = columnsList[columnIndex + 1]
        if (right) next = { rowIndex: selected.rowIndex, columnId: right.id }
        break
      }
      case 'ArrowLeft': {
        const left = columnsList[columnIndex - 1]
        if (left) next = { rowIndex: selected.rowIndex, columnId: left.id }
        break
      }
      case 'Enter': {
        event.preventDefault()
        const row = modelRows[selected.rowIndex]
        if (row) {
          startEdit(selected.rowIndex, selected.columnId, row.original[selected.columnId])
        }
        return
      }
      case 'Escape':
        setSelected(null)
        return
      default:
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
          const row = modelRows[selected.rowIndex]
          if (row) void copyCell(row.original[selected.columnId])
        }
        return
    }
    if (next) {
      event.preventDefault()
      setSelected(next)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-app-edge bg-app-bg-muted px-2">
        {toolbar?.({ notify })}
        <div className="flex-1" />
        {selectedRows.length > 0 && (
          <>
            <span className="mr-1 text-[10px] text-app-fg-soft">
              {selectedRows.length} selected
            </span>
            <ToolbarButton
              title="Copy selected rows as JSON"
              onClick={() => void copySelected('json')}
            >
              JSON
            </ToolbarButton>
            <ToolbarButton
              title="Copy selected rows as TSV"
              onClick={() => void copySelected('tsv')}
            >
              TSV
            </ToolbarButton>
          </>
        )}
        <ColumnSettingsMenu table={table} />
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleContainerKeyDown}
        className="relative min-h-0 flex-1 overflow-auto outline-none"
      >
        <table className="min-w-full border-collapse" style={{ display: 'grid' }}>
          <thead
            className="z-10 bg-app-bg-muted"
            style={{ display: 'grid', position: 'sticky', top: 0 }}
          >
            {headerGroups.map((headerGroup) => (
              <tr key={headerGroup.id} className="flex w-full" style={{ display: 'flex' }}>
                {headerGroup.headers.map((header) => (
                  <HeaderCell
                    key={header.id}
                    header={header}
                    pinnedStyle={pinnedStyle(header.column)}
                  />
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            className="relative"
            style={{ display: 'grid', height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const row = modelRows[virtualRow.index]
              if (!row) return null
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%'
                  }}
                  className={cn('hover:bg-app-bg-soft', row.getIsSelected() && 'bg-app-accent/10')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <BodyCell
                      key={cell.id}
                      table={table}
                      row={row}
                      columnId={cell.column.id}
                      rowIndex={virtualRow.index}
                      rowHeight={rowHeight}
                      value={cell.getValue()}
                      style={pinnedStyle(cell.column)}
                      editing={
                        editing?.rowIndex === virtualRow.index &&
                        editing?.columnId === cell.column.id
                      }
                      editingValue={editing?.value ?? ''}
                      selected={
                        selected?.rowIndex === virtualRow.index &&
                        selected?.columnId === cell.column.id
                      }
                      editable={!!(canEdit && editMeta?.editableColumns.includes(cell.column.id))}
                      onEditingChange={(value) =>
                        setEditing((current) => (current ? { ...current, value } : current))
                      }
                      onCommit={commitEdit}
                      onCancelEdit={() => setEditing(null)}
                      onClick={handleCellClick}
                      onDoubleClick={handleCellDoubleClick}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {footer ??
        (totalRows !== undefined && totalRows > modelRows.length && (
          <div className="shrink-0 border-t border-app-edge bg-app-bg-muted px-3 py-1.5 text-[10px] text-app-fg-soft">
            Showing first {modelRows.length} of {totalRows} rows
          </div>
        ))}

      {notice && (
        <div
          className={cn(
            'absolute bottom-2 right-2 z-40 flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] shadow-lg',
            notice.kind === 'success' ? 'bg-app-bg text-app-fg' : 'bg-app-bg text-app-danger'
          )}
        >
          {notice.kind === 'success' ? (
            <Check size={11} className="text-app-success" />
          ) : (
            <X size={11} className="text-app-danger" />
          )}
          <span className="max-w-80 wrap-break-words">{notice.text}</span>
        </div>
      )}

      <CellDetailsViewer
        open={details !== null}
        rows={modelRows.map((modelRow) => modelRow.original)}
        columns={columns.filter((column) => column.id !== '__select' && column.id !== '__index')}
        rowIndex={details?.rowIndex ?? 0}
        columnId={details?.columnId ?? ''}
        readOnly={readOnly}
        editMeta={editMeta}
        onEditCell={onEditCell}
        onSelectCell={(rowIndex, columnId) => setDetails({ rowIndex, columnId })}
        onClose={() => setDetails(null)}
      />
    </div>
  )
}

function HeaderCell({
  header,
  pinnedStyle
}: {
  header: Header<GridRow, unknown>
  pinnedStyle: CSSProperties
}): ReactElement {
  const pinned = header.column.getIsPinned()
  const isSorted = header.column.getIsSorted()
  return (
    <th
      style={{
        width: header.getSize(),
        ...pinnedStyle,
        position: pinnedStyle.position ?? 'relative',
        zIndex: pinned ? 2 : 1
      }}
      className={cn(
        'flex shrink-0 items-center border-b border-r border-app-edge bg-app-bg-muted px-2 py-1 text-left text-[11px] font-medium',
        pinned ? 'text-app-fg' : 'text-app-fg-muted'
      )}
    >
      <span
        role="button"
        tabIndex={0}
        title={header.column.getCanSort() ? 'Click to sort' : undefined}
        onClick={header.column.getToggleSortingHandler()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            header.column.getToggleSortingHandler()?.(event)
          }
        }}
        className={cn(
          'flex min-w-0 flex-1 cursor-pointer select-none items-center gap-1 truncate',
          isSorted && 'text-app-fg'
        )}
      >
        <span className="truncate">{header.column.columnDef.header as string}</span>
        <span className="shrink-0 text-app-fg-soft">
          {isSorted === 'asc' ? (
            <ArrowUpDown dir="asc" />
          ) : isSorted === 'desc' ? (
            <ArrowUpDown dir="desc" />
          ) : (
            header.column.getCanSort() && <ArrowUpDown dir="none" />
          )}
        </span>
      </span>
      {header.column.getCanResize() && (
        <div
          onPointerDown={header.getResizeHandler()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={header.column.resetSize}
          title="Drag to resize · Double-click to reset"
          className={cn(
            'absolute -right-px top-0 h-full w-1 cursor-col-resize touch-none select-none',
            header.column.getIsResizing()
              ? 'bg-app-accent'
              : 'bg-transparent hover:bg-app-accent/60'
          )}
        />
      )}
    </th>
  )
}

function ArrowUpDown({ dir }: { dir: 'asc' | 'desc' | 'none' }): ReactElement {
  const className = 'shrink-0 text-[9px]'
  if (dir === 'asc') return <span className={className}>▲</span>
  if (dir === 'desc') return <span className={className}>▼</span>
  return <span className={cn(className, 'opacity-60')}>⇅</span>
}

interface BodyCellProps {
  table: Table<GridRow>
  row: Row<GridRow>
  columnId: string
  rowIndex: number
  rowHeight: number
  value: unknown
  style: React.CSSProperties
  editing: boolean
  editingValue: string
  selected: boolean
  editable: boolean
  onEditingChange: (value: string) => void
  onCommit: () => void
  onCancelEdit: () => void
  onClick: (rowIndex: number, columnId: string) => void
  onDoubleClick: (rowIndex: number, columnId: string, value: unknown) => void
}

function BodyCell({
  table,
  row,
  columnId,
  rowIndex,
  rowHeight,
  value,
  style,
  editing,
  editingValue,
  selected,
  editable,
  onEditingChange,
  onCommit,
  onCancelEdit,
  onClick,
  onDoubleClick
}: BodyCellProps): ReactElement {
  const isNull = value === null || value === undefined
  const pinned = style.position === 'sticky'
  const isDataColumn = columnId !== '__select' && columnId !== '__index'
  const nullDisplay = useSettingsStore((s) => s.nullDisplay)

  let content: React.ReactNode
  if (editing) {
    content = (
      <input
        autoFocus
        value={editingValue}
        onChange={(event) => onEditingChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.stopPropagation()
            onCommit()
          }
          if (event.key === 'Escape') {
            event.stopPropagation()
            onCancelEdit()
          }
        }}
        onBlur={onCancelEdit}
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded border border-app-accent bg-app-bg px-1 py-0.5 font-mono text-xs text-app-fg outline-none"
      />
    )
  } else if (columnId === '__select') {
    content = (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(event) => event.stopPropagation()}
        className="size-4 accent-app-accent"
      />
    )
  } else if (columnId === '__index') {
    content = <span className="font-mono text-app-fg-soft">{rowIndex + 1}</span>
  } else if (isNull) {
    content = (
      <span className="truncate font-mono text-app-fg-soft">
        {nullDisplay === 'empty' ? '' : nullDisplay}
      </span>
    )
  } else {
    content = <span className="truncate font-mono text-app-fg">{formatCell(value)}</span>
  }

  return (
    <td
      style={{ width: table.getColumn(columnId)?.getSize() ?? 80, height: rowHeight, ...style }}
      title={
        editable && isDataColumn
          ? 'Click for details · Double-click to edit'
          : isDataColumn
            ? 'Click for details'
            : undefined
      }
      onClick={
        isDataColumn
          ? (event) => {
              event.stopPropagation()
              onClick(rowIndex, columnId)
            }
          : undefined
      }
      onDoubleClick={isDataColumn ? () => onDoubleClick(rowIndex, columnId, value) : undefined}
      className={cn(
        'flex shrink-0 items-center gap-1 overflow-hidden border-b border-r border-app-edge px-2 text-xs',
        pinned ? 'bg-app-bg-muted' : 'bg-app-bg',
        row.getIsSelected() && !pinned && 'bg-app-accent/10',
        selected && 'ring-1 ring-inset ring-app-accent',
        isDataColumn && (editable ? 'cursor-text' : 'cursor-pointer')
      )}
    >
      {content}
    </td>
  )
}

function ColumnSettingsMenu({ table }: { table: Table<GridRow> }): ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide())

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Column settings"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex size-7 items-center justify-center rounded text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg',
          open && 'bg-app-bg-soft text-app-fg'
        )}
      >
        <SlidersHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded border border-app-edge bg-app-bg shadow-lg">
          <div className="flex items-center justify-between border-b border-app-edge px-2 py-1.5 text-[10px] text-app-fg-soft">
            <span>Columns</span>
            <button
              type="button"
              className="text-app-fg-muted hover:text-app-fg"
              onClick={() => table.resetColumnSizing(true)}
            >
              Reset widths
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {columns.map((column) => {
              const pinned = column.getIsPinned()
              return (
                <div
                  key={column.id}
                  className="flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-app-bg-soft"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="size-4 accent-app-accent"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-app-fg">
                    {column.columnDef.header as string}
                  </span>
                  <button
                    type="button"
                    title="Pin left"
                    onClick={() => column.pin(pinned === 'left' ? false : 'left')}
                    className={cn(
                      'flex size-6 items-center justify-center rounded text-[10px]',
                      pinned === 'left'
                        ? 'bg-app-accent/20 text-app-accent'
                        : 'text-app-fg-soft hover:text-app-fg'
                    )}
                  >
                    L
                  </button>
                  <button
                    type="button"
                    title="Pin right"
                    onClick={() => column.pin(pinned === 'right' ? false : 'right')}
                    className={cn(
                      'flex size-6 items-center justify-center rounded text-[10px]',
                      pinned === 'right'
                        ? 'bg-app-accent/20 text-app-accent'
                        : 'text-app-fg-soft hover:text-app-fg'
                    )}
                  >
                    R
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
