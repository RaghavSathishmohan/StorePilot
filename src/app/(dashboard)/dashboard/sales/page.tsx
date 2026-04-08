import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
import { getStores } from '@/app/actions/stores'
import { getProducts } from '@/app/actions/products'
import { getSales } from '@/app/actions/sales'
import { SalesClient } from '@/components/sales/sales-client'

export const metadata = {
  title: 'Sales | StorePilot',
  description: 'Record and manage sales',
}

export default async function SalesPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const stores = await getStores()

  if (stores.length === 0) {
    redirect('/onboarding')
  }

  // Get products and sales for the first store with fallbacks
  const [products, sales] = await Promise.all([
    getProducts(stores[0].id).catch(() => []),
    getSales(stores[0].id).catch(() => []),
  ])

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Record sales and view transaction history
          </p>
        </div>
      </div>

      <SalesClient
        stores={stores}
        initialProducts={products || []}
        initialSales={sales || []}
        initialStoreId={stores[0].id}
      />
    </div>
  )
}
