import { join } from 'node:path'
import { app } from 'electron'
import {
  createSqliteConnection,
  sqliteExecute,
  sqliteSelect,
  type SqliteConnection
} from '../db/sqlite.js'
import { setAppDbPath } from '../db/connections.js'

let appDb: SqliteConnection | null = null

export function getAppDbConnection(): SqliteConnection {
  if (!appDb) {
    const filePath = join(app.getPath('userData'), 'app.db')
    setAppDbPath(filePath)
    appDb = createSqliteConnection(filePath)
  }
  return appDb
}

export function appDbSelect(sql: string, params: unknown[]): unknown[] {
  return sqliteSelect(getAppDbConnection(), sql, params)
}

export function appDbExecute(sql: string, params: unknown[]): number {
  return sqliteExecute(getAppDbConnection(), sql, params)
}

export function closeAppDb(): void {
  if (appDb) {
    appDb.close()
    appDb = null
  }
}
