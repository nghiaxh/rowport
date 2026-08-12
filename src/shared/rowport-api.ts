export type SqlDbType = 'postgres' | 'mysql' | 'sqlite'

export interface SqlConnectPayload {
  dbType: SqlDbType
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  database?: string | null
  filePath?: string | null
  sslMode: string
}

export interface SqlExecuteResult {
  rowsAffected: number
}

export interface DetectedServer {
  dbType: string
  host: string
  port: number
}

export interface MongoFindOptions {
  filter?: unknown
  projection?: unknown
  sort?: unknown
  skip?: number
  limit?: number
}

export interface MongoFieldInfo {
  path: string
  type: string
}

export interface OpenDialogOptions {
  multiple?: boolean
  directory?: boolean
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface SaveDialogOptions {
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export const IPC_CHANNELS = {
  sqlConnect: 'sql:connect',
  sqlDisconnect: 'sql:disconnect',
  sqlSelect: 'sql:select',
  sqlExecute: 'sql:execute',
  sqlCancel: 'sql:cancel',
  sqlTest: 'sql:test',
  sqlListDatabases: 'sql:listDatabases',
  appDbSelect: 'appDb:select',
  appDbExecute: 'appDb:execute',
  keychainSave: 'keychain:save',
  keychainGet: 'keychain:get',
  keychainDelete: 'keychain:delete',
  mongoConnect: 'mongo:connect',
  mongoDisconnect: 'mongo:disconnect',
  mongoListDatabases: 'mongo:listDatabases',
  mongoListCollections: 'mongo:listCollections',
  mongoFind: 'mongo:find',
  mongoAggregate: 'mongo:aggregate',
  mongoSampleFields: 'mongo:sampleFields',
  detectLocalServers: 'detect:localServers',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsDelete: 'settings:delete',
  dialogOpen: 'dialog:open',
  dialogSave: 'dialog:save',
  fsReadTextFile: 'fs:readTextFile',
  fsWriteTextFile: 'fs:writeTextFile',
  clipboardWrite: 'clipboard:write',
  clipboardRead: 'clipboard:read',
  windowMinimize: 'window:minimize',
  windowMaximize: 'window:maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:isMaximized',
  windowMaximizedChange: 'window:maximized-change',
  appGetVersion: 'app:getVersion',
  appRestart: 'app:restart',
  assistantChat: 'assistant:chat',
  assistantListModels: 'assistant:listModels',
  assistantTestConnection: 'assistant:testConnection'
} as const

export interface RuntimeVersions {
  electron: string
  chrome: string
  node: string
}

export interface RowportApi {
  platform: string
  versions: RuntimeVersions
  sql: {
    connect: (connectionId: string, payload: SqlConnectPayload) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    select: (
      connectionId: string,
      sql: string,
      params?: unknown[],
      queryId?: string
    ) => Promise<unknown[]>
    execute: (connectionId: string, sql: string, params?: unknown[]) => Promise<SqlExecuteResult>
    cancel: (queryId: string) => Promise<void>
    test: (payload: SqlConnectPayload) => Promise<void>
    listDatabases: (payload: SqlConnectPayload) => Promise<string[]>
  }
  appDb: {
    select: (sql: string, params?: unknown[]) => Promise<unknown[]>
    execute: (sql: string, params?: unknown[]) => Promise<SqlExecuteResult>
  }
  keychain: {
    savePassword: (connectionId: string, password: string) => Promise<void>
    getPassword: (connectionId: string) => Promise<string | null>
    deletePassword: (connectionId: string) => Promise<void>
  }
  mongo: {
    connect: (connectionId: string, connectionUri: string) => Promise<void>
    disconnect: (connectionId: string) => Promise<void>
    listDatabases: (connectionId: string) => Promise<string[]>
    listCollections: (connectionId: string, database: string) => Promise<string[]>
    find: (
      connectionId: string,
      database: string,
      collection: string,
      options: MongoFindOptions
    ) => Promise<unknown[]>
    aggregate: (
      connectionId: string,
      database: string,
      collection: string,
      pipeline: unknown[]
    ) => Promise<unknown[]>
    sampleFields: (
      connectionId: string,
      database: string,
      collection: string
    ) => Promise<MongoFieldInfo[]>
  }
  detect: {
    detectLocalServers: () => Promise<DetectedServer[]>
  }
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    delete: (key: string) => Promise<void>
  }
  dialog: {
    open: (options?: OpenDialogOptions) => Promise<string | null>
    save: (options?: SaveDialogOptions) => Promise<string | null>
  }
  fs: {
    readTextFile: (path: string) => Promise<string>
    writeTextFile: (path: string, contents: string) => Promise<void>
  }
  clipboard: {
    writeText: (text: string) => Promise<void>
    readText: () => Promise<string>
  }
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
  }
  app: {
    getVersion: () => Promise<string>
    restart: () => Promise<void>
  }
  assistant: {
    chat: (
      provider: string,
      model: string,
      messages: Array<{ role: string; content: string }>,
      options?: { ollamaUrl?: string; openaiApiKey?: string }
    ) => Promise<{ content: string }>
    listModels: (
      provider: string,
      options?: { ollamaUrl?: string; openaiApiKey?: string }
    ) => Promise<string[]>
    testConnection: (
      provider: string,
      options?: { ollamaUrl?: string; openaiApiKey?: string }
    ) => Promise<boolean>
  }
}
