import { create } from 'zustand'

export interface FatalErrorInfo {
  message: string
  stack?: string
  occurredAt: string
}

interface ErrorState {
  error: FatalErrorInfo | null
  reportError: (info: FatalErrorInfo) => void
  clearError: () => void
}

export const useErrorStore = create<ErrorState>((set) => ({
  error: null,
  reportError: (info) => set({ error: info }),
  clearError: () => set({ error: null })
}))
