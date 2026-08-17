export interface TableColumn {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  defaultValue: string | null
}

export interface TableInfo {
  schema: string
  name: string
  type: 'table' | 'view' | 'function'
  columns?: TableColumn[]
}

export interface DbNode {
  key: string
  label: string
  kind: 'database' | 'schema' | 'table' | 'view' | 'function' | 'collection'
  name: string
  children?: DbNode[]
}
