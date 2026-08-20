import { EditorView } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { keymap } from '@codemirror/view'
import { indentMore, indentLess } from '@codemirror/commands'
import { acceptCompletion } from '@codemirror/autocomplete'
import {
  sql,
  PostgreSQL,
  MySQL,
  SQLite,
  StandardSQL,
  type SQLNamespace
} from '@codemirror/lang-sql'
import type { Completion } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import type { SchemaTable } from './schema'
import type { DbType } from '../types/connection'

export interface EditorSettings {
  fontSize: number
  lineHeight: number
  wordWrap: boolean
  indentWidth: number
}

const dim = (amount: string): string =>
  `color-mix(in srgb, var(--text-primary) ${amount}, transparent)`

export const rowportTheme: Extension = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 'var(--editor-font-size)'
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': {
    fontFamily: 'var(--font-mono)',
    padding: '8px 0',
    caretColor: 'var(--accent)'
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    overflow: 'auto'
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: dim('35%'),
    border: 'none',
    borderRight: '1px solid var(--border-default)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 5%, transparent)'
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)' },
  '.cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)'
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)'
  },
  '.cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    outline: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)'
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in srgb, var(--warning) 30%, transparent)'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--surface-secondary)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)'
  },
  '.cm-completionIcon': { color: 'var(--text-tertiary)' },
  '.cm-completionDetail': { color: 'var(--text-tertiary)' }
})

export const rowportHighlight: Extension = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.comment, color: dim('48%'), fontStyle: 'italic' },
    { tag: tags.keyword, color: 'var(--text-primary)', fontWeight: '600' },
    { tag: [tags.string, tags.special(tags.string)], color: dim('68%') },
    { tag: tags.number, color: dim('72%') },
    { tag: tags.bool, color: dim('72%') },
    { tag: tags.null, color: dim('60%'), fontStyle: 'italic' },
    { tag: tags.operator, color: dim('62%') },
    { tag: tags.punctuation, color: dim('52%') },
    { tag: [tags.typeName, tags.className], color: dim('78%') },
    { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: dim('82%') },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
      color: dim('76%')
    },
    { tag: [tags.constant(tags.name), tags.standard(tags.name)], color: dim('75%') }
  ])
)

export function buildEditorExtensions(settings: EditorSettings): Extension[] {
  const extensions: Extension[] = [
    EditorView.theme({
      '.cm-content': { lineHeight: String(settings.lineHeight) }
    }),
    EditorState.tabSize.of(settings.indentWidth),
    indentUnit.of(' '.repeat(settings.indentWidth)),
    keymap.of([
      {
        key: 'Tab',
        run: (view) => acceptCompletion(view) || indentMore(view),
        shift: indentLess
      }
    ])
  ]
  if (settings.wordWrap) extensions.push(EditorView.lineWrapping)
  return extensions
}

export function sqlDialect(dbType: DbType): typeof StandardSQL {
  if (dbType === 'postgres') return PostgreSQL
  if (dbType === 'mysql') return MySQL
  if (dbType === 'sqlite') return SQLite
  return StandardSQL
}

function dominantSchema(tables: SchemaTable[]): string {
  const counts = new Map<string, number>()
  for (const table of tables) {
    counts.set(table.schema, (counts.get(table.schema) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [schema, count] of counts) {
    if (count > bestCount) {
      best = schema
      bestCount = count
    }
  }
  return best
}

function toSqlSchema(tables: SchemaTable[]): SQLNamespace {
  const root: SQLNamespace = {}
  const levels = new Map<string, Record<string, Completion[]>>()
  for (const table of tables) {
    const columns: Completion[] = table.columns.map((column) => ({
      label: column.name,
      type: 'type',
      detail: column.dataType
    }))
    const schemaLevel = levels.get(table.schema)
    if (schemaLevel) {
      schemaLevel[table.name] = columns
    } else {
      levels.set(table.schema, { [table.name]: columns })
    }
  }
  for (const [schemaName, tablesLevel] of levels) {
    root[schemaName] = tablesLevel
  }
  return root
}

export function sqlExtension(dbType: DbType, tables: SchemaTable[]): Extension {
  return sql({
    dialect: sqlDialect(dbType),
    schema: toSqlSchema(tables),
    defaultSchema: dominantSchema(tables) || undefined,
    upperCaseKeywords: true
  })
}
