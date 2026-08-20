export type AssistantProviderType = 'ollama' | 'openai'

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AssistantChatRequest {
  provider: AssistantProviderType
  model: string
  messages: AssistantMessage[]
  ollamaUrl?: string
  openaiApiKey?: string
}

export interface AssistantChatResult {
  content: string
}

export interface AssistantListModelsRequest {
  provider: AssistantProviderType
  ollamaUrl?: string
  openaiApiKey?: string
}

export interface AssistantTestConnectionRequest {
  provider: AssistantProviderType
  ollamaUrl?: string
  openaiApiKey?: string
}
