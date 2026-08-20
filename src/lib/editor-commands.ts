import { undo, redo, deleteCharForward, selectAll } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'

let activeEditor: EditorView | null = null

export function registerActiveEditor(ed: EditorView | null): void {
  activeEditor = ed
}

export function clearActiveEditor(ed: EditorView): void {
  if (activeEditor === ed) activeEditor = null
}

function withEditor(action: (ed: EditorView) => void): void {
  const ed = activeEditor
  if (!ed) return
  ed.focus()
  action(ed)
}

export function undoActive(): void {
  withEditor((ed) => undo(ed))
}

export function redoActive(): void {
  withEditor((ed) => redo(ed))
}

export function cutActive(): void {
  withEditor(() => document.execCommand('cut'))
}

export function copyActive(): void {
  withEditor(() => document.execCommand('copy'))
}

export function pasteActive(): void {
  withEditor(() => document.execCommand('paste'))
}

export function deleteActive(): void {
  withEditor((ed) => deleteCharForward(ed))
}

export function selectAllActive(): void {
  withEditor((ed) => selectAll(ed))
}
