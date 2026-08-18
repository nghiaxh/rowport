import { create } from 'zustand'

interface SchemaStore {
  version: number
  bump: () => void
}

export const useSchemaStore = create<SchemaStore>()((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 }))
}))
