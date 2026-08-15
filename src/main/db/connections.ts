import { resolve } from 'node:path'
import type { SqlConnectPayload } from '../../shared/rowport-api'
import {
  createSqliteConnection,
  sqliteSelect,
  sqliteExecute,
  type SqliteConnection
} from './sqlite'
import {
  createPostgresConnection,
  postgresSelect,
  postgresExecute,
  postgresTest,
  postgresListDatabases,
  type PostgresConnection,
  type PostgresConnectPayload
} from './postgres'
import {
  createMysqlConnection,
  mysqlSelect,
  mysqlExecute,
  mysqlTest,
  mysqlListDatabases,
  type MysqlConnection,
  type MysqlConnectPayload
} from './mysql'

type LiveConnection = SqliteConnection | PostgresConnection | MysqlConnection

const connections = new Map<string, LiveConnection>()

const QUERY_TIMEOUT_MS = 30_000
const queryAborts = new Map<string, AbortController>()
const queryConnections = new Map<string, string>()

let appDbPath: string | null = null

export function runWithQueryControl<T>(
  connectionId: string,
  queryId: string,
  run: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController()
  queryAborts.set(queryId, controller)
  queryConnections.set(queryId, connectionId)
  const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS)
  return run(controller.signal).finally(() => {
    clearTimeout(timer)
    queryAborts.delete(queryId)
    queryConnections.delete(queryId)
  })
}

export function cancelSql(queryId: string): void {
  const controller = queryAborts.get(queryId)
  if (!controller) return
  controller.abort()
  queryAborts.delete(queryId)
  queryConnections.delete(queryId)
}

export function abortQueriesForConnection(connectionId: string): void {
  for (const [queryId, connId] of queryConnections) {
    if (connId !== connectionId) continue
    queryAborts.get(queryId)?.abort()
    queryAborts.delete(queryId)
    queryConnections.delete(queryId)
  }
}

export function setAppDbPath(filePath: string): void {
  appDbPath = resolve(filePath)
}

export function isSqlUrlInUse(filePath: string, excludeConnectionId?: string): boolean {
  if (appDbPath && resolve(filePath) === appDbPath) return true
  for (const [id, conn] of connections) {
    if (id === excludeConnectionId) continue
    if (conn.kind === 'sqlite' && resolve(conn.filePath) === resolve(filePath)) {
      return true
    }
  }
  return false
}

export function isSqlConnected(connectionId: string): boolean {
  return connections.has(connectionId)
}

export async function connectSql(connectionId: string, payload: SqlConnectPayload): Promise<void> {
  const existing = connections.get(connectionId)
  if (existing) {
    await disconnectSql(connectionId)
  }
  const conn = createSqlConnection(payload)
  if (conn.kind === 'sqlite') {
    sqliteExecute(conn, 'SELECT 1', [])
  } else if (conn.kind === 'postgres') {
    await conn.pool.query('SELECT 1')
  } else {
    await conn.pool.query('SELECT 1')
  }
  connections.set(connectionId, conn)
}

function createSqlConnection(payload: SqlConnectPayload): LiveConnection {
  if (payload.dbType === 'sqlite') {
    return createSqliteConnection(payload.filePath ?? '')
  }
  if (payload.dbType === 'postgres') {
    return createPostgresConnection(payload as PostgresConnectPayload)
  }
  return createMysqlConnection(payload as MysqlConnectPayload)
}

export async function disconnectSql(connectionId: string): Promise<void> {
  abortQueriesForConnection(connectionId)
  const conn = connections.get(connectionId)
  if (!conn) return
  if (conn.kind === 'sqlite' && !isSqlUrlInUse(conn.filePath, connectionId)) {
    conn.close()
  }
  if (conn.kind === 'postgres' || conn.kind === 'mysql') {
    await conn.close()
  }
  connections.delete(connectionId)
}

export function getSqlConnection(connectionId: string): LiveConnection {
  const conn = connections.get(connectionId)
  if (!conn) throw new Error('Connection not found')
  return conn
}

export async function selectSql(
  connectionId: string,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<unknown[]> {
  const conn = getSqlConnection(connectionId)
  if (conn.kind === 'sqlite') return sqliteSelect(conn, sql, params, signal)
  if (conn.kind === 'postgres') return postgresSelect(conn, sql, params, signal)
  return mysqlSelect(conn, sql, params, signal)
}

export async function executeSql(
  connectionId: string,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<number> {
  const conn = getSqlConnection(connectionId)
  if (conn.kind === 'sqlite') return sqliteExecute(conn, sql, params, signal)
  if (conn.kind === 'postgres') return postgresExecute(conn, sql, params, signal)
  return mysqlExecute(conn, sql, params, signal)
}

export async function testSql(payload: SqlConnectPayload): Promise<void> {
  if (payload.dbType === 'sqlite') {
    const conn = createSqliteConnection(payload.filePath ?? '')
    sqliteExecute(conn, 'SELECT 1', [])
    conn.close()
    return
  }
  if (payload.dbType === 'postgres') {
    await postgresTest(payload as PostgresConnectPayload)
    return
  }
  await mysqlTest(payload as MysqlConnectPayload)
}

export async function listSqlDatabases(payload: SqlConnectPayload): Promise<string[]> {
  if (payload.dbType === 'sqlite') return []
  if (payload.dbType === 'postgres') {
    return postgresListDatabases(payload as PostgresConnectPayload)
  }
  return mysqlListDatabases(payload as MysqlConnectPayload)
}

export async function clearConnections(): Promise<void> {
  for (const [connectionId, conn] of connections) {
    if (conn.kind === 'postgres' || conn.kind === 'mysql') {
      await conn.close()
    } else {
      conn.close()
    }
    connections.delete(connectionId)
  }
}
