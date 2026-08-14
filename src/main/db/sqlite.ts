import Database from 'better-sqlite3'
import { QueryCancelledError } from '../../shared/errors'

export interface SqliteConnection {
  kind: 'sqlite'
  filePath: string
  db: Database.Database
  close: () => void
}

function normalizeParams(sql: string): string {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]!
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2
          } else {
            j++
            break
          }
        } else {
          j++
        }
      }
      out += sql.slice(i, j)
      i = j
      continue
    }
    if (ch === '$' && /\d/.test(sql[i + 1] ?? '')) {
      let j = i + 1
      while (j < sql.length && /\d/.test(sql[j]!)) j++
      out += '?'
      i = j
      continue
    }
    out += ch
    i++
  }
  return out
}

export function createSqliteConnection(filePath: string): SqliteConnection {
  const db = new Database(filePath || ':memory:')
  db.pragma('journal_mode = WAL')
  return {
    kind: 'sqlite',
    filePath: filePath || ':memory:',
    db,
    close: () => db.close()
  }
}

export function sqliteSelect(
  conn: SqliteConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): unknown[] {
  if (signal?.aborted) throw new QueryCancelledError()
  const statement = conn.db.prepare(normalizeParams(sql))
  return statement.all(...params) as unknown[]
}

export function sqliteExecute(
  conn: SqliteConnection,
  sql: string,
  params: unknown[],
  signal?: AbortSignal
): number {
  if (signal?.aborted) throw new QueryCancelledError()
  const statement = conn.db.prepare(normalizeParams(sql))
  const result = statement.run(...(params.length > 0 ? params : []))
  return result.changes
}
