import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getStores } from '@/app/actions/stores'
import { getProducts, getInventory, getCategories } from '@/app/actions/products'
import { ProductsClient } from '@/components/products/products-client'

export const metadata = {
  title: 'Products | StorePilot',
  description: 'Manage your product catalog',
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getStores()

  if (stores.length === 0) {
    redirect('/onboarding')
  }

  // Get products, inventory and categories for the first store with fallbacks
  const [products, inventory, categories] = await Promise.all([
    getProducts(stores[0].id).catch(() => []),
    getInventory(stores[0].id).catch(() => []),
    getCategories(stores[0].id).catch(() => []),
  ])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog and inventory
          </p>
        </div>
      </div>

      <ProductsClient
        stores={stores}
        initialProducts={products || []}
        initialInventory={inventory || []}
        initialCategories={categories || []}
        initialStoreId={stores[0].id}
      />
    </div>
  )
}
