const DESTRUCTIVE_PATTERN = /\b(DELETE|UPDATE|DROP|TRUNCATE|ALTER)\b/i

export function isDestructiveQuery(sql: string): boolean {
  return DESTRUCTIVE_PATTERN.test(sql)
}

export function isSelectQuery(sql: string): boolean {
  const firstKeyword = sql
    .replace(/^\s*(--.*\n|\/\*[\s\S]*?\*\/)*\s*/i, '')
    .split(/\s+/)[0]
    ?.toLowerCase()
  return (
    firstKeyword === 'select' ||
    firstKeyword === 'with' ||
    firstKeyword === 'show' ||
    firstKeyword === 'describe' ||
    firstKeyword === 'desc' ||
    firstKeyword === 'explain' ||
    firstKeyword === 'pragma' ||
    firstKeyword === 'values' ||
    firstKeyword === 'table'
  )
}

export function isDdlQuery(sql: string): boolean {
  return /\b(CREATE|DROP|ALTER|TRUNCATE|RENAME)\b/i.test(sql)
}

export function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      current += char
      if (char === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      current += char
      if (char === '*' && next === '/') {
        current += '/'
        i++
        inBlockComment = false
      }
      continue
    }
    if (inSingle) {
      current += char
      if (char === "'") inSingle = false
      continue
    }
    if (inDouble) {
      current += char
      if (char === '"') inDouble = false
      continue
    }
    if (inBacktick) {
      current += char
      if (char === '`') inBacktick = false
      continue
    }

    if (char === '-' && next === '-') {
      inLineComment = true
      current += char
      continue
    }
    if (char === '/' && next === '*') {
      inBlockComment = true
      current += char
      continue
    }
    if (char === "'") {
      inSingle = true
      current += char
      continue
    }
    if (char === '"') {
      inDouble = true
      current += char
      continue
    }
    if (char === '`') {
      inBacktick = true
      current += char
      continue
    }
    if (char === ';') {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
      continue
    }
    current += char
  }

  const statement = current.trim()
  if (statement) statements.push(statement)
  return statements
}

export function columnsFromRows(rows: Record<string, unknown>[]): string[] {
  const columns: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key)
    }
  }
  return columns
}

export function withRowLimit<T>(rows: T[], max: number): T[] {
  return rows.length > max ? rows.slice(0, max) : rows
}

export function paginateSelect(sql: string, limit: number, offset: number): string {
  return `SELECT * FROM (\n${sql}\n) AS _rowport LIMIT ${limit} OFFSET ${offset}`
}

export function countSelect(sql: string): string {
  return `SELECT COUNT(*) AS _count FROM (\n${sql}\n) AS _rowport`
}

export function parseJsonDocument(text: string, what: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    throw new Error(`${what} is not valid JSON.`)
  }
}
