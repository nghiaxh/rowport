import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { Button, Input, Modal } from '@heroui/react'
import {
  ArrowsClockwise,
  CheckCircle,
  FolderOpen,
  SpinnerGap,
  WarningCircle
} from '@phosphor-icons/react'
import type {
  Connection,
  ConnectionInput,
  DbType,
  DetectedServer,
  SslMode
} from '../../types/connection'
import { useConnectionStore, type TestResult } from '../../stores/useConnectionStore'
import { parseConnectionString } from '../../lib/connection-uri'
import { detectionApi } from '../../lib/electron-api'
import { ColorTagPicker } from '../common/ColorTagPicker'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

interface ConnectionFormProps {
  open: boolean
  onClose: () => void
  existing?: Connection | null
  onCreated?: (id: string) => void
  folderId?: string | null
}

const DB_TYPE_OPTIONS: Array<{ value: DbType; label: string }> = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mongodb', label: 'MongoDB' }
]

const DB_TYPE_LABELS: Record<DbType, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  sqlite: 'SQLite',
  mongodb: 'MongoDB'
}

const SSL_OPTIONS: Array<{ value: SslMode; label: string }> = [
  { value: 'disable', label: 'Disable' },
  { value: 'require', label: 'Require' },
  { value: 'verify-full', label: 'Verify full' }
]

function defaultPort(dbType: DbType): number {
  switch (dbType) {
    case 'postgres':
      return 5432
    case 'mysql':
      return 3306
    case 'mongodb':
      return 27017
    default:
      return 0
  }
}

function emptyInput(): ConnectionInput {
  return {
    name: '',
    dbType: 'postgres',
    host: '',
    port: 5432,
    username: '',
    password: '',
    database: '',
    filePath: '',
    uri: '',
    sslMode: 'disable',
    readOnly: false,
    folderId: null
  }
}

function toInput(existing: Connection): ConnectionInput {
  const parsed =
    existing.dbType === 'mongodb' && existing.uri ? parseConnectionString(existing.uri) : null
  return {
    name: existing.name,
    dbType: existing.dbType,
    host: existing.host ?? parsed?.host ?? '',
    port: existing.port ?? parsed?.port ?? defaultPort(existing.dbType),
    username: existing.username ?? parsed?.username ?? '',
    password: parsed?.password ?? '',
    database: existing.database ?? parsed?.database ?? '',
    filePath: existing.filePath ?? '',
    uri: existing.uri ?? parsed?.uri ?? '',
    sslMode: existing.sslMode,
    readOnly: existing.readOnly,
    folderId: existing.folderId
  }
}

function fileNameOf(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath
  return base.replace(/\.(db|sqlite|sqlite3)$/i, '') || base
}

function normalizeDefaults(input: ConnectionInput): ConnectionInput {
  if (input.dbType === 'postgres' || input.dbType === 'mysql') {
    return {
      ...input,
      port: input.port || defaultPort(input.dbType),
      host: input.host.trim() || 'localhost',
      username: input.username.trim() || (input.dbType === 'postgres' ? 'postgres' : 'root'),
      database: input.database.trim() || (input.dbType === 'postgres' ? 'postgres' : 'mysql'),
      name: input.name.trim() || input.database.trim() || 'Connection'
    }
  }
  if (input.dbType === 'mongodb') {
    return {
      ...input,
      port: input.port || defaultPort(input.dbType),
      host: input.host.trim() || 'localhost',
      name: input.name.trim() || input.database.trim() || input.host.trim() || 'Connection'
    }
  }
  return {
    ...input,
    name: input.name.trim() || (input.filePath ? fileNameOf(input.filePath) : 'Connection')
  }
}

export function ConnectionForm({
  open,
  onClose,
  existing,
  onCreated,
  folderId = null
}: ConnectionFormProps): ReactElement {
  const t = useT()
  const addConnection = useConnectionStore((s) => s.addConnection)
  const editConnection = useConnectionStore((s) => s.editConnection)
  const testConnection = useConnectionStore((s) => s.testConnection)
  const listDatabases = useConnectionStore((s) => s.listDatabases)
  const folders = useConnectionStore((s) => s.folders)

  const [form, setForm] = useState<ConnectionInput>(() => ({
    ...emptyInput(),
    folderId
  }))
  const formRef = useRef(form)
  formRef.current = form
  const [parseHint, setParseHint] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedServer[]>([])
  const [detecting, setDetecting] = useState(false)
  const [databases, setDatabases] = useState<string[]>([])
  const [loadingDatabases, setLoadingDatabases] = useState(false)
  const [databasesError, setDatabasesError] = useState<string | null>(null)

  const detectLocalServers = useCallback(async (): Promise<void> => {
    setDetecting(true)
    try {
      const servers = await detectionApi.detectLocalServers()
      if (!servers.length) return
      setDetected(servers)
      setForm((current) => {
        if (current.host.trim()) return current
        const preferred = servers.find((server) => server.dbType === current.dbType) ?? servers[0]
        if (!preferred) return current
        return {
          ...current,
          dbType: preferred.dbType,
          host: preferred.host,
          port: preferred.port
        }
      })
    } catch {
      setDetected([])
    } finally {
      setDetecting(false)
    }
  }, [setForm, setDetected, setDetecting])

  useEffect(() => {
    if (open) {
      setForm(existing ? toInput(existing) : emptyInput())
      setParseHint(null)
      setTestResult(null)
      setTesting(false)
      setError(null)
      setDetected([])
      setDetecting(false)
      setDatabases([])
      setLoadingDatabases(false)
      setDatabasesError(null)
      if (!existing) void detectLocalServers()
    }
  }, [open, existing, detectLocalServers])

  const needsCredentialsToLoad =
    (form.dbType === 'postgres' || form.dbType === 'mysql') && !form.password && !existing?.id

  const loadDatabases = useCallback(async (): Promise<void> => {
    const current = formRef.current
    if (current.dbType === 'sqlite' || !current.host.trim()) return
    setLoadingDatabases(true)
    setDatabasesError(null)
    try {
      const list = await listDatabases(current, existing?.id ?? null)
      setDatabases(list)
    } catch (error) {
      setDatabases([])
      setDatabasesError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoadingDatabases(false)
    }
  }, [existing?.id, listDatabases])

  useEffect(() => {
    if (!open || form.dbType === 'sqlite' || !form.host.trim() || needsCredentialsToLoad) return
    void loadDatabases()
  }, [open, form.dbType, form.host, needsCredentialsToLoad, loadDatabases])

  function setField<K extends keyof ConnectionInput>(key: K, value: ConnectionInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleDbTypeChange(value: DbType): void {
    setForm((current) => ({
      ...current,
      dbType: value,
      port: defaultPort(value)
    }))
  }

  async function handleTest(): Promise<void> {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(normalizeDefaults(form), existing?.id ?? null)
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, error: 'Test failed unexpectedly' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      const input = normalizeDefaults(form)
      if (existing) {
        await editConnection(existing.id, input)
        onClose()
      } else {
        const id = await addConnection(input)
        onClose()
        onCreated?.(id)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function browseSqliteFile(): Promise<void> {
    const file = await window.rowport.dialog.open({
      filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }]
    })
    if (typeof file === 'string') {
      setField('filePath', file)
    }
  }

  const isSql = form.dbType === 'postgres' || form.dbType === 'mysql'
  const isSqlite = form.dbType === 'sqlite'
  const isMongo = form.dbType === 'mongodb'

  const testResultClass = testResult?.ok ? 'text-app-success' : 'text-app-danger'
  const usernamePlaceholder =
    form.dbType === 'postgres' ? 'postgres' : form.dbType === 'mysql' ? 'root' : 'username'

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      isDismissable={false}
    >
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{existing ? t('conn.titleEdit') : t('conn.titleNew')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="grid gap-3">
              {detecting && (
                <div className="flex items-center gap-2 text-xs text-app-fg-muted">
                  <SpinnerGap size={14} className="animate-spin" />
                  <span>Scanning for local databases…</span>
                </div>
              )}

              {!detecting && detected.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-app-success">
                  <CheckCircle size={14} />
                  <span className="min-w-0 wrap-break-words">
                    {detected.length === 1
                      ? `Detected ${DB_TYPE_LABELS[detected[0]!.dbType]} at ${detected[0]!.host}:${detected[0]!.port}, prefilled`
                      : `Detected ${detected.map((server) => `${DB_TYPE_LABELS[server.dbType]} · ${server.host}:${server.port}`).join(', ')}, prefilled`}
                  </span>
                </div>
              )}

              {!detecting && detected.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-app-fg-soft">
                  <WarningCircle size={14} />
                  <span>
                    No local databases detected. Enter details manually or paste a connection string
                  </span>
                </div>
              )}

              {parseHint && (
                <div
                  className={cn(
                    'flex items-center gap-2 text-xs',
                    parseHint.ok ? 'text-app-success' : 'text-app-fg-soft'
                  )}
                >
                  {parseHint.ok ? <CheckCircle size={14} /> : <WarningCircle size={14} />}
                  <span className="min-w-0 wrap-break-words">{parseHint.message}</span>
                </div>
              )}

              <div className="grid grid-cols-[1fr_180px] gap-3">
                <Input
                  placeholder="Connection name"
                  value={form.name}
                  onChange={(event) => setField('name', event.currentTarget.value)}
                />
                <select
                  value={form.dbType}
                  onChange={(event) => handleDbTypeChange(event.currentTarget.value as DbType)}
                  className="rounded-md border border-app-edge bg-app-bg px-2 py-2 text-sm outline-none focus:border-app-fg-muted"
                >
                  {DB_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {(isSql || isMongo) && (
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <Input
                    placeholder="Host · localhost"
                    value={form.host}
                    onChange={(event) => setField('host', event.currentTarget.value)}
                  />
                  <Input
                    placeholder="Port"
                    type="number"
                    value={String(form.port)}
                    onChange={(event) => setField('port', Number(event.currentTarget.value))}
                  />
                </div>
              )}
              {(isSql || isMongo) && (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={usernamePlaceholder}
                    value={form.username}
                    onChange={(event) => setField('username', event.currentTarget.value)}
                  />
                  <Input
                    placeholder={existing ? 'Password (unchanged)' : 'Password'}
                    type="password"
                    value={form.password}
                    onChange={(event) => setField('password', event.currentTarget.value)}
                  />
                </div>
              )}
              {(isSql || isMongo) && (
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <select
                    value={form.database}
                    onChange={(event) => setField('database', event.currentTarget.value)}
                    className="rounded-md border border-app-edge bg-app-bg px-2 py-2 text-sm outline-none focus:border-app-fg-muted"
                  >
                    {isMongo && <option value="">(all databases)</option>}
                    {databases.map((database) => (
                      <option key={database} value={database}>
                        {database}
                      </option>
                    ))}
                    {form.database && !databases.includes(form.database) && (
                      <option value={form.database}>{form.database} (custom)</option>
                    )}
                  </select>
                  <div className="flex items-center gap-3">
                    {form.dbType === 'postgres' && (
                      <select
                        value={form.sslMode}
                        onChange={(event) =>
                          setField('sslMode', event.currentTarget.value as SslMode)
                        }
                        className="rounded-md border border-app-edge bg-app-bg px-2 py-2 text-sm outline-none focus:border-app-fg-muted"
                      >
                        {SSL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            SSL: {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      title="Refresh databases"
                      onClick={() => void loadDatabases()}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-app-edge bg-app-bg px-3 py-2 text-sm text-app-fg-muted transition-colors hover:bg-app-bg-soft hover:text-app-fg"
                    >
                      <ArrowsClockwise
                        size={15}
                        className={cn(loadingDatabases && 'animate-spin')}
                      />
                      {loadingDatabases ? 'Loading…' : 'Refresh'}
                    </button>
                  </div>
                </div>
              )}
              {!isSqlite && databasesError && (
                <div className="flex items-start gap-2 text-xs text-app-danger">
                  <WarningCircle size={13} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 wrap-break-words">
                    Could not list databases: {databasesError}
                  </span>
                </div>
              )}
              {!isSqlite && needsCredentialsToLoad && !databasesError && (
                <div className="flex items-center gap-2 text-xs text-app-fg-soft">
                  <WarningCircle size={13} className="shrink-0" />
                  <span className="min-w-0 wrap-break-words">
                    {t('conn.enterCredentialsToList')}
                  </span>
                </div>
              )}
              {!isSqlite && !databasesError && databases.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-app-fg-soft">
                  <CheckCircle size={13} className="shrink-0 text-app-success" />
                  <span className="min-w-0 wrap-break-words">
                    {databases.length} database
                    {databases.length === 1 ? '' : 's'} found
                  </span>
                </div>
              )}

              {isSqlite && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="SQLite file path"
                    value={form.filePath}
                    onChange={(event) => setField('filePath', event.currentTarget.value)}
                  />
                  <Button variant="secondary" isIconOnly onPress={() => void browseSqliteFile()}>
                    <FolderOpen size={15} />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <select
                  value={form.folderId ?? ''}
                  onChange={(event) => setField('folderId', event.currentTarget.value || null)}
                  className="rounded-md border border-app-edge bg-app-bg px-2 py-2 text-sm outline-none focus:border-app-fg-muted"
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-app-fg-muted">
                  <input
                    type="checkbox"
                    checked={form.readOnly}
                    onChange={(event) => setField('readOnly', event.currentTarget.checked)}
                    className="size-4 accent-app-accent"
                  />
                  Read only
                </label>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs text-app-fg-muted">Color tag</span>
                <ColorTagPicker
                  value={form.colorTag}
                  onChange={(colorTag) => setField('colorTag', colorTag)}
                />
              </div>

              {testResult && (
                <div className={cn('flex items-center gap-2 text-xs', testResultClass)}>
                  {testResult.ok ? <CheckCircle size={14} /> : <WarningCircle size={14} />}
                  <span className="min-w-0 wrap-break-words">
                    {testResult.ok
                      ? 'Connection successful'
                      : (testResult.error ?? 'Connection failed')}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-app-danger">
                  <WarningCircle size={14} />
                  <span className="min-w-0 wrap-break-words">{error}</span>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button variant="ghost" isDisabled={testing} onPress={() => void handleTest()}>
              {testing ? <SpinnerGap size={14} className="animate-spin" /> : null}
              Test
            </Button>
            <Button variant="primary" isDisabled={submitting} onPress={() => void handleSubmit()}>
              {existing ? 'Save changes' : 'Add connection'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
