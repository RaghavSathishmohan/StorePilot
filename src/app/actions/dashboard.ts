'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface RevenueMetrics {
  today: number
  yesterday: number
  change: number
  changePercent: number
}

export interface TopSellingItem {
  id: string
  name: string
  sku: string
  quantity: number
  revenue: number
  image_url: string | null
}

export interface LowPerformingItem {
  id: string
  name: string
  sku: string
  quantity: number
  revenue: number
  daysSinceLastSale: number
}

export interface StockoutRiskItem {
  id: string
  name: string
  sku: string
  currentStock: number
  reorderPoint: number
  daysUntilStockout: number | null
  avgDailySales: number
}

export interface DeadInventoryItem {
  id: string
  name: string
  sku: string
  currentStock: number
  stockValue: number
  daysWithoutMovement: number
  lastSaleDate: string | null
}

export interface DailyRevenueData {
  date: string
  revenue: number
  transactions: number
}

export interface CategoryPerformance {
  name: string
  revenue: number
  itemsSold: number
  color: string
}

export interface DashboardCounts {
  refundCount: number
  voidCount: number
  alertCount: number
  unreadAlertCount: number
}

export async function getRevenueMetrics(storeId?: string): Promise<RevenueMetrics> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  // Return zeros if no stores
  if (storeIds.length === 0) {
    return { today: 0, yesterday: 0, change: 0, changePercent: 0 }
  }

  // Fetch today's metrics
  const { data: todayDataRaw } = await supabase
    .from('daily_metrics')
    .select('total_sales')
    .eq('metric_date', todayStr)
    .in('store_id', storeIds)

  const todayData = todayDataRaw as { total_sales?: number }[] | null

  // Fetch yesterday's metrics
  const { data: yesterdayDataRaw } = await supabase
    .from('daily_metrics')
    .select('total_sales')
    .eq('metric_date', yesterdayStr)
    .in('store_id', storeIds)

  const yesterdayData = yesterdayDataRaw as { total_sales?: number }[] | null

  const todayRevenue = todayData?.reduce((sum, d) => sum + (d.total_sales || 0), 0) || 0
  const yesterdayRevenue = yesterdayData?.reduce((sum, d) => sum + (d.total_sales || 0), 0) || 0

  const change = todayRevenue - yesterdayRevenue
  const changePercent = yesterdayRevenue > 0 ? (change / yesterdayRevenue) * 100 : 0

  return {
    today: todayRevenue,
    yesterday: yesterdayRevenue,
    change,
    changePercent,
  }
}

export async function getTopSellingItems(
  limit: number = 5,
  storeId?: string
): Promise<TopSellingItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return []
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // First get receipt IDs for the date range and stores
  const { data: receiptsData } = await supabase
    .from('sales_receipts')
    .select('id')
    .in('store_id', storeIds)
    .gte('transaction_date', thirtyDaysAgo.toISOString())
    .eq('is_voided', false)

  const receiptIds = (receiptsData as { id: string }[] | null)?.map(r => r.id) || []
  if (receiptIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('sale_line_items')
    .select('product_id, product_name, product_sku, quantity, total_amount')
    .in('receipt_id', receiptIds)
    .not('product_id', 'is', null)

  if (error || !data) {
    console.error('getTopSellingItems error:', error)
    return []
  }

  // Aggregate by product
  const productMap = new Map<string, TopSellingItem>()

  data.forEach((item: any) => {
    const existing = productMap.get(item.product_id)
    if (existing) {
      existing.quantity += item.quantity
      existing.revenue += item.total_amount
    } else {
      productMap.set(item.product_id, {
        id: item.product_id,
        name: item.product_name,
        sku: item.product_sku || '',
        quantity: item.quantity,
        revenue: item.total_amount,
        image_url: null,
      })
    }
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export async function getLowPerformingItems(
  limit: number = 5,
  storeId?: string
): Promise<LowPerformingItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return []
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get all active products for user's stores
  const { data: productsRaw } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('is_active', true)
    .in('store_id', storeIds)
  const products = productsRaw as { id: string; name?: string; sku?: string }[] | null

  if (!products || products.length === 0) {
    return []
  }

  // Get sales for these products in last 30 days
  const productIds = products.map(p => p.id)

  const { data: salesData } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, total_amount, created_at')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const salesMap = new Map<string, { quantity: number; revenue: number; lastSale: Date }>()

  salesData?.forEach((item: any) => {
    const existing = salesMap.get(item.product_id)
    const saleDate = new Date(item.created_at)
    if (existing) {
      existing.quantity += item.quantity
      existing.revenue += item.total_amount
      if (saleDate > existing.lastSale) {
        existing.lastSale = saleDate
      }
    } else {
      salesMap.set(item.product_id, {
        quantity: item.quantity,
        revenue: item.total_amount,
        lastSale: saleDate,
      })
    }
  })

  const result: LowPerformingItem[] = products.map(product => {
    const sales = salesMap.get(product.id)
    const daysSinceLastSale = sales
      ? Math.floor((Date.now() - sales.lastSale.getTime()) / (1000 * 60 * 60 * 24))
      : 30

    return {
      id: product.id,
      name: product.name || 'Unknown',
      sku: product.sku || '',
      quantity: sales?.quantity || 0,
      revenue: sales?.revenue || 0,
      daysSinceLastSale,
    }
  })

  return result
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, limit)
}

export async function getStockoutRiskItems(
  limit: number = 5,
  storeId?: string
): Promise<StockoutRiskItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return []
  }

  // Get current inventory with product details
  const { data: inventoryDataRaw } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      products!inner(id, name, sku, reorder_point, min_stock_level)
    `)
    .order('snapshot_date', { ascending: false })
    .in('store_id', storeIds)
    .limit(100)
  const inventoryData = inventoryDataRaw as any[] | null

  if (!inventoryData || inventoryData.length === 0) {
    return []
  }

  // Get recent sales velocity (last 14 days)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const productIds = [...new Set(inventoryData.map((i: any) => i.product_id))]

  const { data: salesData } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, created_at')
    .in('product_id', productIds)
    .gte('created_at', fourteenDaysAgo.toISOString())

  // Calculate average daily sales per product
  const salesVelocity = new Map<string, number>()
  salesData?.forEach((item: any) => {
    salesVelocity.set(item.product_id, (salesVelocity.get(item.product_id) || 0) + item.quantity)
  })

  // Get latest inventory per product
  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  const result: StockoutRiskItem[] = []

  latestInventory.forEach((item, productId) => {
    const product = item.products
    const currentStock = item.quantity
    const reorderPoint = product.reorder_point || product.min_stock_level || 10
    const avgDailySales = (salesVelocity.get(productId) || 0) / 14

    // Only include items below or near reorder point
    if (currentStock <= reorderPoint * 1.5) {
      const daysUntilStockout = avgDailySales > 0
        ? Math.floor(currentStock / avgDailySales)
        : null

      result.push({
        id: productId,
        name: product.name,
        sku: product.sku,
        currentStock,
        reorderPoint,
        daysUntilStockout,
        avgDailySales,
      })
    }
  })

  return result
    .sort((a, b) => (a.daysUntilStockout || 999) - (b.daysUntilStockout || 999))
    .slice(0, limit)
}

export async function getDeadInventoryItems(
  limit: number = 5,
  storeId?: string
): Promise<DeadInventoryItem[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return []
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Get current inventory
  const { data: inventoryDataRaw } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      unit_cost,
      products!inner(id, name, sku, cost_price)
    `)
    .gt('quantity', 0)
    .order('snapshot_date', { ascending: false })
    .in('store_id', storeIds)
    .limit(200)
  const inventoryData = inventoryDataRaw as any[] | null

  if (!inventoryData || inventoryData.length === 0) {
    return []
  }

  // Get last sale date for each product
  const productIds = [...new Set(inventoryData.map((i: any) => i.product_id))]

  const { data: lastSales } = await supabase
    .from('sale_line_items')
    .select('product_id, created_at')
    .in('product_id', productIds)
    .order('created_at', { ascending: false })

  const lastSaleMap = new Map<string, string>()
  lastSales?.forEach((sale: any) => {
    if (!lastSaleMap.has(sale.product_id)) {
      lastSaleMap.set(sale.product_id, sale.created_at)
    }
  })

  // Get latest inventory per product
  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  const result: DeadInventoryItem[] = []

  latestInventory.forEach((item, productId) => {
    const lastSaleDate = lastSaleMap.get(productId)

    // Include if no sales in last 90 days
    if (!lastSaleDate || new Date(lastSaleDate) < ninetyDaysAgo) {
      const product = item.products
      const unitCost = item.unit_cost || product.cost_price || 0
      const stockValue = item.quantity * unitCost
      const daysWithoutMovement = lastSaleDate
        ? Math.floor((Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
        : 90

      result.push({
        id: productId,
        name: product.name || 'Unknown',
        sku: product.sku || '',
        currentStock: item.quantity,
        stockValue,
        daysWithoutMovement,
        lastSaleDate: lastSaleDate || null,
      })
    }
  })

  return result
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, limit)
}

export async function getDashboardCounts(storeId?: string): Promise<DashboardCounts> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  // Build store filter
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return { refundCount: 0, voidCount: 0, alertCount: 0, unreadAlertCount: 0 }
  }

  // Get refund count (today)
  const { data: refunds } = await supabase
    .from('refund_events')
    .select('id')
    .in('store_id', storeIds)
    .gte('created_at', todayStr)

  // Get void count (today)
  const { data: voids } = await supabase
    .from('void_events')
    .select('id')
    .in('store_id', storeIds)
    .gte('created_at', todayStr)

  // Get alert counts
  const { data: alertsRaw } = await supabase
    .from('alerts')
    .select('id, is_read')
    .in('store_id', storeIds)
    .is('dismissed_at', null)
  const alerts = alertsRaw as { id: string; is_read?: boolean }[] | null

  return {
    refundCount: refunds?.length || 0,
    voidCount: voids?.length || 0,
    alertCount: alerts?.length || 0,
    unreadAlertCount: alerts?.filter(a => !a.is_read).length || 0,
  }
}

export async function getDailyRevenueData(
  days: number = 30,
  storeId?: string
): Promise<DailyRevenueData[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    // Return empty data for the date range
    const result: DailyRevenueData[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toISOString().split('T')[0],
        revenue: 0,
        transactions: 0,
      })
    }
    return result
  }

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: metricsData } = await supabase
    .from('daily_metrics')
    .select('metric_date, total_sales, total_transactions')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .lte('metric_date', endDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true })
    .in('store_id', storeIds)
  const data = metricsData as { metric_date?: string; total_sales?: number; total_transactions?: number }[] | null

  if (!data || data.length === 0) {
    // Return empty data for the date range
    const result: DailyRevenueData[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toISOString().split('T')[0],
        revenue: 0,
        transactions: 0,
      })
    }
    return result
  }

  // Aggregate by date
  const dateMap = new Map<string, DailyRevenueData>()

  data.forEach((item: any) => {
    const existing = dateMap.get(item.metric_date)
    if (existing) {
      existing.revenue += item.total_sales || 0
      existing.transactions += item.total_transactions || 0
    } else {
      dateMap.set(item.metric_date, {
        date: item.metric_date,
        revenue: item.total_sales || 0,
        transactions: item.total_transactions || 0,
      })
    }
  })

  // Fill in missing dates
  const result: DailyRevenueData[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const existing = dateMap.get(dateStr)
    if (existing) {
      result.push(existing)
    } else {
      result.push({ date: dateStr, revenue: 0, transactions: 0 })
    }
  }

  return result
}

export async function getCategoryPerformance(
  storeId?: string
): Promise<CategoryPerformance[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get user's stores
  let storeIds: string[] = []
  if (storeId) {
    storeIds = [storeId]
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    storeIds = stores?.map(s => s.store_id) || []
  }

  if (storeIds.length === 0) {
    return []
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get categories
  const { data: categoriesRaw } = await supabase
    .from('product_categories')
    .select('id, name, color_code')
    .eq('is_active', true)
    .in('store_id', storeIds)
  const categories = categoriesRaw as { id: string; name?: string; color_code?: string }[] | null

  if (!categories || categories.length === 0) {
    return []
  }

  // Get products with their categories
  const categoryIds = categories.map(c => c.id)

  const { data: productsRaw } = await supabase
    .from('products')
    .select('id, category_id')
    .in('category_id', categoryIds)
  const products = productsRaw as { id: string; category_id?: string }[] | null

  const productCategoryMap = new Map<string, string>()
  products?.forEach((p) => {
    if (p.category_id) {
      productCategoryMap.set(p.id, p.category_id)
    }
  })

  // Get sales for these products
  const productIds = products?.map(p => p.id) || []

  if (productIds.length === 0) {
    return categories.map(c => ({
      name: c.name || 'Unknown',
      revenue: 0,
      itemsSold: 0,
      color: c.color_code || '#888888',
    }))
  }

  const { data: salesData } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, total_amount')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Aggregate by category
  const categoryStats = new Map<string, { revenue: number; itemsSold: number }>()

  salesData?.forEach((sale: any) => {
    const categoryId = productCategoryMap.get(sale.product_id)
    if (categoryId) {
      const existing = categoryStats.get(categoryId) || { revenue: 0, itemsSold: 0 }
      existing.revenue += sale.total_amount
      existing.itemsSold += sale.quantity
      categoryStats.set(categoryId, existing)
    }
  })

  return categories.map(category => {
    const stats = categoryStats.get(category.id) || { revenue: 0, itemsSold: 0 }
    return {
      name: category.name || 'Unknown',
      revenue: stats.revenue,
      itemsSold: stats.itemsSold,
      color: category.color_code || '#888888',
    }
  }).sort((a, b) => b.revenue - a.revenue)
}

export async function dismissAlert(alertId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  await (supabase
    .from('alerts') as any)
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by: user.id,
    })
    .eq('id', alertId)

  revalidatePath('/dashboard')
}
