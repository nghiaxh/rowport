import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/rowport-api'
import type { AssistantMessage } from '../../shared/assistant-api'
import { OllamaProvider, OpenAiProvider, type AssistantProvider } from '../assistant/providers'

function getProvider(
  providerType: string,
  options?: { ollamaUrl?: string; openaiApiKey?: string }
): AssistantProvider {
  if (providerType === 'ollama') {
    return new OllamaProvider(options?.ollamaUrl ?? 'http://localhost:11434')
  }
  if (providerType === 'openai') {
    if (!options?.openaiApiKey) throw new Error('OpenAI API key is required')
    return new OpenAiProvider(options.openaiApiKey)
  }
  throw new Error(`Unknown assistant provider: ${providerType}`)
}

export function registerAssistantHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.assistantChat,
    async (_event, provider: string, model: string, messages: AssistantMessage[], options?) => {
      const p = getProvider(provider, options)
      const content = await p.chat(messages, model)
      return { content }
    }
  )

  ipcMain.handle(IPC_CHANNELS.assistantListModels, async (_event, provider: string, options?) => {
    const p = getProvider(provider, options)
    return p.listModels()
  })

  ipcMain.handle(
    IPC_CHANNELS.assistantTestConnection,
    async (_event, provider: string, options?) => {
      const p = getProvider(provider, options)
      return p.testConnection()
    }
  )
}
