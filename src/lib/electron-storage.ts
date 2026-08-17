import type { PersistStorage, StorageValue } from 'zustand/middleware'

export function createElectronStorage<State>(): PersistStorage<State> {
  return {
    getItem: async (name) => {
      const raw = await window.rowport.settings.get(name)
      return raw ? (JSON.parse(raw) as StorageValue<State>) : null
    },
    setItem: async (name, value) => {
      await window.rowport.settings.set(name, JSON.stringify(value))
    },
    removeItem: async (name) => {
      await window.rowport.settings.delete(name)
    }
  }
}
