import { create } from 'zustand'
import type { AssistantProviderType, AssistantMessage } from '../shared/assistant-api'

interface AssistantState {
  provider: AssistantProviderType
  model: string
  ollamaUrl: string
  openaiApiKey: string
  messages: AssistantMessage[]
  loading: boolean
  error: string | null
  models: string[]
  modelsLoading: boolean
  setProvider: (provider: AssistantProviderType) => void
  setModel: (model: string) => void
  setOllamaUrl: (url: string) => void
  setOpenaiApiKey: (key: string) => void
  sendMessage: (content: string, schemaContext?: string) => Promise<void>
  loadModels: () => Promise<void>
  clearMessages: () => void
}

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  provider: 'ollama',
  model: 'llama3.2',
  ollamaUrl: 'http://localhost:11434',
  openaiApiKey: '',
  messages: [],
  loading: false,
  error: null,
  models: [],
  modelsLoading: false,

  setProvider: (provider) => set({ provider, model: '', models: [] }),
  setModel: (model) => set({ model }),
  setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
  setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),

  sendMessage: async (content, schemaContext) => {
    const { provider, model, ollamaUrl, openaiApiKey, messages } = get()
    if (!model) {
      set({ error: 'Select a model first' })
      return
    }

    const userMessage: AssistantMessage = { role: 'user', content }
    const allMessages: AssistantMessage[] = []

    if (schemaContext) {
      allMessages.push({ role: 'system', content: schemaContext })
    }
    allMessages.push(...messages, userMessage)

    set({ messages: [...messages, userMessage], loading: true, error: null })

    try {
      const result = await window.rowport.assistant.chat(provider, model, allMessages, {
        ollamaUrl,
        openaiApiKey: openaiApiKey || undefined
      })
      set((state) => ({
        messages: [...state.messages, { role: 'assistant', content: result.content }],
        loading: false
      }))
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  },

  loadModels: async () => {
    const { provider, ollamaUrl, openaiApiKey } = get()
    set({ modelsLoading: true })
    try {
      const models = await window.rowport.assistant.listModels(provider, {
        ollamaUrl,
        openaiApiKey
      })
      set({ models, modelsLoading: false })
    } catch {
      set({ models: [], modelsLoading: false })
    }
  },

  clearMessages: () => set({ messages: [], error: null })
}))
