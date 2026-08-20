import { runExecute, runSelect } from './query-executor'
import {
  columnsFromRows,
  countSelect,
  isDdlQuery,
  isSelectQuery,
  paginateSelect,
  splitStatements,
  withRowLimit
} from './sql-utils'
import { invalidateSqlSchemaCache } from './schema'
import { useSchemaStore } from '../stores/useSchemaStore'

export const MAX_STORED_ROWS = 5000
export const PAGE_SIZE = 1000

export interface SqlRunOptions {
  pageSize?: number
  offset?: number
  queryId?: string
}

export interface SqlRunResult {
  columns: string[]
  rows: Record<string, unknown>[]
  selectedTotal: number
  affectedTotal: number
  totalRows: number | null
  hasMore: boolean
  loadedOffset: number
  paged: boolean
}

export async function runSql(
  connectionId: string,
  sql: string,
  options: SqlRunOptions = {}
): Promise<SqlRunResult> {
  const statements = splitStatements(sql)
  if (
    options.pageSize &&
    statements.length === 1 &&
    isSelectQuery(statements[0] ?? '') &&
    !isDdlQuery(statements[0] ?? '')
  ) {
    return runPagedSelect(
      connectionId,
      statements[0]!,
      options.pageSize,
      options.offset ?? 0,
      options.queryId
    )
  }
  return runBatch(connectionId, sql)
}

async function runPagedSelect(
  connectionId: string,
  statement: string,
  pageSize: number,
  offset: number,
  queryId: string | undefined
): Promise<SqlRunResult> {
  const fetchSize = pageSize + 1
  const resultRows = await runSelect<Record<string, unknown>>(
    connectionId,
    paginateSelect(statement, fetchSize, offset),
    [],
    { queryId }
  )
  const hasMore = resultRows.length > pageSize
  const pageRows = resultRows.slice(0, pageSize)
  const totalRows = offset === 0 ? await countRows(connectionId, statement) : null
  return {
    columns: columnsFromRows(pageRows),
    rows: pageRows,
    selectedTotal: pageRows.length,
    affectedTotal: 0,
    totalRows,
    hasMore,
    loadedOffset: offset + pageRows.length,
    paged: true
  }
}

async function countRows(connectionId: string, statement: string): Promise<number | null> {
  try {
    const rows = await runSelect<Record<string, unknown>>(connectionId, countSelect(statement))
    const value = rows[0]?._count
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  } catch {
    return null
  }
}

async function runBatch(connectionId: string, sql: string): Promise<SqlRunResult> {
  const statements = splitStatements(sql)
  let columns: string[] = []
  let rows: Record<string, unknown>[] = []
  let affectedTotal = 0
  let selectedTotal = 0

  for (const statement of statements) {
    if (isSelectQuery(statement)) {
      const resultRows = await runSelect<Record<string, unknown>>(connectionId, statement)
      selectedTotal = resultRows.length
      const capped = withRowLimit(resultRows, MAX_STORED_ROWS)
      columns = columnsFromRows(capped)
      rows = capped
    } else {
      const result = await runExecute(connectionId, statement, [], true)
      affectedTotal += result.rowsAffected
    }
  }

  if (isDdlQuery(sql)) {
    invalidateSqlSchemaCache(connectionId)
    useSchemaStore.getState().bump()
  }

  return {
    columns,
    rows,
    selectedTotal,
    affectedTotal,
    totalRows: selectedTotal,
    hasMore: false,
    loadedOffset: rows.length,
    paged: false
  }
}
