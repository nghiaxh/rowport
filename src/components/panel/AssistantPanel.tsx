import { useEffect, useRef, useState, type ReactElement } from 'react'
import {
  PaperPlaneRight,
  Trash,
  SpinnerGap,
  WarningCircle,
  Gear,
  Robot
} from '@phosphor-icons/react'
import { useAssistantStore } from '../../stores/useAssistantStore'
import { useConnectionStore } from '../../stores/useConnectionStore'
import { useTabStore } from '../../stores/useTabStore'
import { cn } from '../../lib/utils'
import { useT } from '../../lib/i18n'

function buildSchemaContext(connectionId: string): string | null {
  const connections = useConnectionStore.getState().connections
  const connection = connections.find((c) => c.id === connectionId)
  if (!connection || connection.dbType === 'mongodb') return null
  return `You are helping with a ${connection.dbType} database named "${connection.name}". Current database: ${connection.database ?? 'default'}. Generate SQL that works for ${connection.dbType}.`
}

export function AssistantPanel(): ReactElement {
  const t = useT()
  const messages = useAssistantStore((s) => s.messages)
  const loading = useAssistantStore((s) => s.loading)
  const error = useAssistantStore((s) => s.error)
  const sendMessage = useAssistantStore((s) => s.sendMessage)
  const clearMessages = useAssistantStore((s) => s.clearMessages)
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)
  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(): void {
    const text = input.trim()
    if (!text || loading) return
    const schemaContext = activeTab ? buildSchemaContext(activeTab.connectionId) : undefined
    void sendMessage(text, schemaContext ?? undefined)
    setInput('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1.5 border-b border-app-edge px-3 py-2">
        <Robot size={13} className="text-app-fg-muted" />
        <span className="flex-1 truncate text-xs font-semibold text-app-fg">
          {t('panel.assistant')}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex size-6 items-center justify-center rounded transition-colors hover:bg-app-bg-soft hover:text-app-fg',
              showSettings ? 'text-app-fg' : 'text-app-fg-soft'
            )}
          >
            <Gear size={13} />
          </button>
          <button
            type="button"
            onClick={clearMessages}
            className="flex size-6 items-center justify-center rounded text-app-fg-soft transition-colors hover:bg-app-bg-soft hover:text-app-fg"
            title={t('assistant.clearChat')}
          >
            <Trash size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {showSettings && <AssistantSettings onClose={() => setShowSettings(false)} />}

        {messages.length === 0 && !showSettings ? (
          <p className="px-2 py-4 text-xs leading-relaxed text-app-fg-soft">
            {t('assistant.welcome')}
          </p>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs',
                  msg.role === 'user'
                    ? 'bg-app-accent/20 text-app-fg ml-6'
                    : 'bg-app-bg-muted text-app-fg mr-6'
                )}
              >
                <pre className="whitespace-pre-wrap break-words font-sans">{msg.content}</pre>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-app-fg-muted">
                <SpinnerGap size={14} className="animate-spin" />
                {t('assistant.thinking')}
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 px-2 py-1.5 text-xs text-app-danger">
                <WarningCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-app-edge p-2">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('assistant.placeholder')}
            rows={2}
            className="flex-1 resize-none rounded-md border border-app-edge bg-app-bg px-3 py-2 text-xs text-app-fg outline-none focus:border-app-fg-muted"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex w-8 h-8 shrink-0 items-center justify-center rounded-md bg-app-accent text-app-accent-fg transition-colors hover:opacity-90 disabled:opacity-40"
          >
            <PaperPlaneRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AssistantSettings({ onClose }: { onClose: () => void }): ReactElement {
  const t = useT()
  const provider = useAssistantStore((s) => s.provider)
  const model = useAssistantStore((s) => s.model)
  const ollamaUrl = useAssistantStore((s) => s.ollamaUrl)
  const openaiApiKey = useAssistantStore((s) => s.openaiApiKey)
  const models = useAssistantStore((s) => s.models)
  const modelsLoading = useAssistantStore((s) => s.modelsLoading)
  const setProvider = useAssistantStore((s) => s.setProvider)
  const setModel = useAssistantStore((s) => s.setModel)
  const setOllamaUrl = useAssistantStore((s) => s.setOllamaUrl)
  const setOpenaiApiKey = useAssistantStore((s) => s.setOpenaiApiKey)
  const loadModels = useAssistantStore((s) => s.loadModels)

  useEffect(() => {
    void loadModels()
  }, [provider, ollamaUrl, openaiApiKey, loadModels])

  return (
    <div className="space-y-3 border-b border-app-edge px-2 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-fg">{t('assistant.settings')}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] text-app-fg-muted hover:text-app-fg"
        >
          {t('common.close')}
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="assistant-provider" className="block text-[11px] text-app-fg-muted">
          {t('assistant.provider')}
        </label>
        <select
          id="assistant-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'ollama' | 'openai')}
          className="w-full rounded border border-app-edge bg-app-bg px-2 py-1.5 text-xs outline-none"
        >
          <option value="ollama">Ollama</option>
          <option value="openai">OpenAI</option>
        </select>
      </div>

      {provider === 'ollama' && (
        <div className="space-y-2">
          <label htmlFor="assistant-ollama-url" className="block text-[11px] text-app-fg-muted">
            {t('assistant.ollamaUrl')}
          </label>
          <input
            id="assistant-ollama-url"
            value={ollamaUrl}
            onChange={(e) => setOllamaUrl(e.target.value)}
            className="w-full rounded border border-app-edge bg-app-bg px-2 py-1.5 text-xs outline-none"
          />
        </div>
      )}

      {provider === 'openai' && (
        <div className="space-y-2">
          <label htmlFor="assistant-api-key" className="block text-[11px] text-app-fg-muted">
            {t('assistant.apiKey')}
          </label>
          <input
            id="assistant-api-key"
            type="password"
            value={openaiApiKey}
            onChange={(e) => setOpenaiApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded border border-app-edge bg-app-bg px-2 py-1.5 text-xs outline-none"
          />
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="assistant-model" className="block text-[11px] text-app-fg-muted">
          {t('assistant.model')}
        </label>
        <select
          id="assistant-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded border border-app-edge bg-app-bg px-2 py-1.5 text-xs outline-none"
        >
          <option value="">
            {modelsLoading ? t('common.loading') : t('assistant.selectModel')}
          </option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
