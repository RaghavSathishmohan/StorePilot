import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client'
import { getStores } from '@/app/actions/stores'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getStores()

  return (
    <DashboardLayoutClient user={user} stores={stores}>
      {children}
    </DashboardLayoutClient>
  )
}
