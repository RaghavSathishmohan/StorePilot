'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStore, getStoreLocations, deleteStoreLocation } from '@/app/actions/stores'
import { ArrowLeft, MapPin, Plus, Settings, Trash2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface StoreLocationsPageProps {
  params: Promise<{ id: string }>
}

export default function StoreLocationsPage({ params }: StoreLocationsPageProps) {
  return <StoreLocations params={params} />
}

function StoreLocations({ params }: { params: Promise<{ id: string }> }) {
  const [storeId, setStoreId] = useState<string | null>(null)
  const [store, setStore] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { id } = await params
      setStoreId(id)

      const storeData = await getStore(id)
      if (storeData) {
        setStore(storeData)
      }

      const locationsData = await getStoreLocations(id)
      setLocations(locationsData)
      setIsLoading(false)
    }
    loadData()
  }, [params])

  async function handleDeleteLocation(locationId: string) {
    setIsDeleting(true)
    const result = await deleteStoreLocation(locationId)

    if (result.error) {
      setError('message' in result.error ? result.error.message : 'Failed to delete location')
      setIsDeleting(false)
      setDeleteLocationId(null)
      return
    }

    setLocations(locations.filter((l) => l.id !== locationId))
    setIsDeleting(false)
    setDeleteLocationId(null)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/stores/${storeId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{store?.name} Locations</h2>
            <p className="text-muted-foreground">
              Manage locations for this store.
            </p>
          </div>
        </div>
        <Link href={`/dashboard/stores/${storeId}/locations/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">No locations yet</CardTitle>
            <CardDescription className="text-center mb-6">
              Get started by adding your first location.
            </CardDescription>
            <Link href={`/dashboard/stores/${storeId}/locations/new`}>
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <CardDescription>{location.city || 'No city'}</CardDescription>
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
                  </p>
                )}
                {location.phone && (
                  <p className="text-sm text-muted-foreground">{location.phone}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/locations/${location.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Dialog
                    open={deleteLocationId === location.id}
                    onOpenChange={(open) => !open && setDeleteLocationId(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => setDeleteLocationId(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Location</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete {location.name}? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteLocationId(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteLocation(location.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
