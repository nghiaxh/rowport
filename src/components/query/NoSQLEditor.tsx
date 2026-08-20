import { useEffect, useRef, useState, type ReactElement } from 'react'
import { Play, X } from '@phosphor-icons/react'
import { json } from '@codemirror/lang-json'
import { keymap } from '@codemirror/view'
import { CodeEditor } from '../editor/CodeEditor'
import { mongoApi } from '../../lib/electron-api'
import { useConnectionStore } from '../../stores/useConnectionStore'
import type { MongoQueryState } from '../../types/query'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import { Button } from '@heroui/react'

interface NoSQLEditorProps {
  mongo: MongoQueryState
  connectionId: string
  height: number
  onChange: (mongo: MongoQueryState) => void
  onRun: () => void
  onCancel?: () => void
  isRunning?: boolean
}

export function NoSQLEditor({
  mongo,
  connectionId,
  height,
  onChange,
  onRun,
  onCancel,
  isRunning = false
}: NoSQLEditorProps): ReactElement {
  const t = useT()
  const fixedDatabase =
    useConnectionStore((s) => s.connections.find((c) => c.id === connectionId))?.database ?? ''
  const [collections, setCollections] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onRunRef.current = onRun
  }, [onRun])

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    if (mongo.database !== fixedDatabase) {
      onChangeRef.current({
        ...mongo,
        database: fixedDatabase,
        collection: fixedDatabase ? mongo.collection : ''
      })
    }
  }, [fixedDatabase, mongo])

  // biome-ignore lint/correctness/useExhaustiveDependencies: sync collections only on connection/database change
  useEffect(() => {
    if (!mongo.database) return
    let cancelled = false
    mongoApi
      .listCollections(connectionId, mongo.database)
      .then((cols) => {
        if (cancelled) return
        setCollections(cols)
        setError(null)
        if (!cols.includes(mongo.collection)) {
          const first = cols[0]
          if (first) onChangeRef.current({ ...mongo, collection: first })
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setCollections([])
          setError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [connectionId, mongo.database])

  const controlsHeight = 42
  const editorsHeight = height - controlsHeight

  const runKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        onRunRef.current()
        return true
      }
    }
  ])

  return (
    <div
      style={{ height }}
      className="flex shrink-0 flex-col overflow-hidden border-b border-app-edge bg-app-bg-muted"
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <MongoSelect
          title={t('mongo.collection')}
          value={mongo.collection}
          options={collections}
          placeholder={t('mongo.selectCollection')}
          disabled={!fixedDatabase}
          onChange={(value) => onChangeRef.current({ ...mongo, collection: value })}
        />
        <div className="flex items-center gap-0.5 rounded border border-app-edge bg-app-bg p-0.5">
          {(['find', 'aggregate'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeRef.current({ ...mongo, mode })}
              className={cn(
                'rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                mongo.mode === mode
                  ? 'bg-app-accent/20 text-app-accent'
                  : 'text-app-fg-muted hover:text-app-fg'
              )}
            >
              {mode}
            </button>
          ))}
        </div>
        <label
          className="flex items-center gap-1 text-[10px] text-app-fg-muted"
          title={t('mongo.documentLimit')}
        >
          {t('mongo.limit')}
          <input
            type="number"
            min={1}
            max={5000}
            value={mongo.limit}
            onChange={(event) =>
              onChangeRef.current({
                ...mongo,
                limit: Number(event.currentTarget.value) || 1000
              })
            }
            className="w-16 rounded border border-app-edge bg-app-bg px-1.5 py-1 text-[11px] text-app-fg outline-none focus:border-app-accent"
          />
        </label>
        {!fixedDatabase && (
          <span
            className="min-w-0 max-w-56 truncate text-[10px] text-app-warning"
            title={t('mongo.noDatabase')}
          >
            {t('mongo.noDatabase')}
          </span>
        )}
        {error && (
          <span className="min-w-0 flex-1 truncate text-[10px] text-app-danger">{error}</span>
        )}
        <div className="flex-1" />
        {isRunning ? (
          <Button
            variant="ghost"
            size="md"
            onPress={() => void onCancelRef.current?.()}
            className="flex items-center gap-1"
          >
            <X size={13} />
            {t('common.cancel')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onPress={() => void onRunRef.current()}
            className="flex items-center gap-1"
          >
            <Play size={13} />
            {t('mongo.run')}
          </Button>
        )}
      </div>
      {mongo.mode === 'find' ? (
        <div className="flex min-h-0 flex-1">
          <JsonPane
            label={t('mongo.filter')}
            value={mongo.filterJson}
            height={editorsHeight}
            onChange={(value) => onChangeRef.current({ ...mongo, filterJson: value })}
            extensions={[runKeymap]}
          />
          <div className="w-px shrink-0 bg-app-edge" />
          <JsonPane
            label={t('mongo.options')}
            value={mongo.optionsJson}
            height={editorsHeight}
            onChange={(value) => onChangeRef.current({ ...mongo, optionsJson: value })}
            extensions={[runKeymap]}
          />
        </div>
      ) : (
        <JsonPane
          label={t('mongo.pipeline')}
          value={mongo.pipelineJson}
          height={editorsHeight}
          onChange={(value) => onChangeRef.current({ ...mongo, pipelineJson: value })}
          extensions={[runKeymap]}
        />
      )}
    </div>
  )
}

function MongoSelect({
  title,
  value,
  options,
  placeholder,
  disabled,
  onChange
}: {
  title: string
  value: string
  options: string[]
  placeholder: string
  disabled?: boolean
  onChange: (value: string) => void
}): ReactElement {
  return (
    <label className="flex items-center gap-1 text-[11px] text-app-fg-muted">
      {title}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="max-w-44 rounded border border-app-edge bg-app-bg px-2 py-1 text-[11px] text-app-fg outline-none focus:border-app-accent"
      >
        {!value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function JsonPane({
  label,
  value,
  height,
  onChange,
  extensions
}: {
  label: string
  value: string
  height: number
  onChange: (value: string) => void
  extensions?: import('@codemirror/state').Extension[]
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-app-edge px-2 py-1 text-[11px] text-app-fg-soft">
        {label}
      </div>
      <CodeEditor
        value={value}
        height={height - 24}
        extensions={[json(), ...(extensions ?? [])]}
        onChange={onChange}
      />
    </div>
  )
}
