import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStores, getStoreLocations } from '@/app/actions/stores'
import { MapPin, Plus, Store } from 'lucide-react'

export default async function LocationsPage() {
  const stores = await getStores().catch(() => [])

  // Fetch locations for all stores
  const locationsPromises = (stores || []).map(async (store: any) => {
    const locations = await getStoreLocations(store.id).catch(() => [])
    return (locations || []).map((loc: any) => ({ ...loc, store_name: store.name }))
  })

  const allLocations = (await Promise.all(locationsPromises)).flat()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Locations</h2>
          <p className="text-muted-foreground">
            Manage all your store locations across stores.
          </p>
        </div>
        <Link href="/dashboard/stores">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </Link>
      </div>

      {allLocations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No locations yet</CardTitle>
            <CardDescription className="text-center mb-6">
              Get started by creating your first store location.
            </CardDescription>
            <Link href="/dashboard/stores">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Go to Stores
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {allLocations.map((location: any) => (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <CardDescription>{location.store_name}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {location.address && (
                  <p className="text-sm text-muted-foreground">
                    {location.address}
                    {location.city && `, ${location.city}`}
                    {location.state && `, ${location.state}`}
                    {location.zip_code && ` ${location.zip_code}`}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/locations/${location.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
