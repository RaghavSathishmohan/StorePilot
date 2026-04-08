'use client'

import { Package, Store, BarChart3, Users, Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  type: 'stores' | 'products' | 'locations' | 'sales' | 'imports' | 'alerts' | 'analytics'
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

const emptyStateConfig = {
  stores: {
    icon: Store,
    defaultTitle: 'No stores yet',
    defaultDescription: 'Create your first store to start tracking inventory and sales.',
    defaultAction: 'Create Store',
    defaultHref: '/dashboard/stores/new',
  },
  products: {
    icon: Package,
    defaultTitle: 'No products',
    defaultDescription: 'Add products to your store to start tracking inventory.',
    defaultAction: 'Add Products',
    defaultHref: '/dashboard/imports',
  },
  locations: {
    icon: Store,
    defaultTitle: 'No locations',
    defaultDescription: 'Add locations to track inventory across multiple sites.',
    defaultAction: 'Add Location',
    defaultHref: '/dashboard/locations/new',
  },
  sales: {
    icon: BarChart3,
    defaultTitle: 'No sales data',
    defaultDescription: 'Sales will appear here once transactions are recorded.',
    defaultAction: '',
    defaultHref: '',
  },
  imports: {
    icon: Upload,
    defaultTitle: 'No import history',
    defaultDescription: 'Import products from CSV or Excel to get started.',
    defaultAction: 'Import Data',
    defaultHref: '/dashboard/imports',
  },
  alerts: {
    icon: AlertCircle,
    defaultTitle: 'No active alerts',
    defaultDescription: 'Everything looks good! No issues require your attention.',
    defaultAction: '',
    defaultHref: '',
  },
  analytics: {
    icon: FileText,
    defaultTitle: 'Not enough data',
    defaultDescription: 'Analytics will appear once you have more sales history.',
    defaultAction: '',
    defaultHref: '',
  },
}

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title || config.defaultTitle}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description || config.defaultDescription}
      </p>

      {(actionLabel || config.defaultAction) && (actionHref || config.defaultHref) && (
        <Link href={actionHref || config.defaultHref}>
          <Button>{actionLabel || config.defaultAction}</Button>
        </Link>
      )}
    </div>
  )
}

// Error State
interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Failed to load data. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>

      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  )
}

// Loading State
export function LoadingState({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-muted rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
