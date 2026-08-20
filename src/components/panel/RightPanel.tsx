import { useState, type ReactElement } from 'react'
import { Database, List, Robot } from '@phosphor-icons/react'
import { SchemaPanel } from './SchemaPanel'
import { HistoryPanel } from './HistoryPanel'
import { AssistantPanel } from './AssistantPanel'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/useSettingsStore'

const MIN_WIDTH = 240
const MAX_WIDTH = 480

type PanelTab = 'schema' | 'history' | 'assistant'

export function RightPanel(): ReactElement {
  const t = useT()
  const [activeTab, setActiveTab] = useState<PanelTab>('schema')
  const rightPanelWidth = useSettingsStore((s) => s.rightPanelWidth)
  const setRightPanelWidth = useSettingsStore((s) => s.setRightPanelWidth)

  function handleResizeStart(event: React.PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = rightPanelWidth
    const onMove = (moveEvent: PointerEvent): void => {
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth - (moveEvent.clientX - startX))
      )
      setRightPanelWidth(next)
    }
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const tabs: Array<{ value: PanelTab; label: string; icon: React.ReactNode }> = [
    { value: 'schema', label: t('panel.schema'), icon: <Database size={14} /> },
    { value: 'history', label: t('panel.history'), icon: <List size={14} /> },
    { value: 'assistant', label: t('panel.assistant'), icon: <Robot size={14} /> }
  ]

  return (
    <aside
      className="relative flex shrink-0 flex-col border-l border-app-edge bg-app-bg-muted"
      style={{ width: rightPanelWidth }}
    >
      <div
        onPointerDown={handleResizeStart}
        onDoubleClick={() => setRightPanelWidth(288)}
        className="absolute top-0 bottom-0 z-10 w-px cursor-col-resize hover:bg-app-fg-soft"
      />
      <div className="flex shrink-0 border-b border-app-edge">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors',
              activeTab === tab.value
                ? 'border-b border-app-accent text-app-fg'
                : 'text-app-fg-muted hover:text-app-fg'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {activeTab === 'schema' && <SchemaPanel />}
        {activeTab === 'history' && <HistoryPanel />}
        {activeTab === 'assistant' && <AssistantPanel />}
      </div>
    </aside>
  )
}
