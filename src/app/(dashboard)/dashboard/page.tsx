import { Suspense } from 'react'
import { Metadata } from 'next'
import {
  getRevenueMetrics,
  getTopSellingItems,
  getLowPerformingItems,
  getStockoutRiskItems,
  getDeadInventoryItems,
  getDashboardCounts,
  getDailyRevenueData,
  getCategoryPerformance,
} from '@/app/actions/dashboard'
import {
  calculateStockoutRiskScores,
  calculateDeadInventoryRiskScores,
} from '@/app/actions/risk-scoring'
import { generateAllRiskAlerts } from '@/app/actions/alert-generation'
import { DashboardPageClient } from '@/components/dashboard/dashboard-page-client'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'

export const metadata: Metadata = {
  title: 'Dashboard | StorePilot',
  description: 'Overview of your store performance',
}

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [
    revenueMetrics,
    topSellingItems,
    lowPerformingItems,
    stockoutRiskItems,
    deadInventoryItems,
    dashboardCounts,
    dailyRevenueData,
    categoryPerformance,
    stockoutRiskScores,
    deadInventoryRiskScores,
  ] = await Promise.all([
    getRevenueMetrics().catch(() => ({
      today: 0,
      yesterday: 0,
      change: 0,
      changePercent: 0,
    })),
    getTopSellingItems(5).catch(() => []),
    getLowPerformingItems(5).catch(() => []),
    getStockoutRiskItems(5).catch(() => []),
    getDeadInventoryItems(5).catch(() => []),
    getDashboardCounts().catch(() => ({
      refundCount: 0,
      voidCount: 0,
      alertCount: 0,
      unreadAlertCount: 0,
    })),
    getDailyRevenueData(30).catch(() => []),
    getCategoryPerformance().catch(() => []),
    calculateStockoutRiskScores().catch(() => []),
    calculateDeadInventoryRiskScores().catch(() => []),
  ])

  // Trigger alert generation in the background (don't await)
  generateAllRiskAlerts().catch(console.error)

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageClient
        revenueMetrics={revenueMetrics}
        topSellingItems={topSellingItems}
        lowPerformingItems={lowPerformingItems}
        stockoutRiskItems={stockoutRiskItems}
        deadInventoryItems={deadInventoryItems}
        dashboardCounts={dashboardCounts}
        dailyRevenueData={dailyRevenueData}
        categoryPerformance={categoryPerformance}
        stockoutRiskScores={stockoutRiskScores}
        deadInventoryRiskScores={deadInventoryRiskScores}
      />
    </Suspense>
  )
}
