import { create } from 'zustand'
import {
  clearQueryHistory,
  deleteQueryHistory,
  loadQueryHistory,
  setHistoryOrder
} from '../lib/metadata'
import type { QueryHistoryEntry } from '../types/query'

interface HistoryStore {
  entries: QueryHistoryEntry[]
  loaded: boolean
  load: () => Promise<void>
  remove: (id: string) => Promise<void>
  clear: () => Promise<void>
  setHistoryOrder: (entries: Array<{ id: string; sortOrder: number }>) => Promise<void>
}

export const useHistoryStore = create<HistoryStore>()((set) => ({
  entries: [],
  loaded: false,

  load: async () => {
    try {
      const entries = await loadQueryHistory()
      set({ entries, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  remove: async (id) => {
    await deleteQueryHistory(id)
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }))
  },

  clear: async () => {
    await clearQueryHistory()
    set({ entries: [] })
  },

  setHistoryOrder: async (entries) => {
    await setHistoryOrder(entries)
    set((state) => ({
      entries: state.entries.map((e) => {
        const entry = entries.find((x) => x.id === e.id)
        return entry ? { ...e, sortOrder: entry.sortOrder } : e
      })
    }))
  }
}))
