import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/rowport-api.js'
import {
  appDbSelectArgsSchema,
  connectionIdSchema,
  fsReadArgsSchema,
  fsWriteArgsSchema,
  keychainSaveArgsSchema,
  mongoAggregateArgsSchema,
  mongoConnectArgsSchema,
  mongoDatabaseArgsSchema,
  mongoFindArgsSchema,
  mongoResourceArgsSchema,
  sqlCancelArgsSchema,
  sqlConnectArgsSchema,
  sqlConnectSchema,
  sqlSelectArgsSchema
} from '../../shared/validation/index.js'
import { parseOrThrow } from './validate.js'
import { randomUUID } from 'node:crypto'
import {
  cancelSql,
  connectSql,
  disconnectSql,
  executeSql,
  listSqlDatabases,
  runWithQueryControl,
  selectSql,
  testSql
} from '../db/connections.js'
import { MongoManager } from '../db/mongodb.js'
import { appDbExecute, appDbSelect } from './metadata.js'
import * as keychain from './keychain.js'
import * as detect from './detect.js'
import * as settings from './settings.js'
import * as fsDialog from './fs-dialog.js'
import * as clipboardApi from './clipboard.js'
import * as appApi from './app.js'
import { registerAssistantHandlers } from './assistant.js'

export const mongoManager = new MongoManager()

export function registerIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.sqlConnect, (_event, connectionId: string, payload) => {
    const args = parseOrThrow(sqlConnectArgsSchema, { connectionId, payload })
    return connectSql(args.connectionId, args.payload)
  })
  ipcMain.handle(IPC_CHANNELS.sqlDisconnect, (_event, connectionId: string) =>
    disconnectSql(parseOrThrow(connectionIdSchema, connectionId))
  )
  ipcMain.handle(
    IPC_CHANNELS.sqlSelect,
    (_event, connectionId: string, sql: string, params: unknown[], queryId: string) => {
      const args = parseOrThrow(sqlSelectArgsSchema, { connectionId, sql, params, queryId })
      const qid = args.queryId || randomUUID()
      return runWithQueryControl(args.connectionId, qid, (signal) =>
        selectSql(args.connectionId, args.sql, args.params, signal)
      )
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.sqlExecute,
    (_event, connectionId: string, sql: string, params: unknown[]) => {
      const args = parseOrThrow(sqlSelectArgsSchema, { connectionId, sql, params })
      return runWithQueryControl(args.connectionId, randomUUID(), (signal) =>
        executeSql(args.connectionId, args.sql, args.params, signal).then((rowsAffected) => ({
          rowsAffected
        }))
      )
    }
  )
  ipcMain.handle(IPC_CHANNELS.sqlCancel, (_event, queryId: string) => {
    parseOrThrow(sqlCancelArgsSchema, { queryId })
    cancelSql(queryId)
  })
  ipcMain.handle(IPC_CHANNELS.sqlTest, (_event, payload) =>
    testSql(parseOrThrow(sqlConnectSchema, payload))
  )
  ipcMain.handle(IPC_CHANNELS.sqlListDatabases, (_event, payload) =>
    listSqlDatabases(parseOrThrow(sqlConnectSchema, payload))
  )

  ipcMain.handle(IPC_CHANNELS.appDbSelect, (_event, sql: string, params: unknown[]) => {
    const args = parseOrThrow(appDbSelectArgsSchema, { sql, params })
    return appDbSelect(args.sql, args.params)
  })
  ipcMain.handle(IPC_CHANNELS.appDbExecute, (_event, sql: string, params: unknown[]) => {
    const args = parseOrThrow(appDbSelectArgsSchema, { sql, params })
    return { rowsAffected: appDbExecute(args.sql, args.params ?? []) }
  })

  ipcMain.handle(IPC_CHANNELS.keychainSave, (_event, connectionId: string, password: string) => {
    const args = parseOrThrow(keychainSaveArgsSchema, { connectionId, password })
    return keychain.savePassword(args.connectionId, args.password)
  })
  ipcMain.handle(IPC_CHANNELS.keychainGet, (_event, connectionId: string) =>
    keychain.getPassword(parseOrThrow(connectionIdSchema, connectionId))
  )
  ipcMain.handle(IPC_CHANNELS.keychainDelete, (_event, connectionId: string) =>
    keychain.deletePassword(parseOrThrow(connectionIdSchema, connectionId))
  )

  ipcMain.handle(
    IPC_CHANNELS.mongoConnect,
    (_event, connectionId: string, connectionUri: string) => {
      const args = parseOrThrow(mongoConnectArgsSchema, { connectionId, connectionUri })
      return mongoManager.connect(args.connectionId, args.connectionUri)
    }
  )
  ipcMain.handle(IPC_CHANNELS.mongoDisconnect, (_event, connectionId: string) =>
    mongoManager.disconnect(parseOrThrow(connectionIdSchema, connectionId))
  )
  ipcMain.handle(IPC_CHANNELS.mongoListDatabases, (_event, connectionId: string) =>
    mongoManager.listDatabases(parseOrThrow(connectionIdSchema, connectionId))
  )
  ipcMain.handle(
    IPC_CHANNELS.mongoListCollections,
    (_event, connectionId: string, database: string) => {
      const args = parseOrThrow(mongoDatabaseArgsSchema, { connectionId, database })
      return mongoManager.listCollections(args.connectionId, args.database)
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.mongoFind,
    (_event, connectionId: string, database: string, collection: string, options) => {
      const args = parseOrThrow(mongoFindArgsSchema, {
        connectionId,
        database,
        collection,
        options
      })
      return mongoManager.find(args.connectionId, args.database, args.collection, args.options)
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.mongoAggregate,
    (_event, connectionId: string, database: string, collection: string, pipeline: unknown[]) => {
      const args = parseOrThrow(mongoAggregateArgsSchema, {
        connectionId,
        database,
        collection,
        pipeline
      })
      return mongoManager.aggregate(
        args.connectionId,
        args.database,
        args.collection,
        args.pipeline
      )
    }
  )
  ipcMain.handle(
    IPC_CHANNELS.mongoSampleFields,
    (_event, connectionId: string, database: string, collection: string) => {
      const args = parseOrThrow(mongoResourceArgsSchema, { connectionId, database, collection })
      return mongoManager.sampleFields(args.connectionId, args.database, args.collection)
    }
  )

  ipcMain.handle(IPC_CHANNELS.detectLocalServers, () => detect.detectLocalServers())

  ipcMain.handle(IPC_CHANNELS.settingsGet, (_event, key: string) => settings.getSetting(key))
  ipcMain.handle(IPC_CHANNELS.settingsSet, (_event, key: string, value: string) =>
    settings.setSetting(key, value)
  )
  ipcMain.handle(IPC_CHANNELS.settingsDelete, (_event, key: string) => settings.deleteSetting(key))

  ipcMain.handle(IPC_CHANNELS.dialogOpen, (event, options) =>
    fsDialog.showOpenDialog(fromEvent(event), options)
  )
  ipcMain.handle(IPC_CHANNELS.dialogSave, (event, options) =>
    fsDialog.showSaveDialog(fromEvent(event), options)
  )
  ipcMain.handle(IPC_CHANNELS.fsReadTextFile, (_event, path: string) =>
    fsDialog.readTextFile(parseOrThrow(fsReadArgsSchema, { path }).path)
  )
  ipcMain.handle(IPC_CHANNELS.fsWriteTextFile, (_event, path: string, contents: string) => {
    const args = parseOrThrow(fsWriteArgsSchema, { path, contents })
    return fsDialog.writeTextFile(args.path, args.contents)
  })

  ipcMain.handle(IPC_CHANNELS.clipboardWrite, (_event, text: string) =>
    clipboardApi.writeClipboard(text)
  )
  ipcMain.handle(IPC_CHANNELS.clipboardRead, () => clipboardApi.readClipboard())

  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => getMainWindow()?.minimize())
  ipcMain.handle(IPC_CHANNELS.windowMaximize, () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })
  ipcMain.handle(IPC_CHANNELS.windowClose, () => getMainWindow()?.close())
  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => getMainWindow()?.isMaximized() ?? false)

  ipcMain.handle(IPC_CHANNELS.appGetVersion, () => appApi.getVersion())
  ipcMain.handle(IPC_CHANNELS.appRestart, () => appApi.restartApp())

  registerAssistantHandlers()
}

function fromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}
