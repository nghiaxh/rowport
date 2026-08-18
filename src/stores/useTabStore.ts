import { create } from 'zustand'
import { isDestructiveQuery } from '../lib/query-executor'
import { columnsFromRows, parseJsonDocument, splitStatements } from '../lib/sql-utils'
import { PAGE_SIZE, runSql } from '../lib/query-runner'
import { QUERY_CANCELLED_MESSAGE } from '../shared/errors'
import { insertQueryHistory } from '../lib/metadata'
import { mongoApi } from '../lib/electron-api'
import { useConnectionStore } from './useConnectionStore'
import { useHistoryStore } from './useHistoryStore'

import {
  emptyMongoQuery,
  emptyQueryResult,
  type MongoQueryState,
  type QueryResultState
} from '../types/query'
import { newId, nowIso } from '../lib/utils'

export type TabKind = 'query' | 'er'

export interface QueryTab {
  id: string
  connectionId: string
  kind: TabKind
  title: string
  sql: string
  result: QueryResultState
  mongo: MongoQueryState
}

interface TabStore {
  tabs: QueryTab[]
  activeTabId: string | null
  openTab: (connectionId: string) => void
  openErTab: (connectionId: string) => void
  closeTab: (id: string) => void
  activateTab: (id: string) => void
  setSql: (id: string, sql: string) => void
  setMongo: (id: string, mongo: MongoQueryState) => void
  runQuery: (id: string, confirmed?: boolean) => Promise<void>
  runMongoQuery: (id: string) => Promise<void>
  loadMore: (id: string) => Promise<void>
  cancelQuery: (id: string) => Promise<void>
  closeTabsForConnection: (connectionId: string) => void
}

const activeQueries = new Map<string, string>()

function isCancelledError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(QUERY_CANCELLED_MESSAGE)
}

async function loadMoreMongo(tabId: string, tab: QueryTab, offset: number): Promise<void> {
  const { connections } = useConnectionStore.getState()
  const connection = connections.find((c) => c.id === tab.connectionId)
  if (!connection) return
  const mongo = tab.mongo
  if (!mongo.database || !mongo.collection) return

  let docs: unknown[]
  if (mongo.mode === 'find') {
    const filter = parseJsonDocument(mongo.filterJson, 'Filter')
    const options = (parseJsonDocument(mongo.optionsJson, 'Options') ?? {}) as {
      projection?: unknown
      sort?: unknown
    }
    docs = await mongoApi.find(connection.id, mongo.database, mongo.collection, {
      filter,
      projection: options.projection,
      sort: options.sort,
      skip: offset,
      limit: mongo.limit
    })
  } else {
    const pipeline = (parseJsonDocument(mongo.pipelineJson, 'Pipeline') ?? []) as unknown[]
    docs = await mongoApi.aggregate(connection.id, mongo.database, mongo.collection, [
      ...pipeline,
      { $skip: offset },
      { $limit: mongo.limit }
    ])
  }

  const hasMore = docs.length === mongo.limit
  const allRows = [...tab.result.rows, ...(docs as Record<string, unknown>[])]
  patchResult(tabId, {
    rows: allRows,
    columns: allRows.length > 0 ? columnsFromRows(allRows) : tab.result.columns,
    hasMore,
    loadedOffset: offset + docs.length,
    rowCount: allRows.length,
    status: 'success',
    loadingMore: false,
    error: null
  })
}

function patchResult(tabId: string, patch: Partial<QueryResultState>): void {
  useTabStore.setState((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, result: { ...tab.result, ...patch } } : tab
    )
  }))
}

export const useTabStore = create<TabStore>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (connectionId) => {
    const { connections } = useConnectionStore.getState()
    const connection = connections.find((c) => c.id === connectionId)
    const baseName = connection?.name ?? 'Untitled'
    const existingCount = get().tabs.filter((t) => t.connectionId === connectionId).length
    const title = existingCount > 0 ? `${baseName} ${existingCount + 1}` : baseName
    const tab: QueryTab = {
      id: newId(),
      connectionId,
      kind: 'query',
      title,
      sql: '',
      result: emptyQueryResult(),
      mongo: emptyMongoQuery(connection?.database ?? '')
    }
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
  },

  openErTab: (connectionId) => {
    const { connections } = useConnectionStore.getState()
    const connection = connections.find((c) => c.id === connectionId)
    const baseName = connection?.name ?? 'Untitled'
    const tab: QueryTab = {
      id: newId(),
      connectionId,
      kind: 'er',
      title: `${baseName} · ER`,
      sql: '',
      result: emptyQueryResult(),
      mongo: emptyMongoQuery(connection?.database ?? '')
    }
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }))
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const index = tabs.findIndex((t) => t.id === id)
    if (index === -1) return
    const next = tabs.filter((t) => t.id !== id)
    let nextActive = activeTabId
    if (activeTabId === id) {
      const fallback = next[index - 1] ?? next[index] ?? null
      nextActive = fallback?.id ?? null
    }
    set({ tabs: next, activeTabId: nextActive })
  },

  activateTab: (id) => set({ activeTabId: id }),

  setSql: (id, sql) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, sql } : tab))
    }))
  },

  setMongo: (id, mongo) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, mongo } : tab))
    }))
  },

  runQuery: async (id, confirmed = false) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab) return

    const { connections, statusById } = useConnectionStore.getState()
    const connection = connections.find((c) => c.id === tab.connectionId)
    if (!connection) {
      patchResult(id, {
        status: 'error',
        error: 'Connection no longer exists.',
        durationMs: null
      })
      return
    }
    if (connection.dbType === 'mongodb') {
      await get().runMongoQuery(id)
      return
    }
    if (statusById[connection.id] !== 'connected') {
      patchResult(id, {
        status: 'error',
        error: 'Connect to the database first.',
        durationMs: null
      })
      return
    }
    const sql = tab.sql.trim()
    if (!sql) {
      patchResult(id, {
        status: 'error',
        error: 'Enter a query to run.',
        durationMs: null
      })
      return
    }
    if (isDestructiveQuery(sql) && !confirmed) {
      patchResult(id, {
        status: 'error',
        error: 'Destructive query requires confirmation.',
        durationMs: null
      })
      return
    }
    if (connection.readOnly && isDestructiveQuery(sql)) {
      patchResult(id, {
        status: 'error',
        error: 'This connection is read only. Destructive queries are blocked.',
        durationMs: null
      })
      return
    }

    const statements = splitStatements(sql)
    if (statements.length === 0) {
      patchResult(id, {
        status: 'error',
        error: 'No executable statements found.',
        durationMs: null
      })
      return
    }

    patchResult(id, { status: 'running', error: null, durationMs: null, loadingMore: false })
    const startedAt = performance.now()
    const queryId = newId()
    activeQueries.set(id, queryId)

    let columns: string[] = []
    let rows: Record<string, unknown>[] = []
    let selectedTotal = 0
    let errorMessage: string | null = null

    try {
      const result = await runSql(connection.id, sql, { pageSize: PAGE_SIZE, queryId })
      columns = result.columns
      rows = result.rows
      selectedTotal = result.selectedTotal
      const rowCount =
        result.totalRows ?? (columns.length > 0 ? result.selectedTotal : result.affectedTotal)
      patchResult(id, {
        status: 'success',
        columns,
        rows,
        rowCount,
        totalRows: result.totalRows,
        hasMore: result.hasMore,
        loadedOffset: result.loadedOffset,
        paged: result.paged,
        pageSize: PAGE_SIZE,
        durationMs: Math.round(performance.now() - startedAt),
        error: null
      })
    } catch (runError) {
      errorMessage = runError instanceof Error ? runError.message : String(runError)
      if (isCancelledError(runError)) {
        patchResult(id, { status: 'idle', error: null, durationMs: null })
      } else {
        patchResult(id, {
          status: 'error',
          error: errorMessage,
          durationMs: Math.round(performance.now() - startedAt)
        })
      }
    } finally {
      activeQueries.delete(id)
      const durationMs = Math.round(performance.now() - startedAt)
      const cancelled = errorMessage?.includes(QUERY_CANCELLED_MESSAGE) ?? false
      await insertQueryHistory({
        id: newId(),
        connectionId: connection.id,
        connectionName: connection.name,
        queryText: sql,
        executedAt: nowIso(),
        durationMs,
        rowCount: errorMessage ? null : columns.length > 0 ? selectedTotal : selectedTotal,
        status: errorMessage ? 'error' : 'success',
        errorMessage: cancelled ? QUERY_CANCELLED_MESSAGE : errorMessage
      }).catch(() => undefined)
      void useHistoryStore.getState().load()
    }
  },

  loadMore: async (id) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab) return
    const result = tab.result
    if (result.status === 'running' || result.loadingMore || !result.hasMore) return

    const { connections } = useConnectionStore.getState()
    const connection = connections.find((c) => c.id === tab.connectionId)
    if (!connection) return

    patchResult(id, { loadingMore: true })
    const startedAt = performance.now()
    try {
      if (connection.dbType === 'mongodb') {
        await loadMoreMongo(id, tab, result.loadedOffset)
      } else {
        const queryId = newId()
        activeQueries.set(id, queryId)
        const next = await runSql(connection.id, tab.sql, {
          pageSize: result.pageSize,
          offset: result.loadedOffset,
          queryId
        })
        activeQueries.delete(id)
        patchResult(id, {
          rows: [...result.rows, ...next.rows],
          columns: next.columns.length > 0 ? next.columns : result.columns,
          totalRows: next.totalRows ?? result.totalRows,
          hasMore: next.hasMore,
          loadedOffset: next.loadedOffset,
          rowCount: next.totalRows ?? result.rows.length + next.rows.length,
          status: 'success',
          loadingMore: false,
          error: null,
          durationMs: Math.round(performance.now() - startedAt)
        })
      }
    } catch (runError) {
      activeQueries.delete(id)
      if (!isCancelledError(runError)) {
        patchResult(id, {
          status: 'error',
          error: runError instanceof Error ? runError.message : String(runError),
          loadingMore: false
        })
      } else {
        patchResult(id, { loadingMore: false })
      }
    }
  },

  cancelQuery: async (id) => {
    const queryId = activeQueries.get(id)
    if (!queryId) return
    await window.rowport.sql.cancel(queryId).catch(() => undefined)
  },

  runMongoQuery: async (id) => {
    const tab = get().tabs.find((t) => t.id === id)
    if (!tab?.mongo) return

    const { connections, statusById } = useConnectionStore.getState()
    const connection = connections.find((c) => c.id === tab.connectionId)
    if (!connection) {
      patchResult(id, {
        status: 'error',
        error: 'Connection no longer exists.',
        durationMs: null
      })
      return
    }
    if (statusById[connection.id] !== 'connected') {
      patchResult(id, {
        status: 'error',
        error: 'Connect to the database first.',
        durationMs: null
      })
      return
    }

    const mongo = tab.mongo
    if (!mongo.database) {
      patchResult(id, {
        status: 'error',
        error: 'Select a database.',
        durationMs: null
      })
      return
    }

    patchResult(id, { status: 'running', error: null, durationMs: null })
    const startedAt = performance.now()

    let docs: unknown[]
    let queryText = ''
    try {
      if (mongo.mode === 'find') {
        if (!mongo.collection) throw new Error('Select a collection.')
        const filter = parseJsonDocument(mongo.filterJson, 'Filter')
        const options = (parseJsonDocument(mongo.optionsJson, 'Options') ?? {}) as {
          projection?: unknown
          sort?: unknown
          skip?: number
        }
        docs = await mongoApi.find(connection.id, mongo.database, mongo.collection, {
          filter,
          projection: options.projection,
          sort: options.sort,
          skip: options.skip,
          limit: mongo.limit
        })
        queryText = `find(${mongo.database}.${mongo.collection}, ${mongo.filterJson.trim() || '{}'}, ${mongo.optionsJson.trim() || '{}'})`
      } else {
        if (!mongo.collection) throw new Error('Select a collection.')
        const pipeline = parseJsonDocument(mongo.pipelineJson, 'Pipeline')
        docs = await mongoApi.aggregate(
          connection.id,
          mongo.database,
          mongo.collection,
          pipeline as unknown[]
        )
        queryText = `aggregate(${mongo.database}.${mongo.collection}, ${mongo.pipelineJson.trim() || '[]'})`
      }
      const columns = columnsFromRows(docs as Record<string, unknown>[])
      const rowCount = docs.length
      const durationMs = Math.round(performance.now() - startedAt)
      patchResult(id, {
        status: 'success',
        columns,
        rows: docs as Record<string, unknown>[],
        rowCount,
        paged: true,
        pageSize: mongo.limit,
        loadedOffset: rowCount,
        totalRows: null,
        hasMore: rowCount === mongo.limit,
        durationMs,
        error: null,
        loadingMore: false
      })
      await insertQueryHistory({
        id: newId(),
        connectionId: connection.id,
        connectionName: connection.name,
        queryText,
        executedAt: nowIso(),
        durationMs,
        rowCount,
        status: 'success',
        errorMessage: null
      }).catch(() => undefined)
      void useHistoryStore.getState().load()
    } catch (runError) {
      const errorMessage = runError instanceof Error ? runError.message : String(runError)
      patchResult(id, {
        status: 'error',
        error: errorMessage,
        durationMs: Math.round(performance.now() - startedAt)
      })
    }
  },

  closeTabsForConnection: (connectionId) => {
    const { tabs, activeTabId } = get()
    const remaining = tabs.filter((t) => t.connectionId !== connectionId)
    const nextActive =
      activeTabId && remaining.some((t) => t.id === activeTabId)
        ? activeTabId
        : (remaining[remaining.length - 1]?.id ?? null)
    set({ tabs: remaining, activeTabId: nextActive })
  }
}))
