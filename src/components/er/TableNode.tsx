import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { cn } from '../../lib/utils'
import type { ErNodeData } from '../../lib/er-layout'
import type { ReactElement } from 'react'

export function TableNode({ data }: NodeProps<Node<ErNodeData>>): ReactElement {
  return (
    <div className="w-48 overflow-hidden rounded-lg border border-app-edge bg-app-bg shadow-sm">
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="border-b border-app-edge bg-app-bg-muted px-2 py-1 text-[11px] font-semibold text-app-fg">
        <span className="block truncate">{data.label}</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {data.columns.map((column) => (
          <div
            key={column.name}
            className="flex items-center gap-1.5 border-b border-app-edge/50 px-2 py-0.5 text-[10px] last:border-b-0"
          >
            <span
              className={cn(
                'w-4 shrink-0 text-[8px] font-bold tracking-wide',
                column.isPrimaryKey
                  ? 'text-app-warning'
                  : column.isForeignKey
                    ? 'text-app-accent'
                    : 'text-app-fg-soft'
              )}
            >
              {column.isPrimaryKey ? 'PK' : column.isForeignKey ? 'FK' : ''}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-app-fg">{column.name}</span>
            <span className="shrink-0 truncate text-app-fg-soft">{column.dataType}</span>
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  )
}
