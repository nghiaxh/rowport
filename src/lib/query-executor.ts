import { getSqlInstance } from './db-connections'
import type { SqlExecuteResult } from '../shared/rowport-api'
import { isDestructiveQuery } from './sql-utils'

export { isDestructiveQuery } from './sql-utils'

export interface SelectOptions {
  queryId?: string
}

export async function runSelect<T = Record<string, unknown>>(
  connectionId: string,
  sql: string,
  params: unknown[] = [],
  options: SelectOptions = {}
): Promise<T[]> {
  const db = getSqlInstance(connectionId)
  if (!db) throw new Error('Connection not found')
  return db.select<T[]>(sql, params, options.queryId)
}

export async function runExecute(
  connectionId: string,
  sql: string,
  params: unknown[] = [],
  confirmed = false
): Promise<SqlExecuteResult> {
  if (isDestructiveQuery(sql) && !confirmed) {
    throw new Error('Destructive query requires confirmation')
  }
  const db = getSqlInstance(connectionId)
  if (!db) throw new Error('Connection not found')
  return db.execute(sql, params)
}
