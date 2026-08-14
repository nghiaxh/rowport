import { MongoClient, type Sort } from 'mongodb'
import { EJSON, ObjectId, type BSONValue } from 'bson'

const CONNECT_TIMEOUT_MS = 10_000
const DEFAULT_FIND_LIMIT = 1000
const MAX_FIND_LIMIT = 5000

export class MongoManager {
  private clients = new Map<string, MongoClient>()

  async connect(connectionId: string, connectionUri: string): Promise<void> {
    const client = new MongoClient(connectionUri, {
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS
    })
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    await this.disconnect(connectionId)
    this.clients.set(connectionId, client)
  }

  private getClient(connectionId: string): MongoClient {
    const client = this.clients.get(connectionId)
    if (!client) throw new Error('mongodb connection is not open')
    return client
  }

  async disconnect(connectionId: string): Promise<void> {
    const client = this.clients.get(connectionId)
    if (client) {
      await client.close().catch(() => undefined)
    }
    this.clients.delete(connectionId)
  }

  async listDatabases(connectionId: string): Promise<string[]> {
    return this.getClient(connectionId)
      .db()
      .admin()
      .listDatabases()
      .then(({ databases }) => databases.map((db) => db.name))
  }

  async listCollections(connectionId: string, database: string): Promise<string[]> {
    return this.getClient(connectionId)
      .db(database)
      .listCollections()
      .toArray()
      .then((collections) => collections.map((c) => c.name))
  }

  async find(
    connectionId: string,
    database: string,
    collection: string,
    options: {
      filter?: unknown
      projection?: unknown
      sort?: unknown
      skip?: number
      limit?: number
    }
  ): Promise<unknown[]> {
    const col = this.getClient(connectionId).db(database).collection(collection)
    const filter = (options.filter ?? {}) as Record<string, unknown>
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_FIND_LIMIT, 1), MAX_FIND_LIMIT)
    let cursor = col.find(filter)
    if (options.projection) cursor = cursor.project(options.projection as object)
    if (options.sort) cursor = cursor.sort(options.sort as Sort)
    if (options.skip) cursor = cursor.skip(options.skip)
    cursor = cursor.limit(limit)
    const docs = await cursor.toArray()
    return docs.map((doc) => EJSON.parse(EJSON.stringify(doc)))
  }

  async aggregate(
    connectionId: string,
    database: string,
    collection: string,
    pipeline: unknown[]
  ): Promise<unknown[]> {
    const col = this.getClient(connectionId).db(database).collection(collection)
    const docs = await col.aggregate(pipeline as object[]).toArray()
    return docs.map((doc) => EJSON.parse(EJSON.stringify(doc)))
  }

  async sampleFields(
    connectionId: string,
    database: string,
    collection: string
  ): Promise<Array<{ path: string; type: string }>> {
    const col = this.getClient(connectionId).db(database).collection(collection)
    const doc = await col.findOne({})
    if (!doc) return []
    return flattenFields(doc)
  }

  clear(): void {
    for (const client of this.clients.values()) {
      void client.close().catch(() => undefined)
    }
    this.clients.clear()
  }
}

function flattenFields(value: Record<string, BSONValue>): Array<{ path: string; type: string }> {
  const fields: Array<{ path: string; type: string }> = []
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      fields.push({ path, type: 'array' })
      if (node.length > 0) walk(node[0], `${path}[]`)
      return
    }
    if (node && typeof node === 'object') {
      if (node instanceof ObjectId) {
        fields.push({ path, type: 'ObjectId' })
        return
      }
      if (node instanceof Date) {
        fields.push({ path, type: 'date' })
        return
      }
      const record = node as Record<string, unknown>
      const keys = Object.keys(record)
      if (keys.length === 0) {
        fields.push({ path, type: 'object' })
        return
      }
      if (keys.length === 1 && keys[0] !== undefined) {
        const only = keys[0]!
        if (
          only === '$oid' ||
          only === '$date' ||
          only === '$numberLong' ||
          only === '$numberDecimal' ||
          only === '$binary'
        ) {
          fields.push({ path, type: 'object' })
          return
        }
      }
      for (const key of keys) {
        const next = path ? `${path}.${key}` : key
        walk(record[key], next)
      }
      return
    }
    const type =
      typeof node === 'number'
        ? 'number'
        : typeof node === 'string'
          ? 'string'
          : typeof node === 'boolean'
            ? 'bool'
            : node === null
              ? 'null'
              : 'string'
    fields.push({ path, type })
  }
  walk(value, '')
  return fields
}
