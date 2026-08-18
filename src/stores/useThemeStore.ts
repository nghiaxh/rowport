import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createElectronStorage } from '../lib/electron-storage'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme
): ResolvedTheme {
  return preference === 'system' ? systemTheme : preference
}

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark'
        }))
    }),
    {
      name: 'ui-theme',
      storage: createElectronStorage<{ theme: ThemePreference }>(),
      partialize: (state) => ({ theme: state.theme })
    }
  )
)
