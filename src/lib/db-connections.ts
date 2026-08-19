import type { Connection } from '../types/connection'
import type { SqlConnectPayload, SqlDbType } from '../shared/rowport-api'

const sqlInstances = new Map<string, SqlInstance>()
const mongoConnected = new Set<string>()

export interface SqlInstance {
  connectionId: string
  path: string
  select: <T = unknown>(sql: string, params?: unknown[], queryId?: string) => Promise<T>
  execute: (sql: string, params?: unknown[]) => Promise<{ rowsAffected: number }>
}

function encodeCredential(value: string): string {
  return encodeURIComponent(value)
}

export function buildSqlConnectionUrl(conn: Connection, password: string): string {
  if (conn.dbType === 'sqlite') {
    return `sqlite:${conn.filePath ?? ''}`
  }
  const host = conn.host ?? 'localhost'
  const port = conn.port
  const database = conn.database ?? ''
  const credentials = `${encodeCredential(conn.username ?? '')}:${encodeCredential(password)}`
  if (conn.dbType === 'postgres') {
    return `postgres://${credentials}@${host}:${port}/${database}?sslmode=${conn.sslMode}`
  }
  return `mysql://${credentials}@${host}:${port}/${database}`
}

export function toConnectPayload(conn: Connection, password: string): SqlConnectPayload {
  if (conn.dbType === 'sqlite') {
    return { dbType: 'sqlite', filePath: conn.filePath ?? '', sslMode: conn.sslMode }
  }
  return {
    dbType: conn.dbType as SqlDbType,
    host: conn.host,
    port: conn.port,
    username: conn.username,
    password,
    database: conn.database,
    sslMode: conn.sslMode
  }
}

function makeInstance(connectionId: string, path: string): SqlInstance {
  return {
    connectionId,
    path,
    select: <T>(sql: string, params: unknown[] = [], queryId = '') =>
      window.rowport.sql.select(connectionId, sql, params, queryId) as Promise<T>,
    execute: (sql, params = []) => window.rowport.sql.execute(connectionId, sql, params)
  }
}

export async function connectSql(conn: Connection, password: string): Promise<SqlInstance> {
  const url = buildSqlConnectionUrl(conn, password)
  await window.rowport.sql.connect(conn.id, toConnectPayload(conn, password))
  const instance = makeInstance(conn.id, url)
  sqlInstances.set(conn.id, instance)
  return instance
}

export function getSqlInstance(connectionId: string): SqlInstance | undefined {
  return sqlInstances.get(connectionId)
}

export function isSqlUrlInUse(url: string): boolean {
  for (const instance of sqlInstances.values()) {
    if (instance.path === url) return true
  }
  return false
}

export async function disconnectSql(connectionId: string): Promise<void> {
  const instance = sqlInstances.get(connectionId)
  if (instance) {
    if (!isSqlUrlInUse(instance.path)) {
      await window.rowport.sql.disconnect(connectionId).catch(() => undefined)
    }
    sqlInstances.delete(connectionId)
  }
}

export function buildMongoUri(parts: {
  host?: string
  port?: number
  username?: string
  password?: string
  database?: string
  srv?: boolean
}): string {
  const host = (parts.host ?? '').trim()
  if (!host) return ''
  let authority = host
  if (parts.port && !parts.srv) authority = `${host}:${parts.port}`
  if (parts.username) {
    const credential = parts.password
      ? `${encodeCredential(parts.username)}:${encodeCredential(parts.password)}`
      : encodeCredential(parts.username)
    authority = `${credential}@${authority}`
  }
  const database = parts.database ? `/${parts.database}` : ''
  const scheme = parts.srv ? 'mongodb+srv' : 'mongodb'
  return `${scheme}://${authority}${database}`
}

export function isSqlConnected(connectionId: string): boolean {
  return sqlInstances.has(connectionId)
}

export function isMongoConnected(connectionId: string): boolean {
  return mongoConnected.has(connectionId)
}

export function setMongoConnected(connectionId: string, connected: boolean): void {
  if (connected) {
    mongoConnected.add(connectionId)
  } else {
    mongoConnected.delete(connectionId)
  }
}
