'use server'

import { createServerSupabaseClient } from '@/lib/supabase'

interface QueryResult {
  answer: string
  metrics: { label: string; value: string }[]
  query: {
    intent: string
    parameters: Record<string, any>
  }
}

// Pattern matching for different query types
const QUERY_PATTERNS = {
  salesYesterday: /sales.*yesterday|yesterday.*sales/i,
  salesHurt: /what.*hurt.*sales|sales.*hurt|why.*sales.*down/i,
  stockout: /run.*out|stock.*out|out.*of.*stock|about.*to.*run.*out|low.*stock/i,
  categorySlow: /category.*slow|slow.*category|which.*category/i,
  shiftRefunds: /shift.*refund|refund.*shift|which.*shift.*refund/i,
  topSelling: /top.*selling|best.*selling|most.*popular/i,
  lowPerforming: /low.*perform|worst.*perform|not.*selling/i,
  inventory: /inventory.*level|stock.*level|how.*much.*stock/i,
}

// Main query handler
export async function processStoreQuestion(
  question: string,
  storeId?: string
): Promise<QueryResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      answer: 'Please log in to access store data.',
      metrics: [],
      query: { intent: 'error', parameters: {} },
    }
  }

  // Get stores user has access to
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
    return {
      answer: 'No stores found. Please create a store first.',
      metrics: [],
      query: { intent: 'no_stores', parameters: {} },
    }
  }

  const targetStoreId = storeIds[0]

  // Determine intent
  if (QUERY_PATTERNS.salesHurt.test(question) || QUERY_PATTERNS.salesYesterday.test(question)) {
    return await getSalesAnalysis(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.stockout.test(question)) {
    return await getStockoutRisk(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.categorySlow.test(question)) {
    return await getCategoryPerformance(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.shiftRefunds.test(question)) {
    return await getShiftRefunds(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.topSelling.test(question)) {
    return await getTopSelling(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.lowPerforming.test(question)) {
    return await getLowPerforming(targetStoreId, supabase)
  }

  if (QUERY_PATTERNS.inventory.test(question)) {
    return await getInventoryLevels(targetStoreId, supabase)
  }

  // Default response
  return {
    answer: 'I can help you with questions about:\n\n• Sales performance and what hurt sales\n• Items about to run out of stock\n• Category performance\n• Shift-level refund analysis\n• Top and low performing items\n\nTry asking one of these questions.',
    metrics: [],
    query: { intent: 'unknown', parameters: { question } },
  }
}

// ==================== QUERY HANDLERS ====================

async function getSalesAnalysis(storeId: string, supabase: any): Promise<QueryResult> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const dayBefore = new Date(yesterday)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayBeforeStr = dayBefore.toISOString().split('T')[0]

  // Get yesterday's metrics
  const { data: metrics } = await supabase
    .from('daily_metrics')
    .select('*')
    .eq('store_id', storeId)
    .eq('metric_date', yesterdayStr)
    .maybeSingle()

  // Get previous day for comparison
  const { data: prevMetrics } = await supabase
    .from('daily_metrics')
    .select('total_sales, total_transactions')
    .eq('store_id', storeId)
    .eq('metric_date', dayBeforeStr)
    .maybeSingle()

  // Get refunds and voids
  const { data: refunds } = await supabase
    .from('refund_events')
    .select('refund_amount')
    .eq('store_id', storeId)
    .gte('created_at', yesterday.toISOString())

  const { data: voids } = await supabase
    .from('void_events')
    .select('voided_amount')
    .eq('store_id', storeId)
    .gte('created_at', yesterday.toISOString())

  // Get low stock items that may have impacted sales
  const { data: lowStock } = await supabase
    .from('daily_metrics')
    .select('out_of_stock_items')
    .eq('store_id', storeId)
    .eq('metric_date', yesterdayStr)
    .maybeSingle()

  const totalRefunds = refunds?.reduce((sum: number, r: any) => sum + r.refund_amount, 0) || 0
  const totalVoids = voids?.reduce((sum: number, v: any) => sum + (v.voided_amount || 0), 0) || 0
  const salesChange = prevMetrics
    ? ((metrics?.total_sales || 0) - prevMetrics.total_sales) / (prevMetrics.total_sales || 1) * 100
    : 0

  let answer = ''
  const factors: string[] = []

  if (salesChange < -10) {
    answer = 'Sales were down significantly yesterday.'
  } else if (salesChange > 10) {
    answer = 'Sales were up yesterday compared to the day before.'
  } else {
    answer = 'Sales were relatively stable yesterday.'
  }

  // Identify factors
  if (totalRefunds > 100) {
    factors.push(`$${totalRefunds.toFixed(0)} in refunds`)
  }
  if (totalVoids > 100) {
    factors.push(`$${totalVoids.toFixed(0)} in voided transactions`)
  }
  if (lowStock?.out_of_stock_items > 0) {
    factors.push(`${lowStock.out_of_stock_items} out-of-stock items`)
  }

  if (factors.length > 0) {
    answer += ` Contributing factors: ${factors.join(', ')}.`
  }

  return {
    answer,
    metrics: [
      { label: 'Total Sales', value: `$${(metrics?.total_sales || 0).toFixed(0)}` },
      { label: 'Change vs Previous Day', value: `${salesChange > 0 ? '+' : ''}${salesChange.toFixed(1)}%` },
      { label: 'Transactions', value: `${metrics?.total_transactions || 0}` },
      { label: 'Refunds', value: `$${totalRefunds.toFixed(0)}` },
      { label: 'Voids', value: `$${totalVoids.toFixed(0)}` },
      { label: 'Out of Stock Items', value: `${lowStock?.out_of_stock_items || 0}` },
    ],
    query: { intent: 'sales_analysis', parameters: { date: yesterdayStr } },
  }
}

async function getStockoutRisk(storeId: string, supabase: any): Promise<QueryResult> {
  // Get inventory data
  const { data: inventory } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      products!inner(name, sku, reorder_point)
    `)
    .eq('store_id', storeId)
    .order('snapshot_date', { ascending: false })
    .limit(100)

  if (!inventory || inventory.length === 0) {
    return {
      answer: 'No inventory data available.',
      metrics: [],
      query: { intent: 'stockout_risk', parameters: {} },
    }
  }

  // Get latest per product
  const latestInventory = new Map<string, any>()
  inventory.forEach((item: any) => {
    if (!latestInventory.has(item.product_id)) {
      latestInventory.set(item.product_id, item)
    }
  })

  // Find at-risk items
  const atRisk: { name: string; quantity: number; reorderPoint: number }[] = []

  latestInventory.forEach((item) => {
    const reorderPoint = item.products.reorder_point || 10
    if (item.quantity <= reorderPoint * 1.5) {
      atRisk.push({
        name: item.products.name,
        quantity: item.quantity,
        reorderPoint,
      })
    }
  })

  const criticalCount = atRisk.filter(i => i.quantity <= (i.reorderPoint || 10)).length

  let answer = ''
  if (atRisk.length === 0) {
    answer = 'All items have healthy stock levels.'
  } else if (criticalCount > 0) {
    answer = `${criticalCount} items are at critical stock levels and need immediate reordering.`
  } else {
    answer = `${atRisk.length} items are approaching reorder points.`
  }

  return {
    answer,
    metrics: [
      { label: 'Items at Risk', value: `${atRisk.length}` },
      { label: 'Critical', value: `${criticalCount}` },
      ...atRisk.slice(0, 5).map(i => ({
        label: i.name,
        value: `${i.quantity} left`,
      })),
    ],
    query: { intent: 'stockout_risk', parameters: { atRiskCount: atRisk.length } },
  }
}

async function getCategoryPerformance(storeId: string, supabase: any): Promise<QueryResult> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get categories
  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('store_id', storeId)
    .eq('is_active', true) as { data: { id: string; name?: string }[] | null }

  if (!categories || categories.length === 0) {
    return {
      answer: 'No category data available.',
      metrics: [],
      query: { intent: 'category_performance', parameters: {} },
    }
  }

  // Get products in categories
  const { data: products } = await supabase
    .from('products')
    .select('id, category_id')
    .eq('store_id', storeId)
    .in('category_id', categories.map(c => c.id)) as { data: { id: string; category_id?: string }[] | null }

  const productCategoryMap = new Map<string, string>()
  products?.forEach((p) => {
    if (p.category_id) {
      productCategoryMap.set(p.id, p.category_id)
    }
  })

  // Get sales data
  const productIds = products?.map(p => p.id) || []
  const { data: sales } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, total_amount')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // Aggregate by category
  const categoryStats = new Map<string, { revenue: number; items: number; name: string }>()

  sales?.forEach((sale: any) => {
    const categoryId = productCategoryMap.get(sale.product_id)
    if (categoryId) {
      const existing = categoryStats.get(categoryId) || { revenue: 0, items: 0, name: '' }
      existing.revenue += sale.total_amount
      existing.items += sale.quantity
      categoryStats.set(categoryId, existing)
    }
  })

  // Add category names
  categories.forEach((c: any) => {
    const stats = categoryStats.get(c.id)
    if (stats) {
      stats.name = c.name
    }
  })

  const sorted = Array.from(categoryStats.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)

  if (sorted.length === 0) {
    return {
      answer: 'No category sales data available for the last 30 days.',
      metrics: [],
      query: { intent: 'category_performance', parameters: {} },
    }
  }

  const topCategory = sorted[0][1]
  const bottomCategory = sorted[sorted.length - 1][1]

  return {
    answer: `${topCategory.name} is your top performing category with $${topCategory.revenue.toFixed(0)} in sales. ${bottomCategory.name} is the slowest with $${bottomCategory.revenue.toFixed(0)}.`,
    metrics: sorted.slice(0, 5).map(([_, stats]) => ({
      label: stats.name,
      value: `$${stats.revenue.toFixed(0)} (${stats.items} items)`,
    })),
    query: { intent: 'category_performance', parameters: { categoryCount: sorted.length } },
  }
}

async function getShiftRefunds(storeId: string, supabase: any): Promise<QueryResult> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  // Get refunds by hour
  const { data: refunds } = await supabase
    .from('refund_events')
    .select('created_at, refund_amount')
    .eq('store_id', storeId)
    .gte('created_at', yesterday.toISOString())

  if (!refunds || refunds.length === 0) {
    return {
      answer: 'No refunds recorded in the last 24 hours.',
      metrics: [],
      query: { intent: 'shift_refunds', parameters: {} },
    }
  }

  // Group by hour
  const byHour = new Map<number, { count: number; amount: number }>()

  refunds.forEach((r: any) => {
    const hour = new Date(r.created_at).getHours()
    const existing = byHour.get(hour) || { count: 0, amount: 0 }
    existing.count++
    existing.amount += r.refund_amount
    byHour.set(hour, existing)
  })

  // Find peak refund hours
  const sorted = Array.from(byHour.entries())
    .sort((a, b) => b[1].count - a[1].count)

  const peakHour = sorted[0]
  const totalRefunds = refunds.length
  const totalAmount = refunds.reduce((sum: number, r: any) => sum + r.refund_amount, 0)

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour} ${ampm}`
  }

  return {
    answer: `Most refunds occurred around ${formatHour(peakHour[0])} (${peakHour[1].count} refunds). Total refunds: $${totalAmount.toFixed(0)}.`,
    metrics: [
      { label: 'Total Refunds', value: `${totalRefunds}` },
      { label: 'Total Amount', value: `$${totalAmount.toFixed(0)}` },
      { label: 'Peak Hour', value: formatHour(peakHour[0]) },
      { label: 'Peak Hour Refunds', value: `${peakHour[1].count}` },
      ...sorted.slice(0, 5).map(([hour, stats]) => ({
        label: `${formatHour(hour)}`,
        value: `${stats.count} ($${stats.amount.toFixed(0)})`,
      })),
    ],
    query: { intent: 'shift_refunds', parameters: { totalRefunds } },
  }
}

async function getTopSelling(storeId: string, supabase: any): Promise<QueryResult> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: sales } = await supabase
    .from('sale_line_items')
    .select('product_name, product_sku, quantity, total_amount')
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (!sales || sales.length === 0) {
    return {
      answer: 'No sales data available for the last 30 days.',
      metrics: [],
      query: { intent: 'top_selling', parameters: {} },
    }
  }

  // Aggregate by product
  const byProduct = new Map<string, { name: string; sku: string; qty: number; revenue: number }>()

  sales.forEach((s: any) => {
    const key = s.product_sku || s.product_name
    const existing = byProduct.get(key) || { name: s.product_name, sku: s.product_sku, qty: 0, revenue: 0 }
    existing.qty += s.quantity
    existing.revenue += s.total_amount
    byProduct.set(key, existing)
  })

  const sorted = Array.from(byProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    answer: `${sorted[0].name} is your top seller with ${sorted[0].qty} units sold and $${sorted[0].revenue.toFixed(0)} in revenue.`,
    metrics: sorted.map(s => ({
      label: s.name,
      value: `${s.qty} sold • $${s.revenue.toFixed(0)}`,
    })),
    query: { intent: 'top_selling', parameters: { itemCount: sorted.length } },
  }
}

async function getLowPerforming(storeId: string, supabase: any): Promise<QueryResult> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Get active products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('store_id', storeId)
    .eq('is_active', true) as { data: { id: string; name?: string; sku?: string }[] | null }

  if (!products || products.length === 0) {
    return {
      answer: 'No products found.',
      metrics: [],
      query: { intent: 'low_performing', parameters: {} },
    }
  }

  const productIds = products.map(p => p.id)

  // Get sales data
  const { data: sales } = await supabase
    .from('sale_line_items')
    .select('product_id, quantity, total_amount, created_at')
    .in('product_id', productIds)
    .gte('created_at', thirtyDaysAgo.toISOString())

  const salesMap = new Map<string, { qty: number; revenue: number; lastSale: Date | null }>()

  products.forEach(p => {
    salesMap.set(p.id, { qty: 0, revenue: 0, lastSale: null })
  })

  sales?.forEach((s: any) => {
    const existing = salesMap.get(s.product_id)
    if (existing) {
      existing.qty += s.quantity
      existing.revenue += s.total_amount
      const saleDate = new Date(s.created_at)
      if (!existing.lastSale || saleDate > existing.lastSale) {
        existing.lastSale = saleDate
      }
    }
  })

  // Build results
  const now = Date.now()
  const results = products.map(p => {
    const stats = salesMap.get(p.id)
    const daysSinceSale = stats?.lastSale
      ? Math.floor((now - stats.lastSale.getTime()) / (1000 * 60 * 60 * 24))
      : 30

    return {
      name: p.name,
      qty: stats?.qty || 0,
      revenue: stats?.revenue || 0,
      daysSinceSale,
    }
  }).sort((a, b) => a.revenue - b.revenue)
    .slice(0, 5)

  const worst = results[0]

  return {
    answer: worst.qty === 0
      ? `${worst.name} has had no sales in the last 30 days.`
      : `${worst.name} is your lowest performer with only ${worst.qty} units sold and $${worst.revenue.toFixed(0)} in revenue.`,
    metrics: results.map(r => ({
      label: r.name || 'Unknown',
      value: r.qty === 0
        ? 'No sales'
        : `${r.qty} sold • $${r.revenue.toFixed(0)}`,
    })),
    query: { intent: 'low_performing', parameters: { itemCount: results.length } },
  }
}

async function getInventoryLevels(storeId: string, supabase: any): Promise<QueryResult> {
  const { data: inventory } = await supabase
    .from('inventory_snapshots')
    .select(`
      product_id,
      quantity,
      total_value,
      products!inner(name)
    `)
    .eq('store_id', storeId)
    .order('snapshot_date', { ascending: false })
    .limit(100)

  if (!inventory || inventory.length === 0) {
    return {
      answer: 'No inventory data available.',
      metrics: [],
      query: { intent: 'inventory_levels', parameters: {} },
    }
  }

  // Get latest per product
  const latest = new Map<string, any>()
  let totalValue = 0
  let totalItems = 0

  inventory.forEach((item: any) => {
    if (!latest.has(item.product_id)) {
      latest.set(item.product_id, item)
      totalValue += item.total_value || 0
      totalItems += item.quantity || 0
    }
  })

  return {
    answer: `Current inventory: ${latest.size} products with ${totalItems} total units and $${totalValue.toFixed(0)} in value.`,
    metrics: [
      { label: 'Total Products', value: `${latest.size}` },
      { label: 'Total Units', value: `${totalItems}` },
      { label: 'Inventory Value', value: `$${totalValue.toFixed(0)}` },
    ],
    query: { intent: 'inventory_levels', parameters: { productCount: latest.size, totalValue } },
  }
}

// ==================== QUERY HISTORY ====================

export async function saveQueryHistory(
  storeId: string,
  question: string,
  intent: string,
  response: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await (supabase
    .from('chat_queries') as any)
    .insert({
      store_id: storeId,
      user_id: user.id,
      query_text: question,
      response_text: response,
      query_type: getQueryType(intent),
      intent_classification: intent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
}

function getQueryType(intent: string): string {
  const typeMap: Record<string, string> = {
    sales_analysis: 'sales',
    stockout_risk: 'inventory',
    category_performance: 'analytics',
    shift_refunds: 'sales',
    top_selling: 'sales',
    low_performing: 'sales',
    inventory_levels: 'inventory',
  }
  return typeMap[intent] || 'general'
}

// ==================== EXAMPLE QUESTIONS ====================

export const EXAMPLE_QUESTIONS = [
  'What hurt sales yesterday?',
  'Which items are about to run out?',
  'Which categories slowed this week?',
  'Which shifts had the most refunds?',
  'What are my top selling items?',
  'Which items are not selling well?',
  'How is my inventory looking?',
  'What were sales like yesterday?',
]
