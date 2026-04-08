'use client'

import { ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { StoreProvider } from '@/lib/store-context'
import { DashboardShell } from './dashboard-shell'

interface Store {
  id: string
  name: string
  slug: string
  role?: string
}

interface DashboardLayoutClientProps {
  children: ReactNode
  user: User
  stores: Store[]
}

export function DashboardLayoutClient({ children, user, stores }: DashboardLayoutClientProps) {
  return (
    <StoreProvider>
      <DashboardShell user={user} stores={stores}>
        {children}
      </DashboardShell>
    </StoreProvider>
  )
}
