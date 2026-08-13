import type { EditorFont, UiFont } from '../stores/useSettingsStore'

export const UI_FONT_STACKS: Record<UiFont, string> = {
  inter:
    '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  system:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  segoe: '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif'
}

export const EDITOR_FONT_STACKS: Record<EditorFont, string> = {
  mono: 'ui-monospace, "Cascadia Code", "JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
  cascadia: '"Cascadia Code", "Cascadia Mono", ui-monospace, Consolas, monospace',
  jetbrains: '"JetBrains Mono Variable", ui-monospace, "Fira Code", Consolas, monospace',
  fira: '"Fira Code Variable", "Fira Mono", ui-monospace, Consolas, monospace',
  consolas: 'Consolas, "Courier New", monospace'
}
