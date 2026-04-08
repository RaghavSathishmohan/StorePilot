'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface ReorderRecommendation {
  id?: string
  productId: string
  productName: string
  sku: string
  currentStock: number
  reorderPoint: number
  suggestedQuantity: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  estimatedDaysUntilStockout: number | null
  avgDailySales: number
}

export interface ReduceOrderRecommendation {
  id?: string
  productId: string
  productName: string
  sku: string
  currentStock: number
  suggestedReduction: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  daysWithoutSales: number
  stockValue: number
}

export interface BundleRecommendation {
  id?: string
  primaryProductId: string
  primaryProductName: string
  bundledProducts: {
    productId: string
    productName: string
    sku: string
  }[]
  bundleFrequency: number
  combinedMargin: number
  suggestedDiscount: number
  priority: 'high' | 'medium' | 'low'
  reason: string
}

// ==================== REORDER RECOMMENDATIONS ====================

export async function generateReorderRecommendations(
  storeId?: string
): Promise<ReorderRecommendation[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

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

  // Get inventory data
  const { data: inventoryData } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      products!inner(id, name, sku, reorder_point, min_stock_level, reorder_quantity)
    `)
    .order('snapshot_date', { ascending: false })
    .in('store_id', storeIds)
    .limit(500)

  if (!inventoryData) {
    return []
  }

  // Get latest per product
  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  // Calculate sales velocity (30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const productIds = Array.from(latestInventory.keys())

  const { data: salesData } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const salesByProduct = new Map<string, number>()
  salesData?.forEach((sale: any) => {
    salesByProduct.set(sale.product_id, (salesByProduct.get(sale.product_id) || 0) + sale.quantity)
  })

  const recommendations: ReorderRecommendation[] = []

  latestInventory.forEach((item, productId) => {
    const product = item.products
    const currentStock = item.quantity
    const reorderPoint = product.reorder_point || product.min_stock_level || 10
    const reorderQuantity = product.reorder_quantity || Math.max(10, reorderPoint * 2)

    // Calculate average daily sales
    const totalSales = salesByProduct.get(productId) || 0
    const avgDailySales = totalSales / 30

    const daysUntilStockout = avgDailySales > 0
      ? Math.floor(currentStock / avgDailySales)
      : null

    // Only suggest reorder if below or near reorder point
    if (currentStock <= reorderPoint * 1.5) {
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'low'
      let reason = ''

      if (currentStock <= 0) {
        priority = 'critical'
        reason = 'Item is currently out of stock'
      } else if (daysUntilStockout !== null && daysUntilStockout <= 3) {
        priority = 'critical'
        reason = `Stockout imminent: approximately ${daysUntilStockout} days remaining`
      } else if (daysUntilStockout !== null && daysUntilStockout <= 7) {
        priority = 'high'
        reason = `Low stock: approximately ${daysUntilStockout} days remaining`
      } else if (currentStock <= reorderPoint) {
        priority = 'medium'
        reason = 'Stock below reorder point'
      } else {
        priority = 'low'
        reason = 'Approaching reorder point'
      }

      recommendations.push({
        productId,
        productName: product.name,
        sku: product.sku,
        currentStock,
        reorderPoint,
        suggestedQuantity: reorderQuantity,
        priority,
        reason,
        estimatedDaysUntilStockout: daysUntilStockout,
        avgDailySales,
      })
    }
  })

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ==================== REDUCE ORDER RECOMMENDATIONS ====================

export async function generateReduceOrderRecommendations(
  storeId?: string
): Promise<ReduceOrderRecommendation[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

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

  // Get inventory with product details
  const { data: inventoryData } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      unit_cost,
      products!inner(id, name, sku, cost_price, max_stock_level)
    `)
    .gt('quantity', 0)
    .order('snapshot_date', { ascending: false })
    .in('store_id', storeIds)
    .limit(500)

  if (!inventoryData) {
    return []
  }

  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  const productIds = Array.from(latestInventory.keys())

  // Get last sale dates
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

  const now = Date.now()
  const recommendations: ReduceOrderRecommendation[] = []

  latestInventory.forEach((item, productId) => {
    const product = item.products
    const currentStock = item.quantity
    const unitCost = item.unit_cost || product.cost_price || 0
    const stockValue = currentStock * unitCost
    const maxStock = product.max_stock_level || currentStock * 2

    const lastSaleDate = lastSaleMap.get(productId)
    const daysWithoutSales = lastSaleDate
      ? Math.floor((now - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
      : 365

    // Recommend reduction if excess stock and slow movement
    if (currentStock > maxStock * 0.5 && daysWithoutSales > 30) {
      const excessStock = currentStock - Math.floor(maxStock * 0.5)
      const suggestedReduction = Math.min(excessStock, currentStock - 1)

      let priority: 'critical' | 'high' | 'medium' | 'low' = 'low'
      let reason = ''

      if (daysWithoutSales >= 180 && stockValue > 1000) {
        priority = 'critical'
        reason = `Dead inventory: ${daysWithoutSales} days without sales, $${stockValue.toFixed(0)} tied up`
      } else if (daysWithoutSales >= 120) {
        priority = 'high'
        reason = `Slow moving: ${daysWithoutSales} days without sales`
      } else if (daysWithoutSales >= 90) {
        priority = 'medium'
        reason = `Declining sales: ${daysWithoutSales} days without sales`
      } else if (currentStock > maxStock) {
        priority = 'low'
        reason = 'Stock exceeds maximum level'
      }

      if (suggestedReduction > 0) {
        recommendations.push({
          productId,
          productName: product.name,
          sku: product.sku,
          currentStock,
          suggestedReduction,
          priority,
          reason,
          daysWithoutSales,
          stockValue,
        })
      }
    }
  })

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ==================== BUNDLE RECOMMENDATIONS ====================

export async function generateBundleRecommendations(
  storeId?: string
): Promise<BundleRecommendation[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

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

  // Get receipts with line items
  const { data: receiptsRaw } = await supabase
    .from('sales_receipts')
    .select('id, store_id')
    .in('store_id', storeIds)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('is_voided', false)
    .limit(1000)
  const receipts = receiptsRaw as { id: string; store_id?: string }[] | null

  if (!receipts || receipts.length === 0) {
    return []
  }

  const receiptIds = receipts.map(r => r.id)

  // Get line items for these receipts
  const { data: lineItemsRaw } = await supabase
    .from('sale_line_items')
    .select('receipt_id, product_id, product_name, product_sku, unit_price, cost_price, quantity')
    .in('receipt_id', receiptIds)
    .not('product_id', 'is', null)
  const lineItems = lineItemsRaw as any[] | null

  if (!lineItems) {
    return []
  }

  // Group line items by receipt
  const receiptItems = new Map<string, any[]>()
  lineItems.forEach((item: any) => {
    const existing = receiptItems.get(item.receipt_id) || []
    existing.push(item)
    receiptItems.set(item.receipt_id, existing)
  })

  // Find product pairs that appear together
  const pairCounts = new Map<string, {
    count: number
    product1: { id: string; name: string; sku: string }
    product2: { id: string; name: string; sku: string }
    margins: number[]
  }>()

  receiptItems.forEach((items) => {
    if (items.length < 2) return

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const p1 = items[i]
        const p2 = items[j]

        const pairKey = [p1.product_id, p2.product_id].sort().join('-')

        const existing = pairCounts.get(pairKey)
        if (existing) {
          existing.count++
          const margin1 = p1.unit_price - (p1.cost_price || 0)
          const margin2 = p2.unit_price - (p2.cost_price || 0)
          existing.margins.push(margin1 + margin2)
        } else {
          pairCounts.set(pairKey, {
            count: 1,
            product1: { id: p1.product_id, name: p1.product_name, sku: p1.product_sku },
            product2: { id: p2.product_id, name: p2.product_name, sku: p2.product_sku },
            margins: [
              (p1.unit_price - (p1.cost_price || 0)) +
              (p2.unit_price - (p2.cost_price || 0))
            ],
          })
        }
      }
    }
  })

  // Filter to pairs that appear together frequently (at least 3 times)
  const frequentPairs = Array.from(pairCounts.entries())
    .filter(([_, data]) => data.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)

  const recommendations: BundleRecommendation[] = []

  frequentPairs.forEach(([_, data]) => {
    const avgMargin = data.margins.reduce((sum, m) => sum + m, 0) / data.margins.length
    const bundleFrequency = data.count

    // Only suggest bundles with healthy margins
    if (avgMargin > 5) {
      let priority: 'high' | 'medium' | 'low'
      if (bundleFrequency >= 10 && avgMargin > 15) {
        priority = 'high'
      } else if (bundleFrequency >= 5 && avgMargin > 10) {
        priority = 'medium'
      } else {
        priority = 'low'
      }

      const suggestedDiscount = Math.min(15, Math.max(5, avgMargin * 0.3))

      recommendations.push({
        primaryProductId: data.product1.id,
        primaryProductName: data.product1.name,
        bundledProducts: [
          { productId: data.product2.id, productName: data.product2.name, sku: data.product2.sku }
        ],
        bundleFrequency,
        combinedMargin: avgMargin,
        suggestedDiscount,
        priority,
        reason: `Bought together ${bundleFrequency} times with $${avgMargin.toFixed(2)} combined margin`,
      })
    }
  })

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ==================== SAVE RECOMMENDATIONS ====================

export async function saveRecommendations(
  storeId: string,
  recommendations: {
    type: 'reorder' | 'reduce_order' | 'bundle'
    data: any
  }[]
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const records = recommendations.map(rec => ({
    store_id: storeId,
    recommendation_type: rec.type,
    title: rec.type === 'reorder'
      ? `Reorder: ${rec.data.productName}`
      : rec.type === 'reduce_order'
        ? `Reduce: ${rec.data.productName}`
        : `Bundle: ${rec.data.primaryProductName}`,
    description: rec.data.reason,
    rationale: JSON.stringify(rec.data),
    expected_impact: rec.type === 'reorder'
      ? `Prevent stockout, maintain sales velocity`
      : rec.type === 'reduce_order'
        ? `Free up $${rec.data.stockValue?.toFixed(0) || 0} in tied capital`
        : `Increase AOV by ~$${rec.data.combinedMargin?.toFixed(0) || 0}`,
    priority: rec.data.priority === 'critical' ? 1 : rec.data.priority === 'high' ? 2 : rec.data.priority === 'medium' ? 3 : 4,
    status: 'pending' as const,
    target_metrics: rec.type === 'reorder'
      ? { reorder_quantity: rec.data.suggestedQuantity }
      : rec.type === 'reduce_order'
        ? { reduction_quantity: rec.data.suggestedReduction }
        : { bundle_discount: rec.data.suggestedDiscount },
    metadata: rec.data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  if (records.length > 0) {
    await (supabase.from('recommendations') as any).insert(records)
  }

  revalidatePath('/dashboard/recommendations')
}

// ==================== GET RECOMMENDATIONS ====================

export async function getRecommendations(
  storeId?: string,
  status?: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'snoozed'
): Promise<any[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  let query = supabase
    .from('recommendations')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  } else {
    const { data: storesRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const stores = storesRaw as { store_id: string }[] | null
    const storeIds = stores?.map(s => s.store_id) || []
    if (storeIds.length > 0) {
      query = query.in('store_id', storeIds)
    }
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.limit(100)

  if (error) {
    console.error('Error fetching recommendations:', error)
    return []
  }

  return data || []
}

export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'accepted' | 'rejected' | 'implemented' | 'snoozed',
  notes?: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'implemented') {
    updateData.implemented_by = user.id
    updateData.implemented_at = new Date().toISOString()
    updateData.implementation_notes = notes
  } else if (status === 'rejected') {
    updateData.dismissed_by = user.id
    updateData.dismissed_at = new Date().toISOString()
    updateData.dismiss_reason = notes
  }

  await (supabase
    .from('recommendations') as any)
    .update(updateData)
    .eq('id', recommendationId)

  revalidatePath('/dashboard/recommendations')
}

// ==================== GENERATE ALL RECOMMENDATIONS ====================

export async function generateAllRecommendations(storeId?: string): Promise<{
  reorder: ReorderRecommendation[]
  reduceOrder: ReduceOrderRecommendation[]
  bundle: BundleRecommendation[]
}> {
  const [reorder, reduceOrder, bundle] = await Promise.all([
    generateReorderRecommendations(storeId).catch(() => []),
    generateReduceOrderRecommendations(storeId).catch(() => []),
    generateBundleRecommendations(storeId).catch(() => []),
  ])

  // Save to database if storeId is provided
  if (storeId) {
    const toSave = [
      ...reorder.map(r => ({ type: 'reorder' as const, data: r })),
      ...reduceOrder.map(r => ({ type: 'reduce_order' as const, data: r })),
      ...bundle.map(r => ({ type: 'bundle' as const, data: r })),
    ]
    await saveRecommendations(storeId, toSave)
  }

  return { reorder, reduceOrder, bundle }
}
