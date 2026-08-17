import type { MongoFieldInfo, MongoFindOptions } from '../shared/rowport-api'
import type { DetectedServer, DbType } from '../types/connection'

export type Option<T> = T | null

export const keychainApi = {
  savePassword: (connectionId: string, password: string) =>
    window.rowport.keychain.savePassword(connectionId, password),
  getPassword: (connectionId: string): Promise<Option<string>> =>
    window.rowport.keychain.getPassword(connectionId),
  deletePassword: (connectionId: string) => window.rowport.keychain.deletePassword(connectionId)
}

export const mongoApi = {
  connect: (connectionId: string, connectionUri: string) =>
    window.rowport.mongo.connect(connectionId, connectionUri),
  disconnect: (connectionId: string) => window.rowport.mongo.disconnect(connectionId),
  listDatabases: (connectionId: string): Promise<string[]> =>
    window.rowport.mongo.listDatabases(connectionId),
  listCollections: (connectionId: string, database: string): Promise<string[]> =>
    window.rowport.mongo.listCollections(connectionId, database),
  find: (
    connectionId: string,
    database: string,
    collection: string,
    options?: MongoFindOptions
  ): Promise<unknown[]> =>
    window.rowport.mongo.find(connectionId, database, collection, options ?? {}),
  aggregate: (
    connectionId: string,
    database: string,
    collection: string,
    pipeline: unknown[]
  ): Promise<unknown[]> =>
    window.rowport.mongo.aggregate(connectionId, database, collection, pipeline),
  sampleFields: (
    connectionId: string,
    database: string,
    collection: string
  ): Promise<MongoFieldInfo[]> =>
    window.rowport.mongo.sampleFields(connectionId, database, collection)
}

export const detectionApi = {
  detectLocalServers: async (): Promise<DetectedServer[]> => {
    const servers = await window.rowport.detect.detectLocalServers()
    return servers.map((server) => ({
      dbType: server.dbType as DbType,
      host: server.host,
      port: server.port
    }))
  }
}

export interface WorkspaceFile {
  name: string
  connections: ConnectionSummary[]
  ui_settings: UiSettings
  created_at: string
  modified_at: string
}

export interface ConnectionSummary {
  id: string
  name: string
  db_type: string
  host?: string | null
  port?: number | null
  database?: string | null
  read_only: boolean
}

export interface UiSettings {
  sidebar_collapsed: boolean
  ui_font: string
  editor_font: string
  editor_font_size: number
  grid_density: string
}

const WORKSPACE_EXT = '.rpw'

function resolveWorkspacePath(path: string, name: string): string {
  return path.endsWith(WORKSPACE_EXT) ? path : `${path}/${name}${WORKSPACE_EXT}`
}

function defaultUiSettings(): UiSettings {
  return {
    sidebar_collapsed: false,
    ui_font: 'inter',
    editor_font: 'mono',
    editor_font_size: 12.5,
    grid_density: 'normal'
  }
}

export const workspaceApi = {
  saveWorkspace: async (path: string, name: string): Promise<void> => {
    const workspace: WorkspaceFile = {
      name,
      connections: [],
      ui_settings: defaultUiSettings(),
      created_at: '',
      modified_at: new Date().toISOString()
    }
    await window.rowport.fs.writeTextFile(
      resolveWorkspacePath(path, name),
      JSON.stringify(workspace)
    )
  },
  loadWorkspace: async (path: string): Promise<WorkspaceFile> => {
    const content = await window.rowport.fs.readTextFile(resolveWorkspacePath(path, 'Untitled'))
    return JSON.parse(content) as WorkspaceFile
  }
}
