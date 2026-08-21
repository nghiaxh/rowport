import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  getCachedForeignKeys,
  getCachedSqlSchema,
  type ForeignKey,
  type SchemaTable
} from '../../lib/schema'
import { loadErLayout, saveErLayout, type ErLayoutPositions } from '../../lib/metadata'
import { buildErGraph, type ErNodeData } from '../../lib/er-layout'
import { TableNode } from './TableNode'
import type { DbType } from '../../types/connection'
import { useT } from '../../lib/i18n'

const nodeTypes: NodeTypes = { erTable: TableNode }

interface ErDiagramProps {
  connectionId: string
  dbType: DbType
}

export function ErDiagram({ connectionId, dbType }: ErDiagramProps): ReactElement {
  const t = useT()
  const [nodes, setNodes] = useState<Node<ErNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const sourceRef = useRef<{ tables: SchemaTable[]; foreignKeys: ForeignKey[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [tables, foreignKeys, savedLayout] = await Promise.all([
          getCachedSqlSchema(dbType, connectionId),
          getCachedForeignKeys(dbType, connectionId),
          loadErLayout(connectionId)
        ])
        if (cancelled) return
        sourceRef.current = { tables, foreignKeys }
        const graph = buildErGraph(tables, foreignKeys, savedLayout ?? undefined)
        setNodes(graph.nodes)
        setEdges(graph.edges)
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connectionId, dbType])

  const onNodesChange = useCallback((changes: NodeChange<Node<ErNodeData>>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const persistPositions = useCallback(() => {
    setNodes((current) => {
      const positions: ErLayoutPositions = {}
      for (const node of current) positions[node.id] = node.position
      void saveErLayout(connectionId, positions).catch(() => {})
      return current
    })
  }, [connectionId])

  const onNodeDragStop = useCallback(() => persistPositions(), [persistPositions])

  const relayout = useCallback(() => {
    const source = sourceRef.current
    if (!source) return
    const graph = buildErGraph(source.tables, source.foreignKeys)
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-fg-muted">
        {t('er.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-warning">
        {error}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        edgesFocusable={false}
        nodesConnectable={false}
        minZoom={0.2}
        maxZoom={2}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <button
        type="button"
        onClick={relayout}
        className="absolute right-4 top-4 z-10 rounded-md border border-app-edge bg-app-bg px-2.5 py-1 text-xs text-app-fg transition-colors hover:bg-app-bg-muted"
      >
        {t('er.autoLayout')}
      </button>
    </div>
  )
}
