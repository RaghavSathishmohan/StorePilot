'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  Package,
  Archive,
  TrendingDown,
  AlertCircle,
  Info,
} from 'lucide-react'
import type {
  StockoutRiskScore,
  DeadInventoryRiskScore,
} from '@/types/risk-scoring'

interface RiskScoreCardsProps {
  stockoutRisks: StockoutRiskScore[]
  deadInventoryRisks: DeadInventoryRiskScore[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-500 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-black'
    default:
      return 'bg-green-500 text-white'
  }
}

function getRiskScoreColor(score: number): string {
  if (score >= 80) return 'text-red-500'
  if (score >= 60) return 'text-orange-500'
  if (score >= 40) return 'text-yellow-600'
  return 'text-green-500'
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
}

export function RiskScoreCards({ stockoutRisks, deadInventoryRisks }: RiskScoreCardsProps) {
  const criticalStockout = stockoutRisks.filter(r => r.riskLevel === 'critical')
  const highStockout = stockoutRisks.filter(r => r.riskLevel === 'high')
  const criticalDead = deadInventoryRisks.filter(r => r.riskLevel === 'critical')
  const highDead = deadInventoryRisks.filter(r => r.riskLevel === 'high')

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 md:grid-cols-2"
    >
      {/* Stockout Risk Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                <div>
                  <CardTitle>Stockout Risk Analysis</CardTitle>
                  <CardDescription>Items at risk of running out of stock</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {criticalStockout.length > 0 && (
                  <Badge variant="destructive">{criticalStockout.length} Critical</Badge>
                )}
                {highStockout.length > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    {highStockout.length} High
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {stockoutRisks.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Info className="h-4 w-4" />
                <p>No stockout risks detected</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stockoutRisks.slice(0, 5).map((item) => (
                  <div key={item.productId} className="space-y-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getRiskLevelColor(item.riskLevel)}>
                          {item.riskLevel.toUpperCase()}
                        </Badge>
                        <p className={`text-lg font-bold ${getRiskScoreColor(item.riskScore)}`}>
                          {item.riskScore}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block">Stock: {item.currentStock}</span>
                      </div>
                      <div>
                        <span className="block">Daily Sales: {formatNumber(item.avgDailySales)}</span>
                      </div>
                      <div>
                        <span className="block">
                          {item.daysUntilStockout !== null
                            ? `~${item.daysUntilStockout} days left`
                            : 'No sales data'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className="font-medium">{item.riskScore}/100</span>
                      </div>
                      <Progress
                        value={item.riskScore}
                        className="h-2"
                      />
                    </div>

                    {/* Factor Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Stock/Reorder</p>
                        <p className="text-xs font-medium">{item.factors.stockToReorderRatio.toFixed(0)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Velocity</p>
                        <p className="text-xs font-medium">{item.factors.salesVelocityFactor.toFixed(0)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Level</p>
                        <p className="text-xs font-medium">{item.factors.stockLevelFactor.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dead Inventory Risk Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-gray-500" />
                <div>
                  <CardTitle>Dead Inventory Analysis</CardTitle>
                  <CardDescription>Items with declining sales movement</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {criticalDead.length > 0 && (
                  <Badge variant="destructive">{criticalDead.length} Critical</Badge>
                )}
                {highDead.length > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    {highDead.length} High
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {deadInventoryRisks.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Info className="h-4 w-4" />
                <p>No dead inventory risks detected</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deadInventoryRisks.slice(0, 5).map((item) => (
                  <div key={item.productId} className="space-y-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getRiskLevelColor(item.riskLevel)}>
                          {item.riskLevel.toUpperCase()}
                        </Badge>
                        <p className={`text-lg font-bold ${getRiskScoreColor(item.riskScore)}`}>
                          {item.riskScore}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block">Stock: {item.currentStock}</span>
                      </div>
                      <div>
                        <span className="block">Value: ${item.stockValue.toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="block">{item.daysWithoutMovement} days idle</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className="font-medium">{item.riskScore}/100</span>
                      </div>
                      <Progress
                        value={item.riskScore}
                        className="h-2"
                      />
                    </div>

                    {/* Factor Breakdown */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="text-xs font-medium">{item.factors.timeFactor.toFixed(0)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="text-xs font-medium">{item.factors.valueFactor.toFixed(0)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Qty</p>
                        <p className="text-xs font-medium">{item.factors.quantityFactor.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
