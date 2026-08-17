import type { FolderRow, Connection, ConnectionRow } from '../types/connection'
import type { QueryHistoryEntry, QueryHistoryRow } from '../types/query'
import type { RowportApi } from '../shared/rowport-api'

const SCHEMA_STATEMENTS = [
  `
  CREATE TABLE IF NOT EXISTS connections (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      db_type         TEXT NOT NULL,
      host            TEXT,
      port            INTEGER,
      username        TEXT,
      password_enc    TEXT,
      database_name   TEXT,
      file_path       TEXT,
      uri             TEXT,
      ssl_mode        TEXT NOT NULL DEFAULT 'disable',
      ssh_tunnel_json TEXT,
      color_tag       TEXT,
      folder_id       TEXT,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      read_only       INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      last_used_at    TEXT,
      FOREIGN KEY (folder_id) REFERENCES connection_folders(id) ON DELETE SET NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS connection_folders (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      color_tag   TEXT,
      parent_id   TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES connection_folders(id) ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS query_history (
      id              TEXT PRIMARY KEY,
      connection_id   TEXT,
      query_text      TEXT NOT NULL,
      executed_at     TEXT NOT NULL,
      duration_ms     INTEGER,
      row_count       INTEGER,
      status          TEXT NOT NULL,
      error_message   TEXT,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE SET NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS saved_queries (
      id              TEXT PRIMARY KEY,
      connection_id   TEXT,
      title           TEXT NOT NULL,
      query_text      TEXT NOT NULL,
      tags            TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS er_diagram_layouts (
      id              TEXT PRIMARY KEY,
      connection_id   TEXT NOT NULL,
      schema_name     TEXT NOT NULL,
      layout_json     TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
  );
  `
]

type AppDb = RowportApi['appDb']

let db: AppDb | null = null

export async function getMetadataDb(): Promise<AppDb> {
  if (db) return db
  const instance = window.rowport.appDb
  for (const statement of SCHEMA_STATEMENTS) {
    await instance.execute(statement)
  }
  await migrateFolderColorTag(instance)
  await migrateConnectionSortOrder(instance)
  await migrateQueryHistorySortOrder(instance)
  db = instance
  return instance
}

async function migrateConnectionSortOrder(instance: AppDb): Promise<void> {
  const rows = (await instance.select('PRAGMA table_info(connections)')) as Array<{
    name: string
  }>
  if (rows.some((row) => row.name === 'sort_order')) return
  await instance.execute('ALTER TABLE connections ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0')
}

async function migrateFolderColorTag(instance: AppDb): Promise<void> {
  const rows = (await instance.select('PRAGMA table_info(connection_folders)')) as Array<{
    name: string
  }>
  if (rows.some((row) => row.name === 'color_tag')) return
  await instance.execute('ALTER TABLE connection_folders ADD COLUMN color_tag TEXT')
}

async function migrateQueryHistorySortOrder(instance: AppDb): Promise<void> {
  const rows = (await instance.select('PRAGMA table_info(query_history)')) as Array<{
    name: string
  }>
  if (rows.some((row) => row.name === 'sort_order')) return
  await instance.execute(
    'ALTER TABLE query_history ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0'
  )
}

export async function loadConnections(): Promise<Connection[]> {
  const instance = await getMetadataDb()
  const rows = (await instance.select(
    'SELECT * FROM connections ORDER BY sort_order, name'
  )) as ConnectionRow[]
  return rows.map(mapRowToConnection)
}

function mapRowToConnection(row: ConnectionRow): Connection {
  let sshTunnel = null
  if (row.ssh_tunnel_json) {
    try {
      sshTunnel = JSON.parse(row.ssh_tunnel_json)
    } catch {
      sshTunnel = null
    }
  }
  return {
    id: row.id,
    name: row.name,
    dbType: row.db_type,
    host: row.host ?? undefined,
    port: row.port ?? undefined,
    username: row.username ?? undefined,
    database: row.database_name ?? undefined,
    filePath: row.file_path ?? undefined,
    uri: row.uri ?? undefined,
    sslMode: row.ssl_mode,
    sshTunnel,
    colorTag: row.color_tag ?? undefined,
    readOnly: row.read_only === 1,
    folderId: row.folder_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? undefined
  }
}

export async function insertConnection(conn: Connection): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute(
    `INSERT INTO connections
      (id, name, db_type, host, port, username, database_name, file_path, uri, ssl_mode, ssh_tunnel_json, color_tag, folder_id, sort_order, read_only, created_at, last_used_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      conn.id,
      conn.name,
      conn.dbType,
      conn.host ?? null,
      conn.port ?? null,
      conn.username ?? null,
      conn.database ?? null,
      conn.filePath ?? null,
      conn.uri ?? null,
      conn.sslMode,
      conn.sshTunnel ? JSON.stringify(conn.sshTunnel) : null,
      conn.colorTag ?? null,
      conn.folderId,
      conn.sortOrder,
      conn.readOnly ? 1 : 0,
      conn.createdAt,
      conn.lastUsedAt ?? null
    ]
  )
}

export async function updateConnection(conn: Connection): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute(
    `UPDATE connections SET
      name = $1, db_type = $2, host = $3, port = $4, username = $5,
      database_name = $6, file_path = $7, uri = $8, ssl_mode = $9,
      ssh_tunnel_json = $10, color_tag = $11, folder_id = $12, sort_order = $13, read_only = $14, last_used_at = $15
     WHERE id = $16`,
    [
      conn.name,
      conn.dbType,
      conn.host ?? null,
      conn.port ?? null,
      conn.username ?? null,
      conn.database ?? null,
      conn.filePath ?? null,
      conn.uri ?? null,
      conn.sslMode,
      conn.sshTunnel ? JSON.stringify(conn.sshTunnel) : null,
      conn.colorTag ?? null,
      conn.folderId,
      conn.sortOrder,
      conn.readOnly ? 1 : 0,
      conn.lastUsedAt ?? null,
      conn.id
    ]
  )
}

export async function deleteConnection(id: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('DELETE FROM connections WHERE id = $1', [id])
}

export async function touchConnection(id: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('UPDATE connections SET last_used_at = $1 WHERE id = $2', [
    new Date().toISOString(),
    id
  ])
}

export async function loadFolders(): Promise<FolderRow[]> {
  const instance = await getMetadataDb()
  return (await instance.select(
    'SELECT * FROM connection_folders ORDER BY sort_order, name'
  )) as FolderRow[]
}

export async function insertFolder(
  id: string,
  name: string,
  parentId: string | null,
  colorTag?: string
): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute(
    'INSERT INTO connection_folders (id, name, color_tag, parent_id, sort_order) VALUES ($1, $2, $3, $4, 0)',
    [id, name, colorTag ?? null, parentId]
  )
}

export async function updateFolder(id: string, name: string, colorTag?: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('UPDATE connection_folders SET name = $1, color_tag = $2 WHERE id = $3', [
    name,
    colorTag ?? null,
    id
  ])
}

export async function deleteFolder(id: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('DELETE FROM connection_folders WHERE id = $1', [id])
}

export async function setConnectionOrder(
  id: string,
  folderId: string | null,
  sortOrder: number
): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('UPDATE connections SET folder_id = $1, sort_order = $2 WHERE id = $3', [
    folderId,
    sortOrder,
    id
  ])
}

export async function setFolderOrder(id: string, sortOrder: number): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('UPDATE connection_folders SET sort_order = $1 WHERE id = $2', [
    sortOrder,
    id
  ])
}

export async function setHistoryOrder(
  entries: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  const instance = await getMetadataDb()
  for (const entry of entries) {
    await instance.execute('UPDATE query_history SET sort_order = $1 WHERE id = $2', [
      entry.sortOrder,
      entry.id
    ])
  }
}

function mapHistoryRow(row: QueryHistoryRow): QueryHistoryEntry {
  return {
    id: row.id,
    connectionId: row.connection_id,
    connectionName: row.connection_name,
    queryText: row.query_text,
    executedAt: row.executed_at,
    durationMs: row.duration_ms,
    rowCount: row.row_count,
    status: row.status,
    errorMessage: row.error_message
  }
}

export async function insertQueryHistory(entry: QueryHistoryEntry): Promise<void> {
  const instance = await getMetadataDb()
  const maxOrderRow = (await instance.select(
    'SELECT MAX(sort_order) as max_order FROM query_history'
  )) as Array<{ max_order: number | null }>
  const nextOrder = (maxOrderRow[0]?.max_order ?? -1) + 1
  await instance.execute(
    `INSERT INTO query_history
      (id, connection_id, query_text, executed_at, duration_ms, row_count, status, error_message, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.id,
      entry.connectionId,
      entry.queryText,
      entry.executedAt,
      entry.durationMs,
      entry.rowCount,
      entry.status,
      entry.errorMessage,
      nextOrder
    ]
  )
}

export async function loadQueryHistory(limit = 200): Promise<QueryHistoryEntry[]> {
  const instance = await getMetadataDb()
  const rows = (await instance.select(
    `SELECT q.*, c.name AS connection_name
     FROM query_history q
     LEFT JOIN connections c ON c.id = q.connection_id
     ORDER BY q.sort_order, q.executed_at DESC
     LIMIT $1`,
    [limit]
  )) as QueryHistoryRow[]
  return rows.map(mapHistoryRow)
}

export async function deleteQueryHistory(id: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('DELETE FROM query_history WHERE id = $1', [id])
}

export async function clearQueryHistory(): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('DELETE FROM query_history')
}

export interface SavedQueryEntry {
  id: string
  connectionId: string | null
  connectionName: string | null
  title: string
  queryText: string
  updatedAt: string
}

export async function loadSavedQueries(): Promise<SavedQueryEntry[]> {
  const instance = await getMetadataDb()
  return (await instance.select(
    `SELECT q.id, q.connection_id, c.name AS connection_name, q.title, q.query_text, q.updated_at
     FROM saved_queries q
     LEFT JOIN connections c ON c.id = q.connection_id
     ORDER BY q.updated_at DESC`
  )) as SavedQueryEntry[]
}

export async function insertSavedQuery(entry: SavedQueryEntry): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute(
    `INSERT INTO saved_queries (id, connection_id, title, query_text, tags, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [entry.id, entry.connectionId, entry.title, entry.queryText, null, entry.updatedAt]
  )
}

export async function updateSavedQuery(id: string, updatedAt: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('UPDATE saved_queries SET updated_at = $1 WHERE id = $2', [updatedAt, id])
}

export async function deleteSavedQuery(id: string): Promise<void> {
  const instance = await getMetadataDb()
  await instance.execute('DELETE FROM saved_queries WHERE id = $1', [id])
}

export type ErLayoutPositions = Record<string, { x: number; y: number }>

const ER_LAYOUT_SCHEMA_NAME = 'all'

export async function loadErLayout(connectionId: string): Promise<ErLayoutPositions | null> {
  const instance = await getMetadataDb()
  const rows = (await instance.select(
    'SELECT layout_json FROM er_diagram_layouts WHERE connection_id = $1 AND schema_name = $2 ORDER BY updated_at DESC LIMIT 1',
    [connectionId, ER_LAYOUT_SCHEMA_NAME]
  )) as Array<{ layout_json: string }>
  const row = rows[0]
  if (!row) return null
  try {
    const parsed: unknown = JSON.parse(row.layout_json)
    if (parsed && typeof parsed === 'object') return parsed as ErLayoutPositions
  } catch {
    return null
  }
  return null
}

export async function saveErLayout(
  connectionId: string,
  positions: ErLayoutPositions
): Promise<void> {
  const instance = await getMetadataDb()
  const layoutId = `${connectionId}:${ER_LAYOUT_SCHEMA_NAME}`
  const layoutJson = JSON.stringify(positions)
  const existing = (await instance.select(
    'SELECT id FROM er_diagram_layouts WHERE connection_id = $1 AND schema_name = $2 LIMIT 1',
    [connectionId, ER_LAYOUT_SCHEMA_NAME]
  )) as Array<{ id: string }>
  const updatedAt = new Date().toISOString()
  if (existing[0]) {
    await instance.execute(
      'UPDATE er_diagram_layouts SET layout_json = $1, updated_at = $2 WHERE connection_id = $3 AND schema_name = $4',
      [layoutJson, updatedAt, connectionId, ER_LAYOUT_SCHEMA_NAME]
    )
  } else {
    await instance.execute(
      'INSERT INTO er_diagram_layouts (id, connection_id, schema_name, layout_json, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [layoutId, connectionId, ER_LAYOUT_SCHEMA_NAME, layoutJson, updatedAt]
    )
  }
}
