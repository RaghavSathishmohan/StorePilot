'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { sampleStore, getSampleStoreData } from '@/lib/sample-store-data'

interface Store {
  id: string
  name: string
  slug: string
  role?: string
}

interface StoreContextType {
  selectedStore: Store | null
  isSampleStore: boolean
  sampleData: ReturnType<typeof getSampleStoreData> | null
  selectStore: (storeId: string, userStores: Store[]) => void
  clearSelection: () => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isSampleStore, setIsSampleStore] = useState(false)

  const selectStore = useCallback((storeId: string, userStores: Store[]) => {
    if (storeId === 'sample-store') {
      setSelectedStore(sampleStore)
      setIsSampleStore(true)
    } else {
      const store = userStores.find((s) => s.id === storeId)
      if (store) {
        setSelectedStore(store)
        setIsSampleStore(false)
      }
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStore(null)
    setIsSampleStore(false)
  }, [])

  const sampleData = isSampleStore ? getSampleStoreData() : null

  return (
    <StoreContext.Provider
      value={{
        selectedStore,
        isSampleStore,
        sampleData,
        selectStore,
        clearSelection,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
