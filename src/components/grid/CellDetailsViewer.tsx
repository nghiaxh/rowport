import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, PencilSimple, SpinnerGap, X } from '@phosphor-icons/react'
import { Button, Modal } from '@heroui/react'
import type { EditCellParams } from '../../types/query'
import { formatCell, isObjectValue, validateCellEdit } from '../../lib/grid-utils'
import type { EditMeta, GridRow } from './DataGrid'
import { cn } from '../../lib/utils'

type FieldColumn = { id: string; header: string }

type CellDetailsViewerProps = {
  open: boolean
  rows: GridRow[]
  columns: FieldColumn[]
  rowIndex: number
  columnId: string
  readOnly?: boolean
  editMeta?: EditMeta | null
  onEditCell?: (params: EditCellParams) => Promise<void>
  onSelectCell: (rowIndex: number, columnId: string) => void
  onClose: () => void
}

const JSON_TOKEN_RE = /"(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g

function renderJson(value: string): ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let keyIndex = 0
  let match: RegExpExecArray | null
  JSON_TOKEN_RE.lastIndex = 0
  while ((match = JSON_TOKEN_RE.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index))
    }
    const token = match[0]
    let className: string | undefined
    if (token.startsWith('"')) {
      const rest = value.slice(match.index + token.length)
      const skip = rest.match(/^\s*/)?.[0].length ?? 0
      className = rest[skip] === ':' ? 'text-app-accent' : 'text-app-success'
    } else if (token === 'true' || token === 'false') {
      className = 'text-app-warning'
    } else if (token === 'null') {
      className = 'italic text-app-fg-soft'
    } else {
      className = 'text-app-info'
    }
    nodes.push(
      <span key={keyIndex++} className={cn(className)}>
        {token}
      </span>
    )
    lastIndex = match.index + token.length
  }
  if (lastIndex < value.length) nodes.push(value.slice(lastIndex))
  return nodes
}

export function CellDetailsViewer({
  open,
  rows,
  columns,
  rowIndex,
  columnId,
  readOnly,
  editMeta,
  onEditCell,
  onSelectCell,
  onClose
}: CellDetailsViewerProps): ReactElement {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const clampedRowIndex = Math.min(rowIndex, Math.max(rows.length - 1, 0))
  const row = rows[clampedRowIndex]
  const value = row?.[columnId]
  const dataType = columnId ? editMeta?.columnTypes[columnId] : undefined
  const isJsonValue = isObjectValue(value) || /json/i.test(dataType ?? '')
  const isNull = value === null || value === undefined
  const pretty =
    value === undefined
      ? ''
      : isObjectValue(value)
        ? JSON.stringify(value, null, 2)
        : formatCell(value)
  const valueType =
    dataType ?? (isNull ? (value === undefined ? 'undefined' : 'null') : typeof value)
  const editable = !!(
    !readOnly &&
    editMeta &&
    columnId &&
    !editMeta.pkColumns.includes(columnId) &&
    editMeta.editableColumns.includes(columnId) &&
    onEditCell
  )
  const canPrev = rowIndex > 0
  const canNext = rowIndex < rows.length - 1

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (editing) return
      if (event.key === 'ArrowUp' && rowIndex > 0) {
        event.preventDefault()
        onSelectCell(rowIndex - 1, columnId)
      } else if (event.key === 'ArrowDown' && rowIndex < rows.length - 1) {
        event.preventDefault()
        onSelectCell(rowIndex + 1, columnId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, editing, rowIndex, columnId, rows.length, onClose, onSelectCell])

  useEffect(() => {
    if (open) {
      setEditing(false)
      setEditError(null)
      setSaving(false)
    }
  }, [open])

  function selectField(fieldId: string): void {
    if (fieldId === columnId) return
    setEditing(false)
    setEditError(null)
    onSelectCell(rowIndex, fieldId)
  }

  function goPrev(): void {
    if (!canPrev) return
    setEditing(false)
    setEditError(null)
    onSelectCell(rowIndex - 1, columnId)
  }

  function goNext(): void {
    if (!canNext) return
    setEditing(false)
    setEditError(null)
    onSelectCell(rowIndex + 1, columnId)
  }

  function startEdit(): void {
    if (!columnId) return
    setDraft(isNull ? '' : pretty)
    setEditError(null)
    setEditing(true)
  }

  function cancelEdit(): void {
    setEditing(false)
    setEditError(null)
  }

  async function handleCopy(): Promise<void> {
    await window.rowport.clipboard.writeText(editing ? draft : pretty)
  }

  async function handleSave(): Promise<void> {
    if (!columnId || !row || !editMeta || !onEditCell) return
    const validation = validateCellEdit(draft, editMeta.columnTypes[columnId], isJsonValue)
    if (!validation.ok) {
      setEditError(validation.error)
      return
    }
    setSaving(true)
    setEditError(null)
    try {
      await onEditCell({
        table: editMeta.table,
        column: columnId,
        pkColumns: editMeta.pkColumns,
        row,
        value: validation.value
      })
      onClose()
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onClose}>
      <Modal.Container className="max-w-3xl">
        <Modal.Dialog>
          <Modal.Header>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate font-mono text-xs text-app-fg-muted">
                {columnId} · row {clampedRowIndex + 1} of {rows.length}
              </span>
              {dataType && (
                <span className="shrink-0 rounded bg-app-bg-soft px-1.5 py-0.5 font-mono text-[10px] text-app-fg-soft">
                  {dataType}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                isDisabled={!canPrev || editing}
                aria-label="Previous row"
                onPress={goPrev}
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                isDisabled={!canNext || editing}
                aria-label="Next row"
                onPress={goNext}
              >
                <ArrowDown size={14} />
              </Button>
              {!editing && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label="Copy"
                  onPress={() => void handleCopy()}
                >
                  <Copy size={14} />
                </Button>
              )}
              <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}>
                <X size={14} />
              </Button>
            </div>
          </Modal.Header>
          <Modal.Body>
            <div className="grid min-h-0 grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-3">
              <div className="max-h-[26rem] overflow-y-auto rounded border border-app-edge bg-app-bg-muted">
                {columns.map((column) => {
                  const active = column.id === columnId
                  const cellValue = row?.[column.id]
                  const cellNull = cellValue === null || cellValue === undefined
                  return (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => selectField(column.id)}
                      className={cn(
                        'flex w-full items-center gap-2 border-b border-app-edge px-2 py-1.5 text-left last:border-b-0',
                        active
                          ? 'bg-app-accent/10 ring-1 ring-inset ring-app-accent'
                          : 'hover:bg-app-bg-soft'
                      )}
                    >
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate font-mono text-[11px]',
                          active ? 'text-app-fg' : 'text-app-fg-muted'
                        )}
                      >
                        {column.header}
                      </span>
                      {cellNull ? (
                        <span className="shrink-0 italic text-app-fg-soft">NULL</span>
                      ) : (
                        <span className="max-w-32 shrink-0 truncate font-mono text-[10px] text-app-fg-soft">
                          {formatCell(cellValue)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-app-fg-soft">
                  <span className="rounded bg-app-bg-soft px-1.5 py-0.5">{valueType}</span>
                  {isNull ? (
                    <span className="rounded bg-app-bg-soft px-1.5 py-0.5 italic">NULL</span>
                  ) : (
                    <span className="rounded bg-app-bg-soft px-1.5 py-0.5">
                      {pretty.length} chars
                    </span>
                  )}
                  {editing && (
                    <span className="rounded bg-app-accent/20 px-1.5 py-0.5 text-app-accent">
                      Editing
                    </span>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    {isJsonValue ? (
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.currentTarget.value)}
                        spellCheck={false}
                        className="h-64 w-full resize-none rounded border border-app-edge bg-app-bg-muted p-2 font-mono text-xs leading-relaxed text-app-fg outline-none focus:border-app-accent"
                      />
                    ) : (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(event) => setDraft(event.currentTarget.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void handleSave()
                        }}
                        spellCheck={false}
                        className="w-full rounded border border-app-edge bg-app-bg-muted px-2 py-1.5 font-mono text-xs text-app-fg outline-none focus:border-app-accent"
                      />
                    )}
                    {editError && (
                      <p className="flex items-start gap-1.5 rounded border border-app-danger/40 bg-app-danger/10 px-2 py-1.5 text-xs text-app-danger">
                        <X size={12} className="mt-0.5 shrink-0" />
                        <span className="min-w-0 wrap-break-words">{editError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <pre className="max-h-96 min-h-24 overflow-auto whitespace-pre-wrap wrap-break-words rounded border border-app-edge bg-app-bg-muted p-3 font-mono text-xs leading-relaxed text-app-fg">
                    {isJsonValue ? renderJson(pretty) : pretty}
                  </pre>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            {editing ? (
              <>
                <Button variant="secondary" isDisabled={saving} onPress={cancelEdit}>
                  Cancel
                </Button>
                <Button variant="primary" isDisabled={saving} onPress={() => void handleSave()}>
                  {saving ? <SpinnerGap size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </Button>
              </>
            ) : (
              <>
                {editable && (
                  <Button variant="secondary" onPress={startEdit}>
                    <PencilSimple size={14} />
                    Edit
                  </Button>
                )}
                <Button variant="primary" onPress={() => void handleCopy()}>
                  <Copy size={14} />
                  Copy
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
