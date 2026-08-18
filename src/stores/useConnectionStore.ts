import { create } from 'zustand'
import type {
  Connection,
  ConnectionFolder,
  ConnectionInput,
  ConnectionStatus,
  FolderRow
} from '../types/connection'
import {
  connectSql,
  disconnectSql,
  isMongoConnected,
  isSqlConnected,
  buildMongoUri,
  setMongoConnected,
  toConnectPayload
} from '../lib/db-connections'
import { keychainApi, mongoApi } from '../lib/electron-api'
import {
  deleteConnection,
  deleteFolder,
  insertConnection,
  insertFolder,
  loadConnections,
  loadFolders,
  setConnectionOrder,
  setFolderOrder,
  touchConnection,
  updateConnection,
  updateFolder
} from '../lib/metadata'
import { newId, nowIso } from '../lib/utils'
import { useTabStore } from './useTabStore'

export interface TestResult {
  ok: boolean
  error?: string
}

interface ConnectionStore {
  connections: Connection[]
  folders: ConnectionFolder[]
  statusById: Record<string, ConnectionStatus>
  activeConnectionId: string | null
  loaded: boolean
  load: () => Promise<void>
  addConnection: (input: ConnectionInput) => Promise<string>
  editConnection: (id: string, input: ConnectionInput) => Promise<void>
  removeConnection: (id: string) => Promise<void>
  duplicateConnection: (id: string) => Promise<void>
  testConnection: (input: ConnectionInput, existingId?: string | null) => Promise<TestResult>
  listDatabases: (input: ConnectionInput, existingId?: string | null) => Promise<string[]>
  connect: (id: string) => Promise<void>
  disconnect: (id: string) => Promise<void>
  setActiveConnection: (id: string | null) => void
  addFolder: (name: string, colorTag?: string) => Promise<void>
  updateFolder: (id: string, name: string, colorTag?: string) => Promise<void>
  removeFolder: (id: string) => Promise<void>
  setConnectionsOrder: (
    entries: Array<{ id: string; folderId: string | null; sortOrder: number }>
  ) => void
  setFoldersOrder: (entries: Array<{ id: string; sortOrder: number }>) => void
}

function inputToConnection(input: ConnectionInput, id: string, sortOrder = 0): Connection {
  return {
    id,
    name: input.name,
    dbType: input.dbType,
    host: input.host || undefined,
    port: input.port || undefined,
    username: input.username || undefined,
    database: input.database || undefined,
    filePath: input.filePath || undefined,
    uri: input.uri || undefined,
    sslMode: input.sslMode,
    colorTag: input.colorTag,
    readOnly: input.readOnly,
    folderId: input.folderId,
    sortOrder,
    createdAt: nowIso()
  }
}

function mapFolder(row: FolderRow): ConnectionFolder {
  return {
    id: row.id,
    name: row.name,
    colorTag: row.color_tag ?? undefined,
    parentId: row.parent_id,
    sortOrder: row.sort_order
  }
}

function withMongoUri(input: ConnectionInput): ConnectionInput {
  if (input.dbType !== 'mongodb') return input
  const host = input.host.trim()
  if (!host) return input
  const srv = input.uri.trim().startsWith('mongodb+srv://')
  return {
    ...input,
    uri: buildMongoUri({
      host,
      port: input.port,
      username: input.username,
      database: input.database,
      srv
    })
  }
}

export const useConnectionStore = create<ConnectionStore>()((set, get) => ({
  connections: [],
  folders: [],
  statusById: {},
  activeConnectionId: null,
  loaded: false,

  load: async () => {
    try {
      const [connections, folderRows] = await Promise.all([loadConnections(), loadFolders()])
      set({ connections, folders: folderRows.map(mapFolder), loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  addConnection: async (input) => {
    const id = newId()
    if (input.password) {
      await keychainApi.savePassword(id, input.password)
    }
    const sortOrder = get().connections.filter((c) => c.folderId === input.folderId).length
    const conn = inputToConnection(withMongoUri(input), id, sortOrder)
    await insertConnection(conn)
    set((state) => ({ connections: [...state.connections, conn] }))
    return id
  },

  editConnection: async (id, input) => {
    const current = get().connections.find((c) => c.id === id)
    if (!current) throw new Error('Connection not found')
    if (get().statusById[id] === 'connected') {
      await get().disconnect(id)
    }
    if (input.password) {
      await keychainApi.savePassword(id, input.password)
    }
    const conn: Connection = {
      ...inputToConnection(withMongoUri(input), id, current.sortOrder),
      createdAt: current.createdAt,
      lastUsedAt: current.lastUsedAt
    }
    await updateConnection(conn)
    set((state) => ({
      connections: state.connections.map((c) => (c.id === id ? conn : c))
    }))
  },

  removeConnection: async (id) => {
    if (get().statusById[id] === 'connected') {
      await get().disconnect(id)
    }
    await keychainApi.deletePassword(id)
    await deleteConnection(id)
    useTabStore.getState().closeTabsForConnection(id)
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      statusById: { ...state.statusById, [id]: 'idle' },
      activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId
    }))
  },

  duplicateConnection: async (id) => {
    const source = get().connections.find((c) => c.id === id)
    if (!source) throw new Error('Connection not found')
    const password = (await keychainApi.getPassword(id)) ?? ''
    const newIdStr = newId()
    if (password) await keychainApi.savePassword(newIdStr, password)
    const copy: Connection = {
      ...source,
      id: newIdStr,
      name: `${source.name} copy`,
      createdAt: nowIso()
    }
    await insertConnection(copy)
    set((state) => ({ connections: [...state.connections, copy] }))
  },

  testConnection: async (input, existingId = null) => {
    try {
      if (input.dbType === 'mongodb') {
        let uri = input.uri.trim()
        if (input.host.trim()) {
          uri = buildMongoUri({
            host: input.host,
            port: input.port,
            username: input.username,
            password: input.password,
            database: input.database,
            srv: uri.startsWith('mongodb+srv://')
          })
        }
        if (!uri) return { ok: false, error: 'URI is required' }
        await mongoApi.connect('__test__', uri)
        await mongoApi.listDatabases('__test__')
        await mongoApi.disconnect('__test__')
        return { ok: true }
      }
      let password = input.password
      if (!password && existingId) {
        password = (await keychainApi.getPassword(existingId)) ?? ''
      }
      const conn = inputToConnection(input, '__test__')
      await window.rowport.sql.test(toConnectPayload(conn, password))
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  },

  listDatabases: async (input, existingId = null) => {
    if (input.dbType === 'mongodb') {
      let uri = input.uri.trim()
      if (input.host.trim()) {
        const password =
          input.password || (existingId ? ((await keychainApi.getPassword(existingId)) ?? '') : '')
        uri = buildMongoUri({
          host: input.host,
          port: input.port,
          username: input.username,
          password,
          srv: uri.startsWith('mongodb+srv://')
        })
      }
      if (!uri) return []
      try {
        await mongoApi.connect('__dbscan__', uri)
        return await mongoApi.listDatabases('__dbscan__')
      } finally {
        await mongoApi.disconnect('__dbscan__').catch(() => undefined)
      }
    }
    let password = input.password
    if (!password && existingId) {
      password = (await keychainApi.getPassword(existingId)) ?? ''
    }
    const bootstrap = input.dbType === 'postgres' ? 'postgres' : 'mysql'
    const conn = inputToConnection({ ...input, database: bootstrap }, '__dbscan__')
    return window.rowport.sql.listDatabases(toConnectPayload(conn, password))
  },

  connect: async (id) => {
    const { statusById, disconnect } = get()
    const currentlyConnected = Object.entries(statusById).find(
      ([, status]) => status === 'connected'
    )
    if (currentlyConnected && currentlyConnected[0] !== id) {
      await disconnect(currentlyConnected[0])
    }

    const conn = get().connections.find((c) => c.id === id)
    if (!conn) throw new Error('Connection not found')
    set((state) => ({ statusById: { ...state.statusById, [id]: 'connecting' } }))
    try {
      if (conn.dbType === 'mongodb') {
        const storedUri = conn.uri?.trim() ?? ''
        let uri = storedUri
        if (conn.host) {
          const password = (await keychainApi.getPassword(id)) ?? ''
          uri = buildMongoUri({
            host: conn.host,
            port: conn.port,
            username: conn.username,
            password,
            database: conn.database,
            srv: storedUri.startsWith('mongodb+srv://')
          })
        }
        if (!uri) throw new Error('Connection URI is missing')
        await mongoApi.connect(id, uri)
        setMongoConnected(id, true)
      } else {
        const password = (await keychainApi.getPassword(id)) ?? ''
        const db = await connectSql(conn, password)
        await db.select('SELECT 1')
      }
      await touchConnection(id)
      set((state) => ({
        statusById: { ...state.statusById, [id]: 'connected' },
        activeConnectionId: id,
        connections: state.connections.map((c) =>
          c.id === id ? { ...c, lastUsedAt: nowIso() } : c
        )
      }))
      useTabStore.getState().openTab(id)
    } catch (error) {
      if (conn.dbType === 'mongodb') {
        setMongoConnected(id, false)
      }
      set((state) => ({ statusById: { ...state.statusById, [id]: 'error' } }))
      throw error
    }
  },

  disconnect: async (id) => {
    const conn = get().connections.find((c) => c.id === id)
    if (!conn) return
    if (conn.dbType === 'mongodb') {
      await mongoApi.disconnect(id)
      setMongoConnected(id, false)
    } else {
      await disconnectSql(id)
    }
    set((state) => ({
      statusById: { ...state.statusById, [id]: 'idle' },
      activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId
    }))
  },

  setActiveConnection: (activeConnectionId) => set({ activeConnectionId }),

  addFolder: async (name, colorTag) => {
    const id = newId()
    await insertFolder(id, name, null, colorTag)
    set((state) => ({
      folders: [...state.folders, { id, name, colorTag, parentId: null, sortOrder: 0 }]
    }))
  },

  updateFolder: async (id, name, colorTag) => {
    await updateFolder(id, name, colorTag)
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === id ? { ...folder, name, colorTag } : folder
      )
    }))
  },

  removeFolder: async (id) => {
    await deleteFolder(id)
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      connections: state.connections.map((c) => (c.folderId === id ? { ...c, folderId: null } : c))
    }))
  },

  setConnectionsOrder: (entries) => {
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    set((state) => ({
      connections: state.connections.map((c) => {
        const entry = byId.get(c.id)
        return entry ? { ...c, folderId: entry.folderId, sortOrder: entry.sortOrder } : c
      })
    }))
    for (const entry of entries) {
      void setConnectionOrder(entry.id, entry.folderId, entry.sortOrder)
    }
  },

  setFoldersOrder: (entries) => {
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    set((state) => ({
      folders: state.folders.map((f) => {
        const entry = byId.get(f.id)
        return entry ? { ...f, sortOrder: entry.sortOrder } : f
      })
    }))
    for (const entry of entries) {
      void setFolderOrder(entry.id, entry.sortOrder)
    }
  }
}))

export function isConnected(connectionId: string): boolean {
  return isSqlConnected(connectionId) || isMongoConnected(connectionId)
}
