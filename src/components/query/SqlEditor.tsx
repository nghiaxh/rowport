import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { keymap } from '@codemirror/view'
import { CodeEditor } from '../editor/CodeEditor'
import { sqlExtension } from '../../lib/codemirror'
import { getCachedSqlSchema, type SchemaTable } from '../../lib/schema'
import type { DbType } from '../../types/connection'

interface SqlEditorProps {
  value: string
  dbType: DbType
  connectionId: string
  height: number
  onChange: (value: string) => void
  onRunQuery: () => void
}

export function SqlEditor({
  value,
  dbType,
  connectionId,
  height,
  onChange,
  onRunQuery
}: SqlEditorProps): ReactElement {
  const [tables, setTables] = useState<SchemaTable[]>([])
  const onRunRef = useRef(onRunQuery)

  useEffect(() => {
    onRunRef.current = onRunQuery
  }, [onRunQuery])

  useEffect(() => {
    let cancelled = false
    getCachedSqlSchema(dbType, connectionId)
      .then((schema) => {
        if (!cancelled) setTables(schema)
      })
      .catch(() => {
        if (!cancelled) setTables([])
      })
    return () => {
      cancelled = true
    }
  }, [dbType, connectionId])

  const extensions = useMemo(
    () => [
      sqlExtension(dbType, tables),
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRunRef.current()
            return true
          }
        }
      ])
    ],
    [dbType, tables]
  )

  return (
    <div style={{ height }} className="shrink-0 overflow-hidden border-b border-app-edge bg-app-bg">
      <CodeEditor value={value} height="100%" extensions={extensions} onChange={onChange} />
    </div>
  )
}
