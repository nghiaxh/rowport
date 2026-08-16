import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC_CHANNELS,
  type RowportApi,
  type SqlConnectPayload,
  type OpenDialogOptions,
  type SaveDialogOptions,
  type MongoFindOptions
} from '../shared/rowport-api'

const api: RowportApi = {
  platform: process.platform,
  versions: {
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? ''
  },
  sql: {
    connect: (connectionId, payload: SqlConnectPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.sqlConnect, connectionId, payload),
    disconnect: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.sqlDisconnect, connectionId),
    select: (connectionId, sql, params = [], queryId = '') =>
      ipcRenderer.invoke(IPC_CHANNELS.sqlSelect, connectionId, sql, params, queryId),
    execute: (connectionId, sql, params = []) =>
      ipcRenderer.invoke(IPC_CHANNELS.sqlExecute, connectionId, sql, params),
    cancel: (queryId) => ipcRenderer.invoke(IPC_CHANNELS.sqlCancel, queryId),
    test: (payload: SqlConnectPayload) => ipcRenderer.invoke(IPC_CHANNELS.sqlTest, payload),
    listDatabases: (payload: SqlConnectPayload) =>
      ipcRenderer.invoke(IPC_CHANNELS.sqlListDatabases, payload)
  },
  appDb: {
    select: (sql, params = []) => ipcRenderer.invoke(IPC_CHANNELS.appDbSelect, sql, params),
    execute: (sql, params = []) => ipcRenderer.invoke(IPC_CHANNELS.appDbExecute, sql, params)
  },
  keychain: {
    savePassword: (connectionId, password) =>
      ipcRenderer.invoke(IPC_CHANNELS.keychainSave, connectionId, password),
    getPassword: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.keychainGet, connectionId),
    deletePassword: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.keychainDelete, connectionId)
  },
  mongo: {
    connect: (connectionId, connectionUri) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoConnect, connectionId, connectionUri),
    disconnect: (connectionId) => ipcRenderer.invoke(IPC_CHANNELS.mongoDisconnect, connectionId),
    listDatabases: (connectionId) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoListDatabases, connectionId),
    listCollections: (connectionId, database) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoListCollections, connectionId, database),
    find: (connectionId, database, collection, options: MongoFindOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoFind, connectionId, database, collection, options),
    aggregate: (connectionId, database, collection, pipeline) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoAggregate, connectionId, database, collection, pipeline),
    sampleFields: (connectionId, database, collection) =>
      ipcRenderer.invoke(IPC_CHANNELS.mongoSampleFields, connectionId, database, collection)
  },
  detect: {
    detectLocalServers: () => ipcRenderer.invoke(IPC_CHANNELS.detectLocalServers)
  },
  settings: {
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.settingsGet, key),
    set: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.settingsSet, key, value),
    delete: (key) => ipcRenderer.invoke(IPC_CHANNELS.settingsDelete, key)
  },
  dialog: {
    open: (options?: OpenDialogOptions) => ipcRenderer.invoke(IPC_CHANNELS.dialogOpen, options),
    save: (options?: SaveDialogOptions) => ipcRenderer.invoke(IPC_CHANNELS.dialogSave, options)
  },
  fs: {
    readTextFile: (path) => ipcRenderer.invoke(IPC_CHANNELS.fsReadTextFile, path),
    writeTextFile: (path, contents) =>
      ipcRenderer.invoke(IPC_CHANNELS.fsWriteTextFile, path, contents)
  },
  clipboard: {
    writeText: (text) => ipcRenderer.invoke(IPC_CHANNELS.clipboardWrite, text),
    readText: () => ipcRenderer.invoke(IPC_CHANNELS.clipboardRead)
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.windowMaximize),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: unknown, isMaximized: boolean): void => callback(isMaximized)
      ipcRenderer.on(IPC_CHANNELS.windowMaximizedChange, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.windowMaximizedChange, listener)
      }
    }
  },
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.appGetVersion),
    restart: () => ipcRenderer.invoke(IPC_CHANNELS.appRestart)
  },
  assistant: {
    chat: (provider, model, messages, options?) =>
      ipcRenderer.invoke(IPC_CHANNELS.assistantChat, provider, model, messages, options),
    listModels: (provider, options?) =>
      ipcRenderer.invoke(IPC_CHANNELS.assistantListModels, provider, options),
    testConnection: (provider, options?) =>
      ipcRenderer.invoke(IPC_CHANNELS.assistantTestConnection, provider, options)
  }
}

contextBridge.exposeInMainWorld('rowport', api)
