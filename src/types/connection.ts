export type DbType = 'postgres' | 'mysql' | 'sqlite' | 'mongodb'

export type SslMode = 'disable' | 'require' | 'verify-full'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface SshTunnelConfig {
  host: string
  port: number
  username: string
  authMethod: 'password' | 'privateKey'
  password?: string
  privateKeyPath?: string
}

export interface Connection {
  id: string
  name: string
  dbType: DbType
  host?: string
  port?: number
  username?: string
  database?: string
  filePath?: string
  uri?: string
  sslMode: SslMode
  sshTunnel?: SshTunnelConfig | null
  colorTag?: string
  readOnly: boolean
  folderId: string | null
  sortOrder: number
  createdAt: string
  lastUsedAt?: string
}

export interface ConnectionFolder {
  id: string
  name: string
  colorTag?: string
  parentId: string | null
  sortOrder: number
}

export interface DetectedServer {
  dbType: DbType
  host: string
  port: number
}

export interface ConnectionInput {
  name: string
  dbType: DbType
  host: string
  port: number
  username: string
  password: string
  database: string
  filePath: string
  uri: string
  sslMode: SslMode
  colorTag?: string
  readOnly: boolean
  folderId: string | null
}

export interface ConnectionRow {
  id: string
  name: string
  db_type: DbType
  host: string | null
  port: number | null
  username: string | null
  database_name: string | null
  file_path: string | null
  uri: string | null
  ssl_mode: SslMode
  ssh_tunnel_json: string | null
  color_tag: string | null
  folder_id: string | null
  sort_order: number
  read_only: number
  created_at: string
  last_used_at: string | null
}

export interface FolderRow {
  id: string
  name: string
  color_tag: string | null
  parent_id: string | null
  sort_order: number
}
