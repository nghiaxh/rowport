import dagre from '@dagrejs/dagre'
import type { Edge, Node, XYPosition } from '@xyflow/react'
import type { ForeignKey, SchemaTable } from './schema'

export interface ErColumn {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
}

export interface ErNodeData extends Record<string, unknown> {
  label: string
  columns: ErColumn[]
}

export const ER_NODE_WIDTH = 200
export const ER_ROW_HEIGHT = 20
export const ER_HEADER_HEIGHT = 30

export function tableKey(schema: string, name: string): string {
  return `${schema}.${name}`
}

export function estimateNodeHeight(columns: ErColumn[]): number {
  return ER_HEADER_HEIGHT + Math.max(columns.length, 1) * ER_ROW_HEIGHT
}

export interface ErGraph {
  nodes: Node<ErNodeData>[]
  edges: Edge[]
}

export function buildErGraph(
  tables: SchemaTable[],
  foreignKeys: ForeignKey[],
  savedLayout?: Record<string, XYPosition>
): ErGraph {
  const tablesWithColumns = tables.filter((table) => table.columns.length > 0)
  const byKey = new Map<string, SchemaTable>()
  for (const table of tablesWithColumns) {
    byKey.set(tableKey(table.schema, table.name), table)
  }

  const fkColumns = new Map<string, Set<string>>()
  for (const fk of foreignKeys) {
    const key = tableKey(fk.schema, fk.table)
    const columns = fkColumns.get(key) ?? new Set<string>()
    columns.add(fk.column)
    fkColumns.set(key, columns)
  }

  const nodes: Node<ErNodeData>[] = tablesWithColumns.map((table) => {
    const key = tableKey(table.schema, table.name)
    const fkSet = fkColumns.get(key)
    return {
      id: key,
      type: 'erTable',
      data: {
        label: table.schema !== 'main' ? `${table.schema}.${table.name}` : table.name,
        columns: table.columns.map((column) => ({
          name: column.name,
          dataType: column.dataType,
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: fkSet?.has(column.name) ?? false
        }))
      },
      position: savedLayout?.[key] ?? { x: 0, y: 0 }
    }
  })

  const edges: Edge[] = []
  const seen = new Set<string>()
  for (const fk of foreignKeys) {
    const sourceKey = tableKey(fk.schema, fk.table)
    const targetKey = tableKey(fk.refSchema, fk.refTable)
    if (!byKey.has(sourceKey) || !byKey.has(targetKey)) continue
    const edgeId = `${sourceKey}->${targetKey}`
    if (seen.has(edgeId)) continue
    seen.add(edgeId)
    edges.push({
      id: edgeId,
      source: sourceKey,
      target: targetKey,
      label: fk.column
    })
  }

  if (!savedLayout) {
    applyDagreLayout(nodes, edges)
  }
  return { nodes, edges }
}

function applyDagreLayout(nodes: Node<ErNodeData>[], edges: Edge[]): void {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 })

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: ER_NODE_WIDTH,
      height: estimateNodeHeight(node.data.columns)
    })
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  for (const node of nodes) {
    const positioned = graph.node(node.id)
    node.position = {
      x: positioned.x - ER_NODE_WIDTH / 2,
      y: positioned.y - estimateNodeHeight(node.data.columns) / 2
    }
  }
}
