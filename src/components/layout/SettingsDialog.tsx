import { useState, type ReactElement, type ReactNode } from 'react'
import { Button, Modal } from '@heroui/react'
import { Code, Lightning, Palette, SquaresFour, Table } from '@phosphor-icons/react'
import { useThemeStore } from '../../stores/useThemeStore'
import type { ThemePreference } from '../../stores/useThemeStore'
import {
  useSettingsStore,
  type EditorFont,
  type EditorLineHeight,
  type GridDensity,
  type NullDisplay,
  type UiFont
} from '../../stores/useSettingsStore'
import { cn } from '../../lib/utils'
import { LOCALE_LABELS, type SupportedLocale, useT } from '../../lib/i18n'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

const UI_FONT_OPTIONS: Array<{ value: UiFont; label: string }> = [
  { value: 'inter', label: 'Inter' },
  { value: 'system', label: 'System UI' },
  { value: 'segoe', label: 'Segoe UI' }
]

const EDITOR_FONT_OPTIONS: Array<{ value: EditorFont; label: string }> = [
  { value: 'mono', label: 'Default' },
  { value: 'cascadia', label: 'Cascadia Code' },
  { value: 'jetbrains', label: 'JetBrains Mono' },
  { value: 'fira', label: 'Fira Code' },
  { value: 'consolas', label: 'Consolas' }
]

const FONT_SIZE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 11, label: '11' },
  { value: 12.5, label: '12.5' },
  { value: 14, label: '14' }
]

const LINE_HEIGHT_OPTIONS: Array<{ value: EditorLineHeight; label: string }> = [
  { value: 1.4, label: 'Compact' },
  { value: 1.6, label: 'Normal' },
  { value: 1.8, label: 'Relaxed' }
]

const DENSITY_OPTIONS: Array<{ value: GridDensity; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'comfortable', label: 'Comfortable' }
]

const NULL_DISPLAY_OPTIONS: Array<{ value: NullDisplay; label: string }> = [
  { value: 'NULL', label: 'NULL' },
  { value: 'null', label: 'null' },
  { value: 'empty', label: 'Empty' }
]

const LANGUAGE_OPTIONS: Array<{ value: SupportedLocale; label: string }> = (
  Object.keys(LOCALE_LABELS) as SupportedLocale[]
).map((value) => ({ value, label: LOCALE_LABELS[value] }))

const LIMIT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 250, label: '250' },
  { value: 500, label: '500' }
]

const INDENT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 2, label: '2' },
  { value: 4, label: '4' }
]

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'editor', label: 'Editor', icon: Code },
  { id: 'grid', label: 'Results grid', icon: Table },
  { id: 'queries', label: 'Queries', icon: Lightning },
  { id: 'layout', label: 'Layout', icon: SquaresFour }
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): ReactElement {
  const [activeTab, setActiveTab] = useState<TabId>('appearance')

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(isOpen) => !isOpen && onClose()} isDismissable>
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog style={{ width: 720, maxWidth: 720, height: 640, maxHeight: 640 }}>
          <Modal.Header>
            <Modal.Heading>Settings</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="!mt-4">
            <div className="flex gap-5">
              <nav className="flex w-36 shrink-0 flex-col gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                        active
                          ? 'bg-app-bg-soft font-medium text-app-fg'
                          : 'text-app-fg-muted hover:bg-app-bg-soft/60 hover:text-app-fg'
                      )}
                    >
                      <Icon size={15} className="shrink-0" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
              <div className="min-w-0 flex-1">
                {activeTab === 'appearance' && <AppearanceSection />}
                {activeTab === 'editor' && <EditorSection />}
                {activeTab === 'grid' && <GridSection />}
                {activeTab === 'queries' && <QueriesSection />}
                {activeTab === 'layout' && <LayoutSection />}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

function AppearanceSection(): ReactElement {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const uiFont = useSettingsStore((s) => s.uiFont)
  const setUiFont = useSettingsStore((s) => s.setUiFont)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled)
  const setAnimationsEnabled = useSettingsStore((s) => s.setAnimationsEnabled)
  const t = useT()

  return (
    <div className="space-y-5">
      <SettingRow title={t('settings.theme')} description={t('settings.themeDescription')}>
        <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </SettingRow>
      <SettingRow title={t('settings.uiFont')} description={t('settings.uiFontDescription')}>
        <Select options={UI_FONT_OPTIONS} value={uiFont} onChange={setUiFont} />
      </SettingRow>
      <SettingRow title={t('settings.language')} description={t('settings.languageDescription')}>
        <Select options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </SettingRow>
      <SettingRow
        title={t('settings.animations')}
        description={t('settings.animationsDescription')}
      >
        <Toggle checked={animationsEnabled} onChange={setAnimationsEnabled} />
      </SettingRow>
    </div>
  )
}

function EditorSection(): ReactElement {
  const t = useT()
  const editorFont = useSettingsStore((s) => s.editorFont)
  const setEditorFont = useSettingsStore((s) => s.setEditorFont)
  const editorFontSize = useSettingsStore((s) => s.editorFontSize)
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize)
  const editorLineHeight = useSettingsStore((s) => s.editorLineHeight)
  const setEditorLineHeight = useSettingsStore((s) => s.setEditorLineHeight)
  const editorWordWrap = useSettingsStore((s) => s.editorWordWrap)
  const setEditorWordWrap = useSettingsStore((s) => s.setEditorWordWrap)
  const editorIndentWidth = useSettingsStore((s) => s.editorIndentWidth)
  const setEditorIndentWidth = useSettingsStore((s) => s.setEditorIndentWidth)

  return (
    <div className="space-y-5">
      <SettingRow
        title={t('settings.editorFont')}
        description={t('settings.editorFontDescription')}
      >
        <Select options={EDITOR_FONT_OPTIONS} value={editorFont} onChange={setEditorFont} />
      </SettingRow>
      <SettingRow title={t('settings.fontSize')} description={t('settings.fontSizeDescription')}>
        <Segmented
          options={FONT_SIZE_OPTIONS}
          value={editorFontSize}
          onChange={setEditorFontSize}
        />
      </SettingRow>
      <SettingRow
        title={t('settings.lineHeight')}
        description={t('settings.lineHeightDescription')}
      >
        <Segmented
          options={LINE_HEIGHT_OPTIONS}
          value={editorLineHeight}
          onChange={setEditorLineHeight}
        />
      </SettingRow>
      <SettingRow title={t('settings.wordWrap')} description={t('settings.wordWrapDescription')}>
        <Toggle checked={editorWordWrap} onChange={setEditorWordWrap} />
      </SettingRow>
      <SettingRow
        title={t('settings.indentWidth')}
        description={t('settings.indentWidthDescription')}
      >
        <Segmented
          options={INDENT_OPTIONS}
          value={editorIndentWidth}
          onChange={setEditorIndentWidth}
        />
      </SettingRow>
    </div>
  )
}

function GridSection(): ReactElement {
  const t = useT()
  const gridDensity = useSettingsStore((s) => s.gridDensity)
  const setGridDensity = useSettingsStore((s) => s.setGridDensity)
  const showRowNumbers = useSettingsStore((s) => s.showRowNumbers)
  const setShowRowNumbers = useSettingsStore((s) => s.setShowRowNumbers)
  const nullDisplay = useSettingsStore((s) => s.nullDisplay)
  const setNullDisplay = useSettingsStore((s) => s.setNullDisplay)

  return (
    <div className="space-y-5">
      <SettingRow
        title={t('settings.rowDensity')}
        description={t('settings.rowDensityDescription')}
      >
        <Segmented options={DENSITY_OPTIONS} value={gridDensity} onChange={setGridDensity} />
      </SettingRow>
      <SettingRow
        title={t('settings.showRowNumbers')}
        description={t('settings.showRowNumbersDescription')}
      >
        <Toggle checked={showRowNumbers} onChange={setShowRowNumbers} />
      </SettingRow>
      <SettingRow title={t('settings.nullCells')} description={t('settings.nullCellsDescription')}>
        <Select options={NULL_DISPLAY_OPTIONS} value={nullDisplay} onChange={setNullDisplay} />
      </SettingRow>
    </div>
  )
}

function QueriesSection(): ReactElement {
  const t = useT()
  const selectLimit = useSettingsStore((s) => s.selectLimit)
  const setSelectLimit = useSettingsStore((s) => s.setSelectLimit)
  const confirmDestructive = useSettingsStore((s) => s.confirmDestructive)
  const setConfirmDestructive = useSettingsStore((s) => s.setConfirmDestructive)

  return (
    <div className="space-y-5">
      <SettingRow
        title={t('settings.selectLimit')}
        description={t('settings.selectLimitDescription')}
      >
        <Segmented options={LIMIT_OPTIONS} value={selectLimit} onChange={setSelectLimit} />
      </SettingRow>
      <SettingRow
        title={t('settings.confirmDestructive')}
        description={t('settings.confirmDestructiveDescription')}
      >
        <Toggle checked={confirmDestructive} onChange={setConfirmDestructive} />
      </SettingRow>
    </div>
  )
}

function LayoutSection(): ReactElement {
  const t = useT()
  const resetLayout = useSettingsStore((s) => s.resetLayout)

  return (
    <div className="space-y-5">
      <SettingRow
        title={t('settings.resetLayout')}
        description={t('settings.resetLayoutDescription')}
      >
        <Button variant="secondary" onPress={resetLayout}>
          {t('settings.resetLayoutButton')}
        </Button>
      </SettingRow>
    </div>
  )
}

function SettingRow({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-app-fg-muted">{title}</span>
        {description && (
          <span className="text-[11px] leading-snug text-app-fg-soft">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Select<T extends string>({
  options,
  value,
  onChange
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}): ReactElement {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value as T)}
      className="rounded-md border border-app-edge bg-app-bg px-2 py-1.5 text-xs text-app-fg outline-none focus:border-app-fg-muted"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}): ReactElement {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-md border border-app-edge">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'px-2.5 py-1.5 text-xs transition-colors',
            value === option.value
              ? 'bg-app-accent text-app-accent-fg'
              : 'text-app-fg-muted hover:bg-app-bg-soft'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-app-accent' : 'bg-app-bg-soft'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform',
          checked ? 'translate-x-5 bg-app-accent-fg' : 'translate-x-0 bg-white'
        )}
      />
    </button>
  )
}
