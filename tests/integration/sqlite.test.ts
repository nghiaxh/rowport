import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  cancelSql,
  connectSql,
  disconnectSql,
  executeSql,
  runWithQueryControl,
  selectSql
} from '../../src/main/db/connections'
import { QueryCancelledError } from '../../src/shared/errors'
import { countSelect, paginateSelect, splitStatements } from '../../src/lib/sql-utils'

const connectionId = `sqlite-it-${Date.now()}`
let tempDir: string

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'rowport-it-'))
  connectSql(connectionId, { dbType: 'sqlite', filePath: join(tempDir, 'test.db'), sslMode: 'disable' })
})

afterAll(async () => {
  await disconnectSql(connectionId)
  rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

async function seedRows(count: number): Promise<void> {
  await executeSql(
    connectionId,
    'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    []
  )
  await executeSql(connectionId, 'DELETE FROM users', [])
  const insert = executeSql.bind(null, connectionId)
  for (let i = 1; i <= count; i++) {
    await insert('INSERT INTO users (id, name) VALUES (?, ?)', [i, `user ${i}`])
  }
}

describe('sqlite through the real connection path', () => {
  it('runs DDL and DML then reads rows back', async () => {
    await seedRows(3)
    const rows = await selectSql(connectionId, 'SELECT * FROM users ORDER BY id', [])
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ id: 1, name: 'user 1' })
  })

  it('runs multiple statements like runBatch does', async () => {
    const statements = splitStatements(
      'CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO items (label) VALUES (?)'
    )
    expect(statements).toHaveLength(2)
    for (const statement of statements) {
      await executeSql(connectionId, statement, statement.startsWith('INSERT') ? ['a'] : [])
    }
    const rows = await selectSql(connectionId, 'SELECT * FROM items ORDER BY id', [])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ id: 1, label: 'a' })
  })

  it('paginates a query with LIMIT/OFFSET wrapping and reports hasMore', async () => {
    await seedRows(25)
    const pageSize = 10
    const pageOne = await selectSql(
      connectionId,
      paginateSelect('SELECT * FROM users ORDER BY id', pageSize + 1, 0),
      []
    )
    expect(pageOne).toHaveLength(11)
    expect(pageOne.slice(0, pageSize).map((row) => (row as { id: number }).id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    ])

    const pageTwo = await selectSql(
      connectionId,
      paginateSelect('SELECT * FROM users ORDER BY id', pageSize + 1, pageSize),
      []
    )
    expect(pageTwo).toHaveLength(11)
    expect((pageTwo[0] as { id: number }).id).toBe(11)

    const pageThree = await selectSql(
      connectionId,
      paginateSelect('SELECT * FROM users ORDER BY id', pageSize + 1, pageSize * 2),
      []
    )
    expect(pageThree).toHaveLength(5)
    expect((pageThree[0] as { id: number }).id).toBe(21)
    expect((pageThree[4] as { id: number }).id).toBe(25)
  })

  it('counts the full result set without materializing it', async () => {
    await seedRows(25)
    const rows = await selectSql(connectionId, countSelect('SELECT * FROM users'), [])
    expect(rows[0]).toEqual({ _count: 25 })
  })

  it('throws QueryCancelledError for an aborted signal', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      selectSql(connectionId, 'SELECT * FROM users', [], controller.signal)
    ).rejects.toThrow(QueryCancelledError)
  })
})

describe('connection lifecycle', () => {
  it('reconnects by rebuilding the connection', async () => {
    await executeSql(connectionId, 'CREATE TABLE IF NOT EXISTS alive (id INTEGER PRIMARY KEY)', [])
    const before = await selectSql(connectionId, 'SELECT count(*) AS _count FROM alive', [])
    expect(before[0]).toEqual({ _count: 0 })

    await connectSql(connectionId, {
      dbType: 'sqlite',
      filePath: join(tempDir, 'test.db'),
      sslMode: 'disable'
    })
    await executeSql(connectionId, 'INSERT INTO alive (id) VALUES (1)', [])

    const after = await selectSql(connectionId, 'SELECT count(*) AS _count FROM alive', [])
    expect(after[0]).toEqual({ _count: 1 })
  })

  it('releases the sqlite file on disconnect so it can be reopened', async () => {
    await disconnectSql(connectionId)
    await connectSql(connectionId, {
      dbType: 'sqlite',
      filePath: join(tempDir, 'test.db'),
      sslMode: 'disable'
    })
    const rows = await selectSql(connectionId, 'SELECT * FROM alive', [])
    expect(rows).toHaveLength(1)
  })

  it('cancels a tracked query through cancelSql', async () => {
    const queryId = `cancel-${Date.now()}`
    const pending = runWithQueryControl(connectionId, queryId, (signal) => {
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new QueryCancelledError()))
      })
    })
    cancelSql(queryId)
    await expect(pending).rejects.toThrow(QueryCancelledError)
  })
})
