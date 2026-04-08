import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getStores } from '@/app/actions/stores'
import { getInventory, getCategories } from '@/app/actions/products'
import { InventoryClient } from '@/components/inventory/inventory-client'

export const metadata = {
  title: 'Inventory | StorePilot',
  description: 'Manage your inventory levels',
}

export default async function InventoryPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getStores()

  if (stores.length === 0) {
    redirect('/onboarding')
  }

  // Get inventory and categories for the first store with fallbacks
  const [inventory, categories] = await Promise.all([
    getInventory(stores[0].id).catch(() => []),
    getCategories(stores[0].id).catch(() => []),
  ])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Track and manage stock levels across your stores
          </p>
        </div>
      </div>

      <InventoryClient
        stores={stores}
        initialInventory={inventory || []}
        initialCategories={categories || []}
        initialStoreId={stores[0].id}
      />
    </div>
  )
}
