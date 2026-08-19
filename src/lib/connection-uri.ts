import type { Connection, DbType, SslMode } from '../types/connection'

export interface ParsedConnection {
  dbType: DbType
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  filePath?: string
  uri?: string
  sslMode?: SslMode
  suggestedName?: string
}

const SQLITE_EXTENSION = /\.(db|sqlite|sqlite3)$/i

export function detectDbType(input: string): DbType | null {
  const value = input.trim()
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('postgres://') || lower.startsWith('postgresql://')) {
    return 'postgres'
  }
  if (lower.startsWith('mysql://') || lower.startsWith('mariadb://')) {
    return 'mysql'
  }
  if (lower.startsWith('mongodb://') || lower.startsWith('mongodb+srv://')) {
    return 'mongodb'
  }
  if (lower.startsWith('sqlite:') || SQLITE_EXTENSION.test(value)) {
    return 'sqlite'
  }
  return null
}

export function parseConnectionString(input: string): ParsedConnection | null {
  const value = input.trim()
  const dbType = detectDbType(value)
  if (!dbType) return null

  if (dbType === 'sqlite') {
    const filePath = value.startsWith('sqlite:') ? value.slice('sqlite:'.length) : value
    return { dbType, filePath, suggestedName: fileName(filePath) }
  }

  try {
    return fromUrl(new URL(value), dbType, value)
  } catch {
    return parseByRegex(value, dbType)
  }
}

function fromUrl(url: URL, dbType: DbType, raw: string): ParsedConnection {
  const host = url.hostname || undefined
  const database = pathToDatabase(url.pathname)
  return {
    dbType,
    host,
    port: url.port ? Number(url.port) : undefined,
    username: decodeIfPresent(url.username),
    password: decodeIfPresent(url.password),
    database,
    sslMode: sslModeFromQuery(url),
    suggestedName: suggestName(database, host),
    uri: raw
  }
}

function parseByRegex(value: string, dbType: DbType): ParsedConnection | null {
  const stripped = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
  const match = stripped.match(/^([^/:@]+)(?::([^@]*))?@([^/:]+?)(?::(\d+))?(\/[^?]*)?/)
  if (!match) return null
  const [, username, password, hostRaw, portString, pathPart] = match
  const host = hostRaw ?? ''
  if (host.includes('@')) return null
  const database = pathPart
    ? decodeURIComponent(pathPart.replace(/^\//, '').replace(/\/+$/, ''))
    : undefined
  return {
    dbType,
    host,
    port: portString ? Number(portString) : undefined,
    username: username ? decodeURIComponent(username) : undefined,
    password: password ? decodeURIComponent(password) : undefined,
    database,
    suggestedName: suggestName(database, host),
    uri: value
  }
}

function pathToDatabase(pathname: string): string | undefined {
  const cleaned = pathname.replace(/^\//, '').replace(/\/+$/, '')
  return cleaned ? decodeURIComponent(cleaned) : undefined
}

function decodeIfPresent(value: string): string | undefined {
  if (!value) return undefined
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function sslModeFromQuery(url: URL): SslMode | undefined {
  const sslMode = url.searchParams.get('sslmode')
  if (sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'disable') {
    return sslMode
  }
  if (url.searchParams.get('ssl') === 'true') return 'require'
  return undefined
}

function suggestName(database: string | undefined, host: string | undefined): string {
  if (database) return host ? `${database} @ ${host}` : database
  return host ?? ''
}

function fileName(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath
  return base.replace(SQLITE_EXTENSION, '') || base
}

export function buildConnectionString(conn: Connection): string {
  if (conn.dbType === 'sqlite') {
    return `sqlite:${conn.filePath ?? ''}`
  }
  if (conn.dbType === 'mongodb') {
    return conn.uri?.trim() ?? ''
  }
  const parts: string[] = []
  const scheme = conn.dbType === 'postgres' ? 'postgresql' : 'mysql'
  parts.push(`${scheme}://`)
  if (conn.username) {
    parts.push(encodeURIComponent(conn.username))
    parts.push('@')
  }
  if (conn.host) {
    parts.push(conn.host)
    if (conn.port) parts.push(`:${conn.port}`)
  }
  if (conn.database) {
    parts.push(`/${encodeURIComponent(conn.database)}`)
  }
  if (conn.sslMode && conn.sslMode !== 'disable') {
    parts.push(`?sslmode=${conn.sslMode}`)
  }
  return parts.join('')
}
