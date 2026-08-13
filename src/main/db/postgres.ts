import pg from 'pg'
import { QueryCancelledError } from '../../shared/errors'

const { Pool } = pg

export interface PostgresConnection {
  kind: 'postgres'
  url: string
  pool: pg.Pool
  close: () => Promise<void>
}

export interface PostgresConnectPayload {
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  database?: string | null
  sslMode: string
}

function sslConfig(sslMode: string): object | undefined {
  if (sslMode === 'disable') return undefined
  return { rejectUnauthorized: sslMode === 'verify-full' }
}

function toDollarParams(sql: string): string {
  let out = ''
  let counter = 0
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]!
    if (ch === "'" || ch === '"') {
      const quote = ch
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2
          } else {
            j++
            break
          }
        } else {
          j++
        }
      }
      out += sql.slice(i, j)
      i = j
      continue
    }
    if (ch === '?') {
      counter += 1
      out += `$${counter}`
      i++
      continue
    }
    out += ch
    i++
  }
  return out
}

function encodeCredential(value: string): string {
  return encodeURIComponent(value)
}

export function createPostgresConnection(payload: PostgresConnectPayload): PostgresConnection {
  const host = payload.host ?? 'localhost'
  const port = payload.port ?? 5432
  const database = payload.database ?? ''
  const username = payload.username ?? ''
  const password = payload.password ?? ''
  const credentials = `${encodeCredential(username)}:${encodeCredential(password)}`
  const url = `postgres://${credentials}@${host}:${port}/${database}`
  const pool = new Pool({
    host,
    port,
    user: username,
    password,
    database: database || undefined,
    ssl: sslConfig(payload.sslMode),
    connectionTimeoutMillis: 10_000
  })
  return {
    kind: 'postgres',
    url,
    pool,
    close: () => pool.end()
  }
}

export async function postgresSelect(
  conn: PostgresConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<unknown[]> {
  if (signal?.aborted) throw new QueryCancelledError()
  try {
    const result = await conn.pool.query({
      text: toDollarParams(sql),
      values: params,
      signal
    })
    return result.rows as unknown[]
  } catch (error) {
    if (signal?.aborted) throw new QueryCancelledError()
    throw error
  }
}

export async function postgresExecute(
  conn: PostgresConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<number> {
  if (signal?.aborted) throw new QueryCancelledError()
  try {
    const result = await conn.pool.query({
      text: toDollarParams(sql),
      values: params,
      signal
    })
    return result.rowCount ?? 0
  } catch (error) {
    if (signal?.aborted) throw new QueryCancelledError()
    throw error
  }
}

export async function postgresTest(payload: PostgresConnectPayload): Promise<void> {
  const conn = createPostgresConnection(payload)
  try {
    await conn.pool.query('SELECT 1')
  } finally {
    await conn.close()
  }
}

export async function postgresListDatabases(payload: PostgresConnectPayload): Promise<string[]> {
  const conn = createPostgresConnection({ ...payload, database: 'postgres' })
  try {
    const result = await conn.pool.query(
      'SELECT datname AS name FROM pg_database WHERE datistemplate = false ORDER BY name'
    )
    return result.rows
      .map((row) => row.name as string)
      .filter((name): name is string => typeof name === 'string')
  } finally {
    await conn.close()
  }
}
