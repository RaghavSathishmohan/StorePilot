import { Metadata } from 'next'
import { Suspense } from 'react'
import { AskStoreContent } from '@/components/dashboard/ask-store-content'
import { AskStoreSkeleton } from '@/components/dashboard/ask-store-skeleton'

export const metadata: Metadata = {
  title: 'Ask Your Store | StorePilot',
  description: 'Ask natural language questions about your store performance',
}

export default function AskStorePage() {
  return (
    <Suspense fallback={<AskStoreSkeleton />}>
      <AskStoreContent />
    </Suspense>
  )
}
