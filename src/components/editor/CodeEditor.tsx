import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import ReactCodeMirror from '@uiw/react-codemirror'
import type { Extension } from '@codemirror/state'
import type { EditorView, ViewUpdate } from '@codemirror/view'
import { rowportTheme, rowportHighlight, buildEditorExtensions } from '../../lib/codemirror'
import { registerActiveEditor, clearActiveEditor } from '../../lib/editor-commands'
import { useSettingsStore } from '../../stores/useSettingsStore'

interface CodeEditorProps {
  value: string
  height?: number | string
  extensions?: Extension[]
  onChange?: (value: string, viewUpdate: ViewUpdate) => void
  onMount?: (view: EditorView) => void
}

export function CodeEditor({
  value,
  height = '100%',
  extensions,
  onChange,
  onMount
}: CodeEditorProps): ReactElement {
  const editorRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onMountRef = useRef(onMount)

  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const editorIndentWidth = useSettingsStore((s) => s.editorIndentWidth)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const editorLineHeight = useSettingsStore((s) => s.editorLineHeight)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    onMountRef.current = onMount
  }, [onMount])

  useEffect(
    () => () => {
      if (editorRef.current) clearActiveEditor(editorRef.current)
    },
    []
  )

  const settingsExtensions = useMemo(
    () =>
      buildEditorExtensions({
        fontSize: editorFontSize,
        lineHeight: editorLineHeight,
        wordWrap: editorWordWrap,
        indentWidth: editorIndentWidth
      }),
    [editorFontSize, editorLineHeight, editorWordWrap, editorIndentWidth]
  )

  return (
    <ReactCodeMirror
      height={typeof height === 'number' ? `${height}px` : height}
      value={value}
      theme={rowportTheme}
      basicSetup={{ syntaxHighlighting: false }}
      extensions={[rowportHighlight, ...settingsExtensions, ...(extensions ?? [])]}
      onCreateEditor={(view) => {
        editorRef.current = view
        registerActiveEditor(view)
        view.dom.addEventListener('focus', () => registerActiveEditor(view))
        onMountRef.current?.(view)
      }}
      onChange={(next, update) => onChangeRef.current?.(next, update)}
    />
  )
}
