import { Metadata } from 'next'
import { Suspense } from 'react'
import { generateAllRecommendations, getRecommendations } from '@/app/actions/recommendations'
import { RecommendationsContent } from '@/components/dashboard/recommendations-content'
import { RecommendationsSkeleton } from '@/components/dashboard/recommendations-skeleton'

export const metadata: Metadata = {
  title: 'Recommendations | StorePilot',
  description: 'AI-powered recommendations for your store',
}

export default async function RecommendationsPage() {
  // Generate fresh recommendations
  const { reorder, reduceOrder, bundle } = await generateAllRecommendations().catch(() => ({
    reorder: [],
    reduceOrder: [],
    bundle: [],
  }))

  // Get stored recommendations from database
  const storedRecommendations = await getRecommendations(undefined, 'pending').catch(() => [])

  return (
    <Suspense fallback={<RecommendationsSkeleton />}>
      <RecommendationsContent
        reorderRecommendations={reorder}
        reduceRecommendations={reduceOrder}
        bundleRecommendations={bundle}
        storedRecommendations={storedRecommendations}
      />
    </Suspense>
  )
}
