import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getStores } from '@/app/actions/stores'
import { getImports } from '@/app/actions/imports'
import { ImportDashboard } from '@/components/imports/import-dashboard'

export default async function ImportsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getStores()

  if (stores.length === 0) {
    redirect('/onboarding')
  }

  // Get imports for the first store (or selected store)
  const imports = await getImports(stores[0].id).catch(() => [])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Imports</h1>
          <p className="text-muted-foreground">
            Import products, inventory, and sales data from CSV files
          </p>
        </div>
      </div>

      <ImportDashboard stores={stores} initialImports={imports} />
    </div>
  )
}
