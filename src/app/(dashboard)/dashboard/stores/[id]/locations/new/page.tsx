'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getStore, createStoreLocation } from '@/app/actions/stores'
import { ArrowLeft, Loader2 } from 'lucide-react'

interface NewLocationPageProps {
  params: Promise<{ id: string }>
}

export default function NewLocationPage({ params }: NewLocationPageProps) {
  return <NewLocation params={params} />
}

function NewLocation({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useState(() => {
    async function loadStore() {
      const { id } = await params
      setStoreId(id)
      const store = await getStore(id)
      if (store) {
        setStoreName((store as Record<string, any>).name)
      }
    }
    loadStore()
  })

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!storeId) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.append('storeId', storeId)

    const result = await createStoreLocation(formData)

    if (result.error) {
      setError('message' in result.error ? result.error.message : 'Failed to create location')
      setIsLoading(false)
      return
    }

    if (result.success) {
      router.push(`/dashboard/stores/${storeId}/locations`)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/stores/${storeId}/locations`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Add Location</h2>
          <p className="text-muted-foreground">
            Add a new location to {storeName}.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Main Street Location"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="123 Main St"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" disabled={isLoading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" name="state" disabled={isLoading} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input id="zipCode" name="zipCode" disabled={isLoading} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Link href={`/dashboard/stores/${storeId}/locations`}>
                <Button variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Location'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
