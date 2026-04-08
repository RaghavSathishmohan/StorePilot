'use server'

import { createServiceClient, createServerSupabaseClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import {
  calculateAllRiskScores,
} from './risk-scoring'
import type {
  StockoutRiskScore,
  DeadInventoryRiskScore,
  ShrinkRiskScore,
} from '@/types/risk-scoring'
import { RISK_THRESHOLDS } from '@/types/risk-scoring'

// Alert types mapping to database alert_type enum
const ALERT_TYPES = {
  STOCKOUT_RISK: 'low_stock',
  DEAD_INVENTORY: 'slow_moving',
  SHRINK_REFUND: 'inventory_discrepancy',
  SHRINK_VOID: 'inventory_discrepancy',
  SHRINK_DISCOUNT: 'inventory_discrepancy',
  SHRINK_MISMATCH: 'inventory_discrepancy',
} as const

// Severity mapping
function getAlertSeverity(riskLevel: string): 'info' | 'warning' | 'critical' {
  switch (riskLevel) {
    case 'critical':
      return 'critical'
    case 'high':
      return 'critical'
    case 'medium':
      return 'warning'
    default:
      return 'info'
  }
}

interface AlertToCreate {
  storeId: string
  locationId?: string
  alertType: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  relatedEntityType: string
  relatedEntityId: string
  metadata: Record<string, any>
}

// ==================== ALERT GENERATION ====================

export async function generateStockoutAlerts(
  scores: StockoutRiskScore[],
  storeId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient()
  let createdCount = 0

  // Only create alerts for medium risk and above
  const alertsToCreate: AlertToCreate[] = scores
    .filter(score => score.riskLevel === 'critical' || score.riskLevel === 'high')
    .map(score => ({
      storeId,
      alertType: ALERT_TYPES.STOCKOUT_RISK,
      severity: getAlertSeverity(score.riskLevel),
      title: `Stockout Risk: ${score.productName}`,
      description: generateStockoutDescription(score),
      relatedEntityType: 'product',
      relatedEntityId: score.productId,
      metadata: {
        riskScore: score.riskScore,
        riskLevel: score.riskLevel,
        currentStock: score.currentStock,
        avgDailySales: score.avgDailySales,
        daysUntilStockout: score.daysUntilStockout,
        factors: score.factors,
        alertCategory: 'stockout_risk',
      },
    }))

  for (const alertData of alertsToCreate) {
    const created = await createOrUpdateAlert(alertData)
    if (created) createdCount++
  }

  return createdCount
}

export async function generateDeadInventoryAlerts(
  scores: DeadInventoryRiskScore[],
  storeId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient()
  let createdCount = 0

  const alertsToCreate: AlertToCreate[] = scores
    .filter(score => score.riskLevel === 'critical' || score.riskLevel === 'high')
    .map(score => ({
      storeId,
      alertType: ALERT_TYPES.DEAD_INVENTORY,
      severity: getAlertSeverity(score.riskLevel),
      title: `Dead Inventory: ${score.productName}`,
      description: generateDeadInventoryDescription(score),
      relatedEntityType: 'product',
      relatedEntityId: score.productId,
      metadata: {
        riskScore: score.riskScore,
        riskLevel: score.riskLevel,
        currentStock: score.currentStock,
        stockValue: score.stockValue,
        daysWithoutMovement: score.daysWithoutMovement,
        lastSaleDate: score.lastSaleDate,
        factors: score.factors,
        alertCategory: 'dead_inventory_risk',
      },
    }))

  for (const alertData of alertsToCreate) {
    const created = await createOrUpdateAlert(alertData)
    if (created) createdCount++
  }

  return createdCount
}

export async function generateShrinkAlerts(
  scores: ShrinkRiskScore[],
  storeId: string
): Promise<number> {
  const supabase = await createServerSupabaseClient()
  let createdCount = 0

  for (const score of scores) {
    if (score.riskLevel === 'low') continue

    const severity = getAlertSeverity(score.riskLevel)

    // Create individual alerts for each shrink component
    const components = [
      {
        key: 'refundSpike',
        name: 'Refund Spike',
        threshold: 50,
        data: score.components.refundSpike,
      },
      {
        key: 'voidSpike',
        name: 'Void Spike',
        threshold: 50,
        data: score.components.voidSpike,
      },
      {
        key: 'discountSpike',
        name: 'Discount Spike',
        threshold: 50,
        data: score.components.discountSpike,
      },
      {
        key: 'inventoryMismatch',
        name: 'Inventory Mismatch',
        threshold: 40,
        data: score.components.inventoryMismatch,
      },
    ]

    for (const component of components) {
      if (component.data.score >= component.threshold) {
        const alertData: AlertToCreate = {
          storeId,
          alertType: ALERT_TYPES.SHRINK_REFUND,
          severity,
          title: `Shrink Risk: ${component.name}`,
          description: generateShrinkDescription(component.name, component.data, score.storeName),
          relatedEntityType: 'store',
          relatedEntityId: storeId,
          metadata: {
            riskScore: score.riskScore,
            riskLevel: score.riskLevel,
            component: component.key,
            componentScore: component.data.score,
            details: component.data,
            alertCategory: 'shrink_risk',
          },
        }

        const created = await createOrUpdateAlert(alertData)
        if (created) createdCount++
      }
    }
  }

  return createdCount
}

// ==================== ALERT CRUD OPERATIONS ====================

async function createOrUpdateAlert(alertData: AlertToCreate): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  // Check for existing active alert for same entity and category
  const { data: existingAlerts } = await supabase
    .from('alerts')
    .select('id, severity, metadata, created_at')
    .eq('store_id', alertData.storeId)
    .eq('related_entity_type', alertData.relatedEntityType)
    .eq('related_entity_id', alertData.relatedEntityId)
    .eq('alert_type', alertData.alertType)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)

  const existingAlertRaw = existingAlerts?.[0]
  const existingAlert = existingAlertRaw as { id: string; severity?: string; metadata?: { alertCategory?: string; riskScore?: number }; created_at?: string } | undefined

  if (existingAlert) {
    // Check if this is the same alert category in metadata
    const existingCategory = existingAlert.metadata?.alertCategory
    const newCategory = alertData.metadata.alertCategory

    if (existingCategory === newCategory) {
      // Update existing alert with new risk score if changed
      const existingScore = existingAlert.metadata?.riskScore || 0
      const newScore = alertData.metadata.riskScore

      if (existingScore !== newScore || existingAlert.severity !== alertData.severity) {
        await (supabase
          .from('alerts') as any)
          .update({
            severity: alertData.severity,
            description: alertData.description,
            metadata: {
              ...existingAlert.metadata,
              ...alertData.metadata,
              updated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAlert.id)

        return false // Updated, not created
      }

      // No change, don't update
      return false
    }
  }

  // Create new alert
  const { error } = await supabase
    .from('alerts')
    .insert({
      store_id: alertData.storeId,
      location_id: alertData.locationId || null,
      alert_type: alertData.alertType,
      severity: alertData.severity,
      title: alertData.title,
      description: alertData.description,
      related_entity_type: alertData.relatedEntityType,
      related_entity_id: alertData.relatedEntityId,
      is_read: false,
      metadata: alertData.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

  if (error) {
    console.error('Error creating alert:', error)
    return false
  }

  return true
}

// ==================== DESCRIPTION GENERATORS ====================

function generateStockoutDescription(score: StockoutRiskScore): string {
  const parts: string[] = []

  parts.push(`Risk Score: ${score.riskScore}/100 (${score.riskLevel.toUpperCase()})`)
  parts.push(`Current stock: ${score.currentStock} units`)

  if (score.avgDailySales > 0) {
    parts.push(`Average daily sales: ${score.avgDailySales.toFixed(1)} units`)
  }

  if (score.daysUntilStockout !== null) {
    parts.push(`Estimated days until stockout: ${score.daysUntilStockout}`)
  } else {
    parts.push('No recent sales data available')
  }

  // Add factor breakdown
  parts.push(`\nRisk Factors:`)
  parts.push(`• Stock/Reorder Ratio: ${score.factors.stockToReorderRatio.toFixed(0)}%`)
  parts.push(`• Sales Velocity: ${score.factors.salesVelocityFactor.toFixed(0)}%`)
  parts.push(`• Stock Level: ${score.factors.stockLevelFactor.toFixed(0)}%`)

  return parts.join('\n')
}

function generateDeadInventoryDescription(score: DeadInventoryRiskScore): string {
  const parts: string[] = []

  parts.push(`Risk Score: ${score.riskScore}/100 (${score.riskLevel.toUpperCase()})`)
  parts.push(`Days without sales: ${score.daysWithoutMovement}`)
  parts.push(`Current stock: ${score.currentStock} units`)
  parts.push(`Stock value: $${score.stockValue.toFixed(2)}`)

  if (score.lastSaleDate) {
    const date = new Date(score.lastSaleDate).toLocaleDateString()
    parts.push(`Last sale: ${date}`)
  } else {
    parts.push('No sales recorded')
  }

  // Add factor breakdown
  parts.push(`\nRisk Factors:`)
  parts.push(`• Time Factor: ${score.factors.timeFactor.toFixed(0)}%`)
  parts.push(`• Value Factor: ${score.factors.valueFactor.toFixed(0)}%`)
  parts.push(`• Quantity Factor: ${score.factors.quantityFactor.toFixed(0)}%`)

  return parts.join('\n')
}

function generateShrinkDescription(
  componentName: string,
  data: any,
  storeName: string
): string {
  const parts: string[] = []

  parts.push(`Shrink Risk Detected: ${componentName}`)
  parts.push(`Store: ${storeName}`)
  parts.push(`Component Risk Score: ${data.score}/100`)

  if ('currentPeriodRefunds' in data) {
    parts.push(`Current period refunds: ${data.currentPeriodRefunds}`)
    parts.push(`Previous period refunds: ${data.previousPeriodRefunds}`)
    parts.push(`Change: ${data.changePercent.toFixed(1)}%`)
  }

  if ('currentPeriodVoids' in data) {
    parts.push(`Current period voids: ${data.currentPeriodVoids}`)
    parts.push(`Previous period voids: ${data.previousPeriodVoids}`)
    parts.push(`Change: ${data.changePercent.toFixed(1)}%`)
  }

  if ('currentPeriodDiscounts' in data) {
    parts.push(`Current period discount transactions: ${data.currentPeriodDiscounts}`)
    parts.push(`Previous period: ${data.previousPeriodDiscounts}`)
    parts.push(`Change: ${data.changePercent.toFixed(1)}%`)
  }

  if ('mismatchCount' in data) {
    parts.push(`Significant inventory adjustments: ${data.mismatchCount}`)
    parts.push(`Total adjustments: ${data.totalAdjustments}`)
  }

  return parts.join('\n')
}

// ==================== MAIN GENERATION FUNCTION ====================

export async function generateAllRiskAlerts(storeId?: string): Promise<{
  stockoutAlerts: number
  deadInventoryAlerts: number
  shrinkAlerts: number
  totalCreated: number
}> {
  const scores = await calculateAllRiskScores(storeId)

  // Use the provided storeId or get all stores from scores
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const storesToProcess = storeId
    ? [storeId]
    : Array.from(new Set([
        ...scores.stockout.map(s => s.productId),
        ...scores.deadInventory.map(s => s.productId),
        ...scores.shrink.map(s => s.storeId),
      ]))

  // For product-based scores, we need to get the store_id
  // For simplicity, we'll pass the storeId directly from the calling function

  const results = {
    stockoutAlerts: 0,
    deadInventoryAlerts: 0,
    shrinkAlerts: 0,
    totalCreated: 0,
  }

  // Group scores by store for processing
  // For now, we'll process all scores assuming they're from the same store context
  // In production, you'd want to properly map products to stores

  if (storeId) {
    results.stockoutAlerts = await generateStockoutAlerts(scores.stockout, storeId)
    results.deadInventoryAlerts = await generateDeadInventoryAlerts(scores.deadInventory, storeId)
    results.shrinkAlerts = await generateShrinkAlerts(scores.shrink, storeId)
  }

  results.totalCreated = results.stockoutAlerts + results.deadInventoryAlerts + results.shrinkAlerts

  if (results.totalCreated > 0) {
    revalidatePath('/dashboard')
  }

  return results
}

// ==================== CRON/Scheduled Task Handler ====================

export async function runRiskScoringAndAlertGeneration(): Promise<{
  success: boolean
  message: string
  details: {
    storesProcessed: number
    totalAlertsCreated: number
    stockoutAlerts: number
    deadInventoryAlerts: number
    shrinkAlerts: number
  }
}> {
  const supabase = await createServiceClient()

  // Get all active stores
  const { data: storesRaw, error } = await supabase
    .from('stores')
    .select('id, name')
    .limit(100)
  const stores = storesRaw as { id: string; name?: string }[] | null

  if (error || !stores) {
    return {
      success: false,
      message: `Failed to fetch stores: ${error?.message}`,
      details: {
        storesProcessed: 0,
        totalAlertsCreated: 0,
        stockoutAlerts: 0,
        deadInventoryAlerts: 0,
        shrinkAlerts: 0,
      },
    }
  }

  let totalStockoutAlerts = 0
  let totalDeadInventoryAlerts = 0
  let totalShrinkAlerts = 0
  let processedStores = 0

  for (const store of stores) {
    try {
      const result = await generateAllRiskAlerts(store.id)
      totalStockoutAlerts += result.stockoutAlerts
      totalDeadInventoryAlerts += result.deadInventoryAlerts
      totalShrinkAlerts += result.shrinkAlerts
      processedStores++
    } catch (err) {
      console.error(`Error processing store ${store.id}:`, err)
    }
  }

  const totalAlerts = totalStockoutAlerts + totalDeadInventoryAlerts + totalShrinkAlerts

  return {
    success: true,
    message: `Processed ${processedStores} stores, created ${totalAlerts} alerts`,
    details: {
      storesProcessed: processedStores,
      totalAlertsCreated: totalAlerts,
      stockoutAlerts: totalStockoutAlerts,
      deadInventoryAlerts: totalDeadInventoryAlerts,
      shrinkAlerts: totalShrinkAlerts,
    },
  }
}
