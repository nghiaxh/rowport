import type { AssistantMessage } from '../../shared/assistant-api'

export interface AssistantProvider {
  chat(messages: AssistantMessage[], model: string): Promise<string>
  listModels(): Promise<string[]>
  testConnection(): Promise<boolean>
}

export class OllamaProvider implements AssistantProvider {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  async chat(messages: AssistantMessage[], model: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama error ${response.status}: ${text}`)
    }
    const data = (await response.json()) as { message?: { content?: string } }
    return data.message?.content ?? ''
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`)
    if (!response.ok) throw new Error(`Ollama error ${response.status}`)
    const data = (await response.json()) as { models?: Array<{ name: string }> }
    return data.models?.map((m) => m.name) ?? []
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export class OpenAiProvider implements AssistantProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(messages: AssistantMessage[], model: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ model, messages, stream: false })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenAI error ${response.status}: ${text}`)
    }
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content ?? ''
  }

  async listModels(): Promise<string[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
    if (!response.ok) throw new Error(`OpenAI error ${response.status}`)
    const data = (await response.json()) as {
      data?: Array<{ id: string }>
    }
    return (
      data.data
        ?.map((m) => m.id)
        .filter((id) => id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3'))
        .sort() ?? []
    )
  }

  async testConnection(): Promise<boolean> {
    try {
      return await this.listModels().then(() => true)
    } catch {
      return false
    }
  }
}
