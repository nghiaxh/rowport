import { join } from 'node:path'
import { app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'

let cache: Record<string, string> | null = null

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

async function load(): Promise<Record<string, string>> {
  if (cache) return cache
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    cache = parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    cache = {}
  }
  return cache
}

async function persist(): Promise<void> {
  await writeFile(settingsPath(), JSON.stringify(cache ?? {}), 'utf8')
}

export async function getSetting(key: string): Promise<string | null> {
  const settings = await load()
  return settings[key] ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const settings = await load()
  settings[key] = value
  await persist()
}

export async function deleteSetting(key: string): Promise<void> {
  const settings = await load()
  delete settings[key]
  await persist()
}
