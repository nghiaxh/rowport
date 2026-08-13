export function newId(): string {
  return crypto.randomUUID()
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString()
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function quoteIdent(name: string): string {
  return name
    .split('.')
    .map((part) => `"${part.replaceAll('"', '""')}"`)
    .join('.')
}
