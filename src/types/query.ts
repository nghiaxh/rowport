export interface QueryResultState {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number | null
  status: 'idle' | 'running' | 'success' | 'error'
  error: string | null
  paged: boolean
  pageSize: number
  loadedOffset: number
  totalRows: number | null
  hasMore: boolean
  loadingMore: boolean
}

export interface EditCellParams {
  table: string
  column: string
  pkColumns: string[]
  row: Record<string, unknown>
  value: unknown
}

export type MongoQueryMode = 'find' | 'aggregate'

export interface MongoQueryState {
  database: string
  collection: string
  mode: MongoQueryMode
  filterJson: string
  optionsJson: string
  pipelineJson: string
  limit: number
}

export function emptyMongoQuery(database = ''): MongoQueryState {
  return {
    database,
    collection: '',
    mode: 'find',
    filterJson: '',
    optionsJson: '',
    pipelineJson: '',
    limit: 1000
  }
}

export function emptyQueryResult(): QueryResultState {
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    durationMs: null,
    status: 'idle',
    error: null,
    paged: false,
    pageSize: 0,
    loadedOffset: 0,
    totalRows: null,
    hasMore: false,
    loadingMore: false
  }
}

export interface QueryHistoryEntry {
  id: string
  connectionId: string | null
  connectionName: string | null
  queryText: string
  executedAt: string
  durationMs: number | null
  rowCount: number | null
  status: 'success' | 'error'
  errorMessage: string | null
}

export interface QueryHistoryRow {
  id: string
  connection_id: string | null
  connection_name: string | null
  query_text: string
  executed_at: string
  duration_ms: number | null
  row_count: number | null
  status: 'success' | 'error'
  error_message: string | null
}
