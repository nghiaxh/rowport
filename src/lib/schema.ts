import { getSqlInstance, type SqlInstance } from './db-connections'
import { mongoApi } from './electron-api'
import type { DbType } from '../types/connection'

export interface SchemaColumn {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
}

export interface SchemaTable {
  schema: string
  name: string
  kind: 'table' | 'view'
  columns: SchemaColumn[]
}

export interface MongoCollectionNode {
  database: string
  collections: string[]
}

export interface ForeignKey {
  schema: string
  table: string
  column: string
  refSchema: string
  refTable: string
  refColumn: string
}

interface InformationSchemaColumnRow {
  table_schema: string
  table_name: string
  table_type: string
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  column_key: string | null
}

interface SqliteTableRow {
  name: string
  type: string
}

interface SqlitePragmaRow {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

const PG_EXCLUDED_SCHEMAS = ['pg_catalog', 'information_schema']
const MYSQL_EXCLUDED_SCHEMAS = ['information_schema', 'mysql', 'performance_schema', 'sys']

export async function loadSqlSchema(dbType: DbType, connectionId: string): Promise<SchemaTable[]> {
  const db = getSqlInstance(connectionId)
  if (!db) throw new Error('Connection not found')

  if (dbType === 'sqlite') {
    return loadSqliteSchema(db)
  }
  if (dbType === 'postgres') {
    return loadInformationSchema(db, 'postgres')
  }
  if (dbType === 'mysql') {
    return loadInformationSchema(db, 'mysql')
  }
  throw new Error('Unsupported database type')
}

async function loadSqliteSchema(db: SqlInstance): Promise<SchemaTable[]> {
  const tables = await db.select<SqliteTableRow[]>(
    `SELECT name, type FROM sqlite_master
     WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )
  const result: SchemaTable[] = []
  for (const table of tables) {
    if (table.type === 'table') {
      const pragma = await db.select<SqlitePragmaRow[]>(
        `PRAGMA table_info("${table.name.replaceAll('"', '""')}")`
      )
      result.push({
        schema: 'main',
        name: table.name,
        kind: 'table',
        columns: pragma.map((column) => ({
          name: column.name,
          dataType: column.type || 'TEXT',
          nullable: column.notnull === 0,
          isPrimaryKey: column.pk > 0,
          defaultValue: column.dflt_value
        }))
      })
    } else {
      result.push({ schema: 'main', name: table.name, kind: 'view', columns: [] })
    }
  }
  return result
}

async function loadInformationSchema(
  db: SqlInstance,
  connType: 'postgres' | 'mysql'
): Promise<SchemaTable[]> {
  const excluded = connType === 'postgres' ? PG_EXCLUDED_SCHEMAS : MYSQL_EXCLUDED_SCHEMAS
  const placeholders = excluded
    .map((_, index) => (connType === 'mysql' ? '?' : `$${index + 1}`))
    .join(', ')
  const column = (name: string): string => (connType === 'mysql' ? `CAST(${name} AS CHAR)` : name)
  const rows = await db.select<InformationSchemaColumnRow[]>(
    `SELECT
       ${column('c.table_schema')} AS table_schema,
       ${column('c.table_name')} AS table_name,
       ${column("CASE WHEN t.table_type = 'VIEW' THEN 'view' ELSE 'table' END")} AS table_type,
       ${column('c.column_name')} AS column_name,
       ${column('c.data_type')} AS data_type,
       ${column('c.is_nullable')} AS is_nullable,
       ${column('c.column_default')} AS column_default,
       ${column('c.column_key')} AS column_key
     FROM information_schema.columns c
     JOIN information_schema.tables t
       ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema NOT IN (${placeholders})
     ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
    excluded
  )

  const tables = new Map<string, SchemaTable>()
  for (const row of rows) {
    const key = `${row.table_schema}.${row.table_name}`
    let table = tables.get(key)
    if (!table) {
      table = {
        schema: row.table_schema,
        name: row.table_name,
        kind: row.table_type === 'view' ? 'view' : 'table',
        columns: []
      }
      tables.set(key, table)
    }
    table.columns.push({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: row.column_key === 'PRI',
      defaultValue: row.column_default
    })
  }
  return Array.from(tables.values())
}

export async function loadMongoSchema(connectionId: string): Promise<MongoCollectionNode[]> {
  const databases = await mongoApi.listDatabases(connectionId)
  const nodes: MongoCollectionNode[] = []
  for (const database of databases) {
    const collections = await mongoApi.listCollections(connectionId, database)
    nodes.push({ database, collections })
  }
  return nodes
}

const sqlSchemaCache = new Map<string, Promise<SchemaTable[]>>()

export function getCachedSqlSchema(dbType: DbType, connectionId: string): Promise<SchemaTable[]> {
  let cached = sqlSchemaCache.get(connectionId)
  if (!cached) {
    cached = loadSqlSchema(dbType, connectionId)
      .then((tables) => {
        sqlSchemaCache.set(connectionId, Promise.resolve(tables))
        return tables
      })
      .catch((error) => {
        sqlSchemaCache.delete(connectionId)
        throw error
      })
    sqlSchemaCache.set(connectionId, cached)
  }
  return cached
}

export function invalidateSqlSchemaCache(connectionId: string): void {
  sqlSchemaCache.delete(connectionId)
  foreignKeyCache.delete(connectionId)
}

interface PgForeignKeyRow {
  table_schema: string
  table_name: string
  column_name: string
  ref_schema: string
  ref_table: string
  ref_column: string
}

async function loadPgForeignKeys(db: SqlInstance): Promise<ForeignKey[]> {
  const placeholders = PG_EXCLUDED_SCHEMAS.map((_, index) => `$${index + 1}`).join(', ')
  const rows = await db.select<PgForeignKeyRow[]>(
    `SELECT
       tc.table_schema, tc.table_name, kcu.column_name,
       ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
     JOIN information_schema.referential_constraints rc
       ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
     JOIN information_schema.key_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema NOT IN (${placeholders})
     ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position`,
    PG_EXCLUDED_SCHEMAS
  )
  return rows.map((row) => ({
    schema: row.table_schema,
    table: row.table_name,
    column: row.column_name,
    refSchema: row.ref_schema,
    refTable: row.ref_table,
    refColumn: row.ref_column
  }))
}

interface MysqlForeignKeyRow {
  table_schema: string
  table_name: string
  column_name: string
  ref_schema: string
  ref_table: string
  ref_column: string
}

async function loadMysqlForeignKeys(db: SqlInstance): Promise<ForeignKey[]> {
  const placeholders = MYSQL_EXCLUDED_SCHEMAS.map(() => '?').join(', ')
  const rows = await db.select<MysqlForeignKeyRow[]>(
    `SELECT
       CAST(table_schema AS CHAR) AS table_schema,
       CAST(table_name AS CHAR) AS table_name,
       CAST(column_name AS CHAR) AS column_name,
       CAST(referenced_table_schema AS CHAR) AS ref_schema,
       CAST(referenced_table_name AS CHAR) AS ref_table,
       CAST(referenced_column_name AS CHAR) AS ref_column
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE table_schema NOT IN (${placeholders}) AND referenced_table_name IS NOT NULL
     ORDER BY table_schema, table_name, ordinal_position`,
    MYSQL_EXCLUDED_SCHEMAS
  )
  return rows.map((row) => ({
    schema: row.table_schema,
    table: row.table_name,
    column: row.column_name,
    refSchema: row.ref_schema,
    refTable: row.ref_table,
    refColumn: row.ref_column
  }))
}

async function loadSqliteForeignKeys(db: SqlInstance): Promise<ForeignKey[]> {
  const tables = await db.select<SqliteTableRow[]>(
    `SELECT name, type FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  )
  const result: ForeignKey[] = []
  for (const table of tables) {
    const rows = await db.select<Array<Record<string, unknown>>>(
      `PRAGMA foreign_key_list("${table.name.replaceAll('"', '""')}")`
    )
    for (const row of rows) {
      const from = row.from
      const refTable = row.table
      const to = row.to
      if (typeof from !== 'string' || typeof refTable !== 'string') continue
      result.push({
        schema: 'main',
        table: table.name,
        column: from,
        refSchema: 'main',
        refTable,
        refColumn: typeof to === 'string' ? to : ''
      })
    }
  }
  return result
}

export async function loadForeignKeys(dbType: DbType, connectionId: string): Promise<ForeignKey[]> {
  const db = getSqlInstance(connectionId)
  if (!db) throw new Error('Connection not found')

  if (dbType === 'sqlite') return loadSqliteForeignKeys(db)
  if (dbType === 'postgres') return loadPgForeignKeys(db)
  if (dbType === 'mysql') return loadMysqlForeignKeys(db)
  throw new Error('Unsupported database type')
}

const foreignKeyCache = new Map<string, Promise<ForeignKey[]>>()

export function getCachedForeignKeys(dbType: DbType, connectionId: string): Promise<ForeignKey[]> {
  let cached = foreignKeyCache.get(connectionId)
  if (!cached) {
    cached = loadForeignKeys(dbType, connectionId)
      .then((keys) => {
        foreignKeyCache.set(connectionId, Promise.resolve(keys))
        return keys
      })
      .catch((error) => {
        foreignKeyCache.delete(connectionId)
        throw error
      })
    foreignKeyCache.set(connectionId, cached)
  }
  return cached
}
