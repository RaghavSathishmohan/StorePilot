// Risk Score Types
export interface StockoutRiskScore {
  productId: string
  productName: string
  sku: string
  currentStock: number
  avgDailySales: number
  daysUntilStockout: number | null
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: {
    stockToReorderRatio: number
    salesVelocityFactor: number
    stockLevelFactor: number
  }
}

export interface DeadInventoryRiskScore {
  productId: string
  productName: string
  sku: string
  currentStock: number
  stockValue: number
  daysWithoutMovement: number
  lastSaleDate: string | null
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: {
    timeFactor: number
    valueFactor: number
    quantityFactor: number
  }
}

export interface ShrinkRiskScore {
  storeId: string
  storeName: string
  riskScore: number // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  components: {
    refundSpike: {
      score: number
      currentPeriodRefunds: number
      previousPeriodRefunds: number
      changePercent: number
    }
    voidSpike: {
      score: number
      currentPeriodVoids: number
      previousPeriodVoids: number
      changePercent: number
    }
    discountSpike: {
      score: number
      currentPeriodDiscounts: number
      previousPeriodDiscounts: number
      changePercent: number
    }
    inventoryMismatch: {
      score: number
      mismatchCount: number
      totalAdjustments: number
    }
  }
}

// Thresholds Configuration
export const RISK_THRESHOLDS = {
  stockout: {
    critical: { maxDays: 3, minScore: 80 },
    high: { maxDays: 7, minScore: 60 },
    medium: { maxDays: 14, minScore: 40 },
    low: { maxDays: Infinity, minScore: 0 },
  },
  deadInventory: {
    critical: { minDays: 180, minScore: 80 },
    high: { minDays: 120, minScore: 60 },
    medium: { minDays: 90, minScore: 40 },
    low: { minDays: 0, minScore: 0 },
  },
  shrink: {
    critical: { minScore: 80 },
    high: { minScore: 60 },
    medium: { minScore: 40 },
    low: { minScore: 0 },
  },
}
