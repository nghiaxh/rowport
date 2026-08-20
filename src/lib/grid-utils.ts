export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function isObjectValue(value: unknown): boolean {
  return value !== null && typeof value === 'object'
}

export function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function buildCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.map(escapeCsv).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escapeCsv(formatCell(row[column]))).join(',')
  )
  return [header, ...body].join('\n')
}

export function buildTsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.join('\t')
  const body = rows.map((row) =>
    columns.map((column) => formatCell(row[column]).replaceAll('\t', ' ')).join('\t')
  )
  return [header, ...body].join('\n')
}

export function compareCells(a: unknown, b: unknown): number {
  if (a === b || (a === null && b === null)) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

export function isNumericType(dataType: string): boolean {
  return /int|float|decimal|numeric|real|double|serial|money/i.test(dataType)
}

export type CellValidation = { ok: true; value: unknown } | { ok: false; error: string }

export function validateCellEdit(
  draft: string,
  dataType: string | undefined,
  isJsonValue: boolean
): CellValidation {
  const raw = draft.trim()
  if (!raw) return { ok: true, value: null }
  const type = dataType ?? ''
  if (isJsonValue || /json/i.test(type)) {
    try {
      return { ok: true, value: JSON.parse(raw) }
    } catch (error) {
      return {
        ok: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  if (isNumericType(type)) {
    const num = Number(raw)
    if (!Number.isFinite(num)) return { ok: false, error: 'Must be a valid number' }
    return { ok: true, value: num }
  }
  if (/bool/i.test(type)) {
    if (/^true$/i.test(raw)) return { ok: true, value: true }
    if (/^false$/i.test(raw)) return { ok: true, value: false }
    if (raw === '1') return { ok: true, value: true }
    if (raw === '0') return { ok: true, value: false }
    return { ok: false, error: 'Must be "true" or "false"' }
  }
  if (/date|timestamp|^time$/i.test(type)) {
    if (Number.isNaN(Date.parse(raw))) {
      return { ok: false, error: 'Must be a valid date or time' }
    }
  }
  return { ok: true, value: raw }
}

export function inferTable(sql: string): { schema?: string; name: string } | null {
  const match = sql.match(/^\s*SELECT\b[\s\S]*?\bFROM\s+("([^"]+)"|`([^`]+)`|([\w.]+))/i)
  if (!match) return null
  const raw = (match[2] ?? match[3] ?? match[4] ?? '').trim()
  if (!raw) return null
  const parts = raw.split('.')
  return {
    schema: parts.length > 1 ? parts[0] : undefined,
    name: parts[parts.length - 1] ?? raw
  }
}
