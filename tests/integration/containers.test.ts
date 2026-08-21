import { execFileSync } from 'node:child_process'
import { MongoClient } from 'mongodb'
import { describe, expect, it } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql'
import {
  MongoDBContainer,
  type StartedMongoDBContainer
} from '@testcontainers/mongodb'
import {
  createPostgresConnection,
  postgresExecute,
  postgresSelect,
  type PostgresConnectPayload
} from '../../src/main/db/postgres'
import {
  createMysqlConnection,
  mysqlExecute,
  mysqlSelect,
  type MysqlConnectPayload
} from '../../src/main/db/mysql'
import { MongoManager } from '../../src/main/db/mongodb'
import { countSelect, paginateSelect } from '../../src/lib/sql-utils'
import { QueryCancelledError } from '../../src/shared/errors'

const CONTAINER_TIMEOUT = 180_000

function isDockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
      stdio: 'ignore',
      timeout: 5000
    })
    return true
  } catch {
    return false
  }
}

const dockerAvailable = isDockerAvailable()

async function assertPagedRead(
  run: (sql: string) => Promise<unknown[]>,
  query: string,
  pageSize: number
): Promise<void> {
  const count = await run(countSelect(query))
  const countRow = count[0] as { _count?: unknown } | undefined
  expect(Number(countRow?._count)).toBe(25)

  const first = await run(paginateSelect(query, pageSize + 1, 0))
  expect(first).toHaveLength(pageSize + 1)

  const last = await run(paginateSelect(query, pageSize + 1, pageSize * 2))
  expect(last).toHaveLength(5)
}

describe.skipIf(!dockerAvailable)('postgres', () => {
  let container: StartedPostgreSqlContainer
  let payload: PostgresConnectPayload
  let connection: ReturnType<typeof createPostgresConnection>

  it('executes queries and paginates through real rows', async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    payload = {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      sslMode: 'disable'
    }
    connection = createPostgresConnection(payload)

    const run = (sql: string): Promise<unknown[]> => postgresSelect(connection, sql, [])
    await postgresExecute(
      connection,
      'CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL)',
      []
    )
    for (let i = 1; i <= 25; i++) {
      await postgresExecute(connection, 'INSERT INTO users (name) VALUES (?)', [`user ${i}`])
    }

    const rows = await run('SELECT * FROM users ORDER BY id')
    expect(rows).toHaveLength(25)
    expect(rows[0]).toMatchObject({ id: 1, name: 'user 1' })

    await assertPagedRead(run, 'SELECT * FROM users ORDER BY id', 10)

    const cancelled = new AbortController()
    cancelled.abort()
    await expect(
      postgresSelect(connection, 'SELECT * FROM users', [], cancelled.signal)
    ).rejects.toThrow(QueryCancelledError)
  }, CONTAINER_TIMEOUT)
})

describe.skipIf(!dockerAvailable)('mysql', () => {
  let container: StartedMySqlContainer
  let payload: MysqlConnectPayload
  let connection: ReturnType<typeof createMysqlConnection>

  it('executes queries and paginates through real rows', async () => {
    container = await new MySqlContainer('mysql:8').start()
    payload = {
      host: container.getHost(),
      port: container.getMappedPort(3306),
      username: container.getUsername(),
      password: container.getUserPassword(),
      database: container.getDatabase(),
      sslMode: 'disable'
    }
    connection = createMysqlConnection(payload)

    const run = (sql: string): Promise<unknown[]> => mysqlSelect(connection, sql, [])
    await mysqlExecute(
      connection,
      'CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL)',
      []
    )
    for (let i = 1; i <= 25; i++) {
      await mysqlExecute(connection, 'INSERT INTO users (name) VALUES (?)', [`user ${i}`])
    }

    const rows = await run('SELECT * FROM users ORDER BY id')
    expect(rows).toHaveLength(25)
    expect(rows[0]).toMatchObject({ id: 1, name: 'user 1' })

    await assertPagedRead(run, 'SELECT * FROM users ORDER BY id', 10)
  }, CONTAINER_TIMEOUT)
})

describe.skipIf(!dockerAvailable)('mongodb', () => {
  let container: StartedMongoDBContainer
  let manager: MongoManager

  it('finds documents with skip/limit and aggregates a paged pipeline', async () => {
    container = await new MongoDBContainer('mongo:7').start()
    manager = new MongoManager()
    const connectionId = `mongo-it-${Date.now()}`
    const uri = `mongodb://${container.getHost()}:${container.getMappedPort(27017)}/?directConnection=true`
    await manager.connect(connectionId, uri)

    const client = new MongoClient(uri)
    await client.connect()
    const collection = client.db('test').collection('users')
    await collection.insertMany(
      Array.from({ length: 25 }, (_, index) => ({ index: index + 1, name: `user ${index + 1}` }))
    )

    const pageOne = await manager.find(connectionId, 'test', 'users', { limit: 10, sort: { index: 1 } })
    expect(pageOne).toHaveLength(10)
    expect(pageOne[0]).toMatchObject({ index: 1 })

    const pageTwo = await manager.find(connectionId, 'test', 'users', {
      limit: 10,
      skip: 10,
      sort: { index: 1 }
    })
    expect(pageTwo).toHaveLength(10)
    expect(pageTwo[0]).toMatchObject({ index: 11 })

    const paged = await manager.aggregate(connectionId, 'test', 'users', [
      { $sort: { index: 1 } },
      { $skip: 20 },
      { $limit: 10 }
    ])
    expect(paged).toHaveLength(5)
    expect(paged[0]).toMatchObject({ index: 21 })

    await manager.disconnect(connectionId)
    await client.close()
  }, CONTAINER_TIMEOUT)
})
