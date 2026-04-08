'use server'

import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

interface StoreMetrics {
  storeId: string
  storeName: string
  date: string
  totalSales: number
  totalTransactions: number
  totalItemsSold: number
  averageTransactionValue: number
  totalRefunds: number
  grossProfit: number
  uniqueCustomers: number
  lowStockItems: number
  outOfStockItems: number
}

interface AlertSummary {
  total: number
  critical: number
  warning: number
  info: number
  byType: Record<string, number>
}

interface RecommendationSummary {
  total: number
  high: number
  medium: number
  low: number
  byType: Record<string, number>
}

// ==================== AI DAILY BRIEF GENERATION ====================

export async function generateDailyBrief(
  storeId: string,
  locationId?: string
): Promise<{
  success: boolean
  briefId?: string
  error?: string
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Gather yesterday's data
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Get store info
    const { data: storeRaw } = await supabase
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single()
    const store = storeRaw as { name?: string } | null

    // Get yesterday's metrics
    const { data: metricsRaw } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('store_id', storeId)
      .eq('metric_date', yesterdayStr)
      .maybeSingle()
    const metrics = metricsRaw as { total_sales?: number; total_transactions?: number; total_items_sold?: number; average_transaction_value?: number; gross_profit?: number; total_refunds?: number; unique_customers?: number; low_stock_items?: number; out_of_stock_items?: number } | null

    // Get comparison with day before
    const dayBefore = new Date(yesterday)
    dayBefore.setDate(dayBefore.getDate() - 1)
    const dayBeforeStr = dayBefore.toISOString().split('T')[0]

    const { data: previousMetricsRaw } = await supabase
      .from('daily_metrics')
      .select('total_sales, total_transactions')
      .eq('store_id', storeId)
      .eq('metric_date', dayBeforeStr)
      .maybeSingle()
    const previousMetrics = previousMetricsRaw as { total_sales?: number; total_transactions?: number } | null

    // Get active alerts
    const { data: alertsRaw } = await supabase
      .from('alerts')
      .select('severity, alert_type, title')
      .eq('store_id', storeId)
      .is('dismissed_at', null)
      .order('severity', { ascending: false })
      .limit(10)
    const alerts = alertsRaw as { severity?: string; alert_type?: string; title?: string }[] | null

    // Get pending recommendations
    const { data: recommendationsRaw } = await supabase
      .from('recommendations')
      .select('recommendation_type, priority, title')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(10)
    const recommendations = recommendationsRaw as { recommendation_type?: string; priority?: number; title?: string }[] | null

    // Calculate insights
    const prevSales = previousMetrics?.total_sales
    const salesChange = prevSales
      ? ((metrics?.total_sales || 0) - prevSales) / (prevSales || 1) * 100
      : 0

    // Build structured input for the brief
    const structuredData = {
      store: store?.name || 'Your Store',
      date: yesterdayStr,
      performance: {
        sales: {
          amount: metrics?.total_sales || 0,
          changePercent: salesChange,
          transactions: metrics?.total_transactions || 0,
          itemsSold: metrics?.total_items_sold || 0,
          avgTransaction: metrics?.average_transaction_value || 0,
        },
        profit: {
          grossProfit: metrics?.gross_profit || 0,
          refunds: metrics?.total_refunds || 0,
        },
        customers: {
          unique: metrics?.unique_customers || 0,
        },
        inventory: {
          lowStock: metrics?.low_stock_items || 0,
          outOfStock: metrics?.out_of_stock_items || 0,
        },
      },
      alerts: alerts?.map(a => ({
        severity: a.severity,
        type: a.alert_type,
        title: a.title,
      })) || [],
      recommendations: recommendations?.map(r => ({
        type: r.recommendation_type,
        priority: r.priority,
        title: r.title,
      })) || [],
    }

    // Generate the brief content (rule-based for business logic)
    const briefContent = generateBriefContent(structuredData)

    // Store in ai_briefs table
    const { data: briefRaw, error } = await supabase
      .from('ai_briefs')
      .insert({
        store_id: storeId,
        location_id: locationId || null,
        brief_type: 'daily',
        period_start: yesterdayStr,
        period_end: yesterdayStr,
        summary: briefContent.summary,
        key_highlights: briefContent.highlights,
        concerns: briefContent.concerns,
        opportunities: briefContent.opportunities,
        action_items: briefContent.actionItems,
        performance_metrics: structuredData.performance,
        comparison_period_metrics: previousMetrics || {},
        ai_model_version: 'rule-based-1.0',
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as any)
      .select('id')
      .single()
    const brief = briefRaw as { id: string } | null

    if (error) {
      console.error('Error saving brief:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')

    return { success: true, briefId: brief?.id }
  } catch (err) {
    console.error('Error generating brief:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Rule-based brief generation (no AI for business logic)
function generateBriefContent(data: any) {
  const { performance, alerts, recommendations } = data
  const highlights: string[] = []
  const concerns: string[] = []
  const opportunities: string[] = []
  const actionItems: string[] = []

  // Yesterday summary
  let summary = `Yesterday was ${performance.sales.changePercent > 0 ? 'stronger' : performance.sales.changePercent < 0 ? 'softer' : 'steady'} than the day before.`

  if (performance.sales.amount > 0) {
    highlights.push(
      `Sales reached $${performance.sales.amount.toFixed(0)} across ${performance.sales.transactions} transactions`
    )
    if (performance.customers.unique > 0) {
      highlights.push(`${performance.customers.unique} unique customers visited`)
    }
  }

  // Sales trend analysis
  if (performance.sales.changePercent > 10) {
    highlights.push(`Sales up ${performance.sales.changePercent.toFixed(1)}% vs previous day`)
  } else if (performance.sales.changePercent < -10) {
    concerns.push(`Sales down ${Math.abs(performance.sales.changePercent).toFixed(1)}% vs previous day`)
  }

  // Transaction value
  if (performance.sales.avgTransaction > 50) {
    highlights.push(`Strong average transaction value at $${performance.sales.avgTransaction.toFixed(2)}`)
  }

  // Refund concerns
  if (performance.profit.refunds > 0) {
    concerns.push(`$${performance.profit.refunds.toFixed(2)} in refunds processed`)
  }

  // Inventory concerns
  if (performance.inventory.outOfStock > 0) {
    concerns.push(`${performance.inventory.outOfStock} items currently out of stock`)
    actionItems.push('Review and reorder out-of-stock items')
  }
  if (performance.inventory.lowStock > 0) {
    concerns.push(`${performance.inventory.lowStock} items running low on stock`)
    if (performance.inventory.lowStock <= 5) {
      actionItems.push('Reorder low-stock items before they run out')
    } else {
      actionItems.push('Prioritize reordering based on sales velocity')
    }
  }

  // Alerts analysis
  const criticalAlerts = alerts.filter((a: any) => a.severity === 'critical')
  const warningAlerts = alerts.filter((a: any) => a.severity === 'warning')

  if (criticalAlerts.length > 0) {
    concerns.push(`${criticalAlerts.length} critical alerts requiring immediate attention`)
    criticalAlerts.slice(0, 3).forEach((alert: any) => {
      actionItems.push(`Address: ${alert.title}`)
    })
  }

  if (warningAlerts.length > 0) {
    concerns.push(`${warningAlerts.length} warnings to review`)
  }

  // Recommendations
  const highPriorityRecs = recommendations.filter((r: any) => r.priority <= 2)
  if (highPriorityRecs.length > 0) {
    opportunities.push(`${highPriorityRecs.length} high-priority recommendations available`)
    highPriorityRecs.slice(0, 3).forEach((rec: any) => {
      actionItems.push(`Consider: ${rec.title}`)
    })
  }

  // Default action if none generated
  if (actionItems.length === 0) {
    actionItems.push('Review daily performance metrics')
    actionItems.push('Check inventory levels for upcoming week')
  }

  return {
    summary,
    highlights,
    concerns,
    opportunities,
    actionItems,
  }
}

// ==================== GET LATEST BRIEF ====================

export async function getLatestBrief(
  storeId?: string,
  briefType: 'daily' | 'weekly' | 'monthly' = 'daily'
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let query = supabase
    .from('ai_briefs')
    .select('*')
    .eq('brief_type', briefType)
    .order('generated_at', { ascending: false })
    .limit(1)

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

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('Error fetching brief:', error)
    return null
  }

  return data
}

// ==================== GENERATE BRIEF FOR ALL STORES ====================

export async function generateBriefsForAllStores(): Promise<{
  success: boolean
  message: string
  details: {
    storesProcessed: number
    briefsCreated: number
    errors: number
  }
}> {
  const supabase = await createServiceClient()

  const { data: storesRaw, error } = await supabase
    .from('stores')
    .select('id, name')
    .limit(100)

  if (error || !storesRaw) {
    return {
      success: false,
      message: `Failed to fetch stores: ${error?.message}`,
      details: { storesProcessed: 0, briefsCreated: 0, errors: 0 },
    }
  }

  const stores = storesRaw as { id: string; name?: string }[]
  let briefsCreated = 0
  let errors = 0

  for (const store of stores) {
    try {
      const result = await generateDailyBrief(store.id)
      if (result.success) {
        briefsCreated++
      } else {
        errors++
      }
    } catch (err) {
      console.error(`Error generating brief for store ${store.id}:`, err)
      errors++
    }
  }

  return {
    success: true,
    message: `Generated ${briefsCreated} briefs for ${stores.length} stores`,
    details: {
      storesProcessed: stores.length,
      briefsCreated,
      errors,
    },
  }
}

// ==================== MARK BRIEF AS READ ====================

export async function markBriefAsRead(briefId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Get current viewed_by array
  const { data: briefRaw } = await supabase
    .from('ai_briefs')
    .select('viewed_by')
    .eq('id', briefId)
    .single()
  const brief = briefRaw as { viewed_by?: string[] } | null

  const viewedBy = new Set(brief?.viewed_by || [])
  viewedBy.add(user.id)

  await (supabase
    .from('ai_briefs') as any)
    .update({
      viewed_by: Array.from(viewedBy),
      updated_at: new Date().toISOString(),
    })
    .eq('id', briefId)
}
