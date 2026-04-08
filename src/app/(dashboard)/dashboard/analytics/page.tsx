import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getUser } from '@/app/actions/auth'
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
import { AnalyticsClient } from '@/components/dashboard/analytics-client'

export const metadata: Metadata = {
  title: 'Analytics | StorePilot',
  description: 'Deep dive into your store performance and insights',
}

// Force dynamic rendering to prevent static generation errors with cookies
export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all analytics data in parallel with error handling
  const [
    revenueMetrics,
    topSellingItems,
    lowPerformingItems,
    stockoutRiskItems,
    deadInventoryItems,
    dashboardCounts,
    dailyRevenueData,
    categoryPerformance,
  ] = await Promise.all([
    getRevenueMetrics().catch(() => ({
      today: 0,
      yesterday: 0,
      change: 0,
      changePercent: 0,
    })),
    getTopSellingItems(10).catch(() => []),
    getLowPerformingItems(10).catch(() => []),
    getStockoutRiskItems(10).catch(() => []),
    getDeadInventoryItems(10).catch(() => []),
    getDashboardCounts().catch(() => ({
      refundCount: 0,
      voidCount: 0,
      alertCount: 0,
      unreadAlertCount: 0,
    })),
    getDailyRevenueData(30).catch(() => []),
    getCategoryPerformance().catch(() => []),
  ])

  return (
    <AnalyticsClient
      revenueMetrics={revenueMetrics}
      topSellingItems={topSellingItems}
      lowPerformingItems={lowPerformingItems}
      stockoutRiskItems={stockoutRiskItems}
      deadInventoryItems={deadInventoryItems}
      dashboardCounts={dashboardCounts}
      dailyRevenueData={dailyRevenueData}
      categoryPerformance={categoryPerformance}
    />
  )
}
