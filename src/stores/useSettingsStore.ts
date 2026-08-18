import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createElectronStorage } from '../lib/electron-storage'
import { detectLocale, type SupportedLocale } from '../lib/i18n'

export type GridDensity = 'compact' | 'normal' | 'comfortable'
export type UiFont = 'inter' | 'system' | 'segoe'
export type EditorFont = 'mono' | 'cascadia' | 'jetbrains' | 'fira' | 'consolas'
export type EditorLineHeight = 1.4 | 1.6 | 1.8
export type NullDisplay = 'NULL' | 'null' | 'empty'

interface SettingsState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  rightPanelOpen: boolean
  rightPanelWidth: number
  editorHeight: number
  uiFont: UiFont
  gridDensity: GridDensity
  editorFont: EditorFont
  editorFontSize: number
  editorLineHeight: EditorLineHeight
  animationsEnabled: boolean
  selectLimit: number
  confirmDestructive: boolean
  showRowNumbers: boolean
  nullDisplay: NullDisplay
  editorWordWrap: boolean
  editorIndentWidth: number
  zoom: number
  language: SupportedLocale
  toggleSidebarCollapsed: () => void
  setSidebarWidth: (width: number) => void
  setRightPanelOpen: (open: boolean) => void
  setRightPanelWidth: (width: number) => void
  setEditorHeight: (height: number) => void
  setUiFont: (font: UiFont) => void
  setGridDensity: (density: GridDensity) => void
  setEditorFont: (font: EditorFont) => void
  setEditorFontSize: (size: number) => void
  setEditorLineHeight: (height: EditorLineHeight) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setSelectLimit: (limit: number) => void
  setConfirmDestructive: (confirm: boolean) => void
  setShowRowNumbers: (show: boolean) => void
  setNullDisplay: (display: NullDisplay) => void
  setEditorWordWrap: (wrap: boolean) => void
  setEditorIndentWidth: (width: number) => void
  setZoom: (zoom: number) => void
  setLanguage: (language: SupportedLocale) => void
  resetLayout: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: 260,
      rightPanelOpen: false,
      rightPanelWidth: 288,
      editorHeight: 176,
      uiFont: 'inter',
      gridDensity: 'normal',
      editorFont: 'mono',
      editorFontSize: 12.5,
      editorLineHeight: 1.6,
      animationsEnabled: true,
      selectLimit: 100,
      confirmDestructive: true,
      showRowNumbers: true,
      nullDisplay: 'NULL',
      editorWordWrap: false,
      editorIndentWidth: 2,
      zoom: 1,
      language: detectLocale(),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
      setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth }),
      setEditorHeight: (editorHeight) => set({ editorHeight }),
      setUiFont: (uiFont) => set({ uiFont }),
      setGridDensity: (gridDensity) => set({ gridDensity }),
      setEditorFont: (editorFont) => set({ editorFont }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setEditorLineHeight: (editorLineHeight) => set({ editorLineHeight }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setSelectLimit: (selectLimit) => set({ selectLimit }),
      setConfirmDestructive: (confirmDestructive) => set({ confirmDestructive }),
      setShowRowNumbers: (showRowNumbers) => set({ showRowNumbers }),
      setNullDisplay: (nullDisplay) => set({ nullDisplay }),
      setEditorWordWrap: (editorWordWrap) => set({ editorWordWrap }),
      setEditorIndentWidth: (editorIndentWidth) => set({ editorIndentWidth }),
      setZoom: (zoom) => set({ zoom }),
      setLanguage: (language) => set({ language }),
      resetLayout: () => set({ sidebarWidth: 260, rightPanelWidth: 288, editorHeight: 176 })
    }),
    {
      name: 'ui-settings',
      storage: createElectronStorage<SettingsState>()
    }
  )
)
