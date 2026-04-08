'use client'

import { useStore } from '@/lib/store-context'
import { DashboardContent } from './dashboard-content'

interface DashboardPageClientProps {
  revenueMetrics: {
    today: number
    yesterday: number
    change: number
    changePercent: number
  }
  topSellingItems: any[]
  lowPerformingItems: any[]
  stockoutRiskItems: any[]
  deadInventoryItems: any[]
  dashboardCounts: {
    refundCount: number
    voidCount: number
    alertCount: number
    unreadAlertCount: number
  }
  dailyRevenueData: any[]
  categoryPerformance: any[]
  stockoutRiskScores: any[]
  deadInventoryRiskScores: any[]
}

export function DashboardPageClient({
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
}: DashboardPageClientProps) {
  const { isSampleStore, sampleData } = useStore()

  // If sample store is selected, use sample data
  if (isSampleStore && sampleData) {
    const sampleRevenueMetrics = {
      today: sampleData.metrics.total_sales * 0.95,
      yesterday: sampleData.metrics.total_sales,
      change: sampleData.metrics.total_sales * 0.95 - sampleData.metrics.total_sales,
      changePercent: -5,
    }

    const sampleTopSelling = sampleData.topSelling.slice(0, 5).map((item, index) => ({
      id: `sample-top-${index}`,
      name: item.name,
      sku: 'SAMPLE-SKU',
      quantity: item.quantity,
      revenue: item.revenue,
      image_url: null,
    }))

    const sampleLowPerforming = sampleData.products
      .filter((p) => p.quantity <= p.min_stock_level)
      .slice(0, 5)
      .map((p, index) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'NO-SKU',
        quantity: p.quantity,
        revenue: p.selling_price * Math.max(1, p.quantity),
        daysSinceLastSale: Math.floor(Math.random() * 30) + 1,
      }))

    // Generate proper dates for the last 7 days
    const today = new Date()
    const sampleDailyRevenue = sampleData.weeklySales.map((d, index) => {
      const date = new Date(today)
      date.setDate(date.getDate() - (6 - index))
      return {
        date: date.toISOString().split('T')[0],
        revenue: d.total,
        transactions: Math.floor(d.total / sampleData.metrics.average_transaction_value),
      }
    })

    const sampleCategoryPerf = sampleData.categoryBreakdown.map((c) => ({
      name: c.name,
      revenue: sampleData.metrics.total_sales * (c.value / 100),
      itemsSold: Math.floor(Math.random() * 500) + 50,
      color: c.color,
    }))

    const sampleDashboardCounts = {
      refundCount: sampleData.metrics.total_refunds > 0 ? 3 : 0,
      voidCount: 2,
      alertCount: sampleData.lowStockAlerts.length + sampleData.metrics.out_of_stock_items,
      unreadAlertCount: sampleData.lowStockAlerts.length,
    }

    // Stockout risk items (low stock)
    const sampleStockoutRisk = sampleData.products
      .filter((p) => p.quantity <= p.min_stock_level && p.quantity > 0)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'NO-SKU',
        currentStock: p.quantity,
        reorderPoint: p.reorder_point,
        daysUntilStockout: Math.floor(p.quantity / 2),
        avgDailySales: 2,
      }))

    // Dead inventory (out of stock)
    const sampleDeadInventory = sampleData.products
      .filter((p) => p.quantity === 0)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || 'NO-SKU',
        currentStock: p.quantity,
        stockValue: p.quantity * p.cost_price,
        daysWithoutMovement: Math.floor(Math.random() * 60) + 30,
        lastSaleDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }))

    return (
      <DashboardContent
        revenueMetrics={sampleRevenueMetrics}
        topSellingItems={sampleTopSelling}
        lowPerformingItems={sampleLowPerforming}
        stockoutRiskItems={sampleStockoutRisk}
        deadInventoryItems={sampleDeadInventory}
        dashboardCounts={sampleDashboardCounts}
        dailyRevenueData={sampleDailyRevenue}
        categoryPerformance={sampleCategoryPerf}
        stockoutRiskScores={stockoutRiskScores}
        deadInventoryRiskScores={deadInventoryRiskScores}
      />
    )
  }

  // Otherwise use real data
  return (
    <DashboardContent
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
  )
}
