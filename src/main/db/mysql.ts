import mysql from 'mysql2/promise'
import { QueryCancelledError } from '../../shared/errors.js'

export interface MysqlConnection {
  kind: 'mysql'
  pool: mysql.Pool
  close: () => Promise<void>
}

export interface MysqlConnectPayload {
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

export function createMysqlConnection(payload: MysqlConnectPayload): MysqlConnection {
  const pool = mysql.createPool({
    host: payload.host ?? 'localhost',
    port: payload.port ?? 3306,
    user: payload.username ?? '',
    password: payload.password ?? '',
    database: payload.database || undefined,
    ssl: sslConfig(payload.sslMode),
    dateStrings: true,
    connectTimeout: 10_000
  })
  return {
    kind: 'mysql',
    pool,
    close: () => pool.end()
  }
}

export async function mysqlSelect(
  conn: MysqlConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<unknown[]> {
  if (signal?.aborted) throw new QueryCancelledError()
  const [rows] = await conn.pool.query(sql, params)
  return rows as unknown[]
}

export async function mysqlExecute(
  conn: MysqlConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): Promise<number> {
  if (signal?.aborted) throw new QueryCancelledError()
  const [result] = await conn.pool.query(sql, params)
  if (Array.isArray(result)) return 0
  return result.affectedRows ?? 0
}

export async function mysqlTest(payload: MysqlConnectPayload): Promise<void> {
  const conn = createMysqlConnection(payload)
  try {
    await conn.pool.query('SELECT 1')
  } finally {
    await conn.close()
  }
}

export async function mysqlListDatabases(payload: MysqlConnectPayload): Promise<string[]> {
  const conn = createMysqlConnection({ ...payload, database: 'mysql' })
  try {
    const [rows] = await conn.pool.query(
      'SELECT schema_name AS name FROM information_schema.schemata ORDER BY name'
    )
    return (rows as Array<{ name: string }>)
      .map((row) => row.name)
      .filter((name): name is string => typeof name === 'string')
  } finally {
    await conn.close()
  }
}
