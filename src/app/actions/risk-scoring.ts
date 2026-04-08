'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import type {
  StockoutRiskScore,
  DeadInventoryRiskScore,
  ShrinkRiskScore,
} from '@/types/risk-scoring'
import { RISK_THRESHOLDS } from '@/types/risk-scoring'

// Weight configurations for scoring
const STOCKOUT_WEIGHTS = {
  stockToReorderRatio: 0.4,
  salesVelocity: 0.35,
  stockLevel: 0.25,
}

const DEAD_INVENTORY_WEIGHTS = {
  time: 0.5,
  value: 0.3,
  quantity: 0.2,
}

const SHRINK_WEIGHTS = {
  refundSpike: 0.3,
  voidSpike: 0.3,
  discountSpike: 0.2,
  inventoryMismatch: 0.2,
}

// ==================== STOCKOUT RISK SCORING ====================

export async function calculateStockoutRiskScores(
  storeId?: string
): Promise<StockoutRiskScore[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get stores the user has access to
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

  // Get current inventory for all products
  let inventoryQuery = supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      products!inner(id, name, sku, reorder_point, min_stock_level)
    `)
    .order('snapshot_date', { ascending: false })
    .in('store_id', storeIds)

  const { data: inventoryData, error: inventoryError } = await inventoryQuery.limit(500)

  if (inventoryError || !inventoryData) {
    console.error('Error fetching inventory:', inventoryError)
    return []
  }

  // Get latest snapshot per product
  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  // Calculate sales velocity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const productIds = Array.from(latestInventory.keys())

  if (productIds.length === 0) {
    return []
  }

  // First get receipt IDs for these stores and date range
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

  // Get sales data for velocity calculation
  const { data: salesData, error: salesError } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, created_at')
    .in('receipt_id', receiptIds)
    .not('product_id', 'is', null)

  if (salesError) {
    console.error('Error fetching sales data:', salesError)
  }

  // Calculate daily sales per product
  const salesByProduct = new Map<string, { totalQty: number; daysActive: Set<string> }>()

  salesData?.forEach((sale: any) => {
    const existing = salesByProduct.get(sale.product_id) || { totalQty: 0, daysActive: new Set() }
    existing.totalQty += sale.quantity
    existing.daysActive.add(new Date(sale.created_at).toISOString().split('T')[0])
    salesByProduct.set(sale.product_id, existing)
  })

  const scores: StockoutRiskScore[] = []

  latestInventory.forEach((item, productId) => {
    const product = item.products
    const currentStock = item.quantity
    const reorderPoint = product.reorder_point || product.min_stock_level || 10

    // Calculate average daily sales
    const salesInfo = salesByProduct.get(productId)
    const daysWithSales = salesInfo?.daysActive.size || 0
    const avgDailySales = daysWithSales > 0
      ? (salesInfo?.totalQty || 0) / 30 // Average over 30 days
      : 0

    // Calculate days until stockout
    const daysUntilStockout = avgDailySales > 0
      ? Math.floor(currentStock / avgDailySales)
      : null

    // Calculate risk factors
    const stockToReorderRatio = currentStock <= 0
      ? 100
      : Math.max(0, (1 - (currentStock / reorderPoint)) * 100)

    const salesVelocityFactor = avgDailySales > 0
      ? Math.min(100, avgDailySales * 5) // Higher velocity = higher risk if stock is low
      : 0

    const stockLevelFactor = currentStock <= 0 ? 100 : Math.max(0, 50 - (currentStock / 2))

    // Calculate weighted risk score
    const riskScore = Math.min(100, Math.round(
      (stockToReorderRatio * STOCKOUT_WEIGHTS.stockToReorderRatio) +
      (salesVelocityFactor * STOCKOUT_WEIGHTS.salesVelocity) +
      (stockLevelFactor * STOCKOUT_WEIGHTS.stockLevel)
    ))

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (riskScore >= RISK_THRESHOLDS.stockout.critical.minScore || (daysUntilStockout !== null && daysUntilStockout <= RISK_THRESHOLDS.stockout.critical.maxDays)) {
      riskLevel = 'critical'
    } else if (riskScore >= RISK_THRESHOLDS.stockout.high.minScore || (daysUntilStockout !== null && daysUntilStockout <= RISK_THRESHOLDS.stockout.high.maxDays)) {
      riskLevel = 'high'
    } else if (riskScore >= RISK_THRESHOLDS.stockout.medium.minScore || (daysUntilStockout !== null && daysUntilStockout <= RISK_THRESHOLDS.stockout.medium.maxDays)) {
      riskLevel = 'medium'
    }

    // Only include items with some risk
    if (riskScore > 0 || currentStock <= 0) {
      scores.push({
        productId,
        productName: product.name,
        sku: product.sku,
        currentStock,
        avgDailySales,
        daysUntilStockout,
        riskScore,
        riskLevel,
        factors: {
          stockToReorderRatio,
          salesVelocityFactor,
          stockLevelFactor,
        },
      })
    }
  })

  return scores.sort((a, b) => b.riskScore - a.riskScore)
}

// ==================== DEAD INVENTORY RISK SCORING ====================

export async function calculateDeadInventoryRiskScores(
  storeId?: string
): Promise<DeadInventoryRiskScore[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get stores
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
  const { data: inventoryData, error: inventoryError } = await supabase
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

  if (inventoryError || !inventoryData) {
    console.error('Error fetching inventory:', inventoryError)
    return []
  }

  // Get latest per product
  const latestInventory = new Map<string, any>()
  inventoryData.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  const productIds = Array.from(latestInventory.keys())

  // Get last sale date for each product
  // First get receipt IDs for these stores
  const { data: receiptsData } = await supabase
    .from('sales_receipts')
    .select('id')
    .in('store_id', storeIds)
    .eq('is_voided', false)

  const receiptIds = (receiptsData as { id: string }[] | null)?.map(r => r.id) || []

  let lastSales: any[] | null = null
  if (productIds.length > 0 && receiptIds.length > 0) {
    const { data, error: salesError } = await supabase
      .from('sale_line_items')
      .select('product_id, created_at')
      .in('receipt_id', receiptIds)
      .order('created_at', { ascending: false })

    if (salesError) {
      console.error('Error fetching sales:', salesError)
    } else {
      // Filter to only include products we're tracking
      lastSales = (data || []).filter((sale: any) => productIds.includes(sale.product_id))
    }
  }

  const lastSaleMap = new Map<string, string>()
  lastSales?.forEach((sale: any) => {
    if (!lastSaleMap.has(sale.product_id)) {
      lastSaleMap.set(sale.product_id, sale.created_at)
    }
  })

  const scores: DeadInventoryRiskScore[] = []
  const now = Date.now()

  latestInventory.forEach((item, productId) => {
    const product = item.products
    const currentStock = item.quantity
    const lastSaleDate = lastSaleMap.get(productId)

    const daysWithoutMovement = lastSaleDate
      ? Math.floor((now - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24))
      : 365 // If never sold, assume 1 year

    const unitCost = item.unit_cost || product.cost_price || 0
    const stockValue = currentStock * unitCost
    const maxStock = product.max_stock_level || currentStock * 2

    // Calculate risk factors
    const timeFactor = Math.min(100, (daysWithoutMovement / 180) * 100)
    const valueFactor = Math.min(100, (stockValue / 1000) * 10) // Higher value = higher risk
    const quantityFactor = currentStock > (maxStock * 0.5)
      ? Math.min(100, (currentStock / maxStock) * 50)
      : 0

    // Calculate weighted risk score
    const riskScore = Math.min(100, Math.round(
      (timeFactor * DEAD_INVENTORY_WEIGHTS.time) +
      (valueFactor * DEAD_INVENTORY_WEIGHTS.value) +
      (quantityFactor * DEAD_INVENTORY_WEIGHTS.quantity)
    ))

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (daysWithoutMovement >= RISK_THRESHOLDS.deadInventory.critical.minDays && riskScore >= RISK_THRESHOLDS.deadInventory.critical.minScore) {
      riskLevel = 'critical'
    } else if (daysWithoutMovement >= RISK_THRESHOLDS.deadInventory.high.minDays && riskScore >= RISK_THRESHOLDS.deadInventory.high.minScore) {
      riskLevel = 'high'
    } else if (daysWithoutMovement >= RISK_THRESHOLDS.deadInventory.medium.minDays && riskScore >= RISK_THRESHOLDS.deadInventory.medium.minScore) {
      riskLevel = 'medium'
    }

    // Only include items with some risk
    if (riskScore >= 20 || daysWithoutMovement >= 60) {
      scores.push({
        productId,
        productName: product.name || 'Unknown',
        sku: product.sku || '',
        currentStock,
        stockValue,
        daysWithoutMovement,
        lastSaleDate: lastSaleDate || null,
        riskScore,
        riskLevel,
        factors: {
          timeFactor,
          valueFactor,
          quantityFactor,
        },
      })
    }
  })

  return scores.sort((a, b) => b.riskScore - a.riskScore)
}

// ==================== SHRINK RISK SCORING ====================

export async function calculateShrinkRiskScores(
  storeId?: string
): Promise<ShrinkRiskScore[]> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get stores
  let storeQuery = supabase
    .from('stores')
    .select('id, name')

  if (storeId) {
    storeQuery = storeQuery.eq('id', storeId)
  } else {
    const { data: memberStoresRaw } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('user_id', user.id)
    const memberStores = memberStoresRaw as { store_id: string }[] | null

    const storeIds = memberStores?.map(s => s.store_id) || []
    if (storeIds.length === 0) {
      return []
    }
    storeQuery = storeQuery.in('id', storeIds)
  }

  const { data: storesRaw, error: storesError } = await storeQuery
  const stores = storesRaw as { id: string; name?: string }[] | null

  if (storesError || !stores || stores.length === 0) {
    return []
  }

  const scores: ShrinkRiskScore[] = []

  // Calculate periods
  const now = new Date()
  const currentPeriodStart = new Date(now)
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 7) // Last 7 days

  const previousPeriodStart = new Date(currentPeriodStart)
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 7)

  for (const store of stores) {
    // Get refunds for both periods
    const { data: refunds } = await supabase
      .from('refund_events')
      .select('refund_amount, created_at')
      .eq('store_id', store.id)
      .gte('created_at', previousPeriodStart.toISOString())

    const currentPeriodRefunds = refunds?.filter(
      (r: any) => new Date(r.created_at) >= currentPeriodStart
    ).length || 0

    const previousPeriodRefunds = refunds?.filter(
      (r: any) => new Date(r.created_at) < currentPeriodStart
    ).length || 0

    // Get voids for both periods
    const { data: voids } = await supabase
      .from('void_events')
      .select('voided_amount, created_at')
      .eq('store_id', store.id)
      .gte('created_at', previousPeriodStart.toISOString())

    const currentPeriodVoids = voids?.filter(
      (v: any) => new Date(v.created_at) >= currentPeriodStart
    ).length || 0

    const previousPeriodVoids = voids?.filter(
      (v: any) => new Date(v.created_at) < currentPeriodStart
    ).length || 0

    // Get discounts from sales receipts
    const { data: receipts } = await supabase
      .from('sales_receipts')
      .select('discount_amount, created_at')
      .eq('store_id', store.id)
      .gte('created_at', previousPeriodStart.toISOString())
      .eq('is_voided', false)

    const currentPeriodDiscounts = receipts?.filter(
      (r: any) => new Date(r.created_at) >= currentPeriodStart && r.discount_amount > 0
    ).length || 0

    const previousPeriodDiscounts = receipts?.filter(
      (r: any) => new Date(r.created_at) < currentPeriodStart && r.discount_amount > 0
    ).length || 0

    // Get inventory adjustments/mismatches
    const { data: adjustments } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity')
      .eq('store_id', store.id)
      .eq('movement_type', 'adjustment')
      .gte('created_at', currentPeriodStart.toISOString())

    const mismatchCount = adjustments?.filter(
      (a: any) => Math.abs(a.quantity) > 5 // Significant adjustments
    ).length || 0

    const totalAdjustments = adjustments?.length || 0

    // Calculate component scores
    const refundChangePercent = previousPeriodRefunds > 0
      ? ((currentPeriodRefunds - previousPeriodRefunds) / previousPeriodRefunds) * 100
      : (currentPeriodRefunds > 0 ? 100 : 0)

    const refundSpikeScore = Math.min(100, Math.max(0,
      refundChangePercent > 0 ? refundChangePercent : 0
    ))

    const voidChangePercent = previousPeriodVoids > 0
      ? ((currentPeriodVoids - previousPeriodVoids) / previousPeriodVoids) * 100
      : (currentPeriodVoids > 0 ? 100 : 0)

    const voidSpikeScore = Math.min(100, Math.max(0,
      voidChangePercent > 0 ? voidChangePercent : 0
    ))

    const discountChangePercent = previousPeriodDiscounts > 0
      ? ((currentPeriodDiscounts - previousPeriodDiscounts) / previousPeriodDiscounts) * 100
      : (currentPeriodDiscounts > 0 ? 100 : 0)

    const discountSpikeScore = Math.min(100, Math.max(0,
      discountChangePercent > 0 ? discountChangePercent * 0.5 : 0
    ))

    const inventoryMismatchScore = Math.min(100, mismatchCount * 20)

    // Calculate overall risk score
    const riskScore = Math.round(
      (refundSpikeScore * SHRINK_WEIGHTS.refundSpike) +
      (voidSpikeScore * SHRINK_WEIGHTS.voidSpike) +
      (discountSpikeScore * SHRINK_WEIGHTS.discountSpike) +
      (inventoryMismatchScore * SHRINK_WEIGHTS.inventoryMismatch)
    )

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (riskScore >= RISK_THRESHOLDS.shrink.critical.minScore) {
      riskLevel = 'critical'
    } else if (riskScore >= RISK_THRESHOLDS.shrink.high.minScore) {
      riskLevel = 'high'
    } else if (riskScore >= RISK_THRESHOLDS.shrink.medium.minScore) {
      riskLevel = 'medium'
    }

    scores.push({
      storeId: store.id,
      storeName: store.name || 'Unknown Store',
      riskScore,
      riskLevel,
      components: {
        refundSpike: {
          score: refundSpikeScore,
          currentPeriodRefunds,
          previousPeriodRefunds,
          changePercent: refundChangePercent,
        },
        voidSpike: {
          score: voidSpikeScore,
          currentPeriodVoids,
          previousPeriodVoids,
          changePercent: voidChangePercent,
        },
        discountSpike: {
          score: discountSpikeScore,
          currentPeriodDiscounts,
          previousPeriodDiscounts,
          changePercent: discountChangePercent,
        },
        inventoryMismatch: {
          score: inventoryMismatchScore,
          mismatchCount,
          totalAdjustments,
        },
      },
    })
  }

  return scores.sort((a, b) => b.riskScore - a.riskScore)
}

// ==================== BATCH RISK CALCULATION ====================

export async function calculateAllRiskScores(storeId?: string) {
  const [stockoutScores, deadInventoryScores, shrinkScores] = await Promise.all([
    calculateStockoutRiskScores(storeId).catch(err => {
      console.error('Stockout risk calculation error:', err)
      return []
    }),
    calculateDeadInventoryRiskScores(storeId).catch(err => {
      console.error('Dead inventory risk calculation error:', err)
      return []
    }),
    calculateShrinkRiskScores(storeId).catch(err => {
      console.error('Shrink risk calculation error:', err)
      return []
    }),
  ])

  return {
    stockout: stockoutScores,
    deadInventory: deadInventoryScores,
    shrink: shrinkScores,
    summary: {
      totalStockoutRisks: stockoutScores.length,
      criticalStockoutRisks: stockoutScores.filter(s => s.riskLevel === 'critical').length,
      highStockoutRisks: stockoutScores.filter(s => s.riskLevel === 'high').length,
      totalDeadInventoryRisks: deadInventoryScores.length,
      criticalDeadInventoryRisks: deadInventoryScores.filter(s => s.riskLevel === 'critical').length,
      highDeadInventoryRisks: deadInventoryScores.filter(s => s.riskLevel === 'high').length,
      totalShrinkRisks: shrinkScores.length,
      criticalShrinkRisks: shrinkScores.filter(s => s.riskLevel === 'critical').length,
      highShrinkRisks: shrinkScores.filter(s => s.riskLevel === 'high').length,
    },
  }
}
