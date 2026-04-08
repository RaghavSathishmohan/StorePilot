'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  RotateCcw,
  Ban,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  PackageX,
  Archive,
  ShoppingCart,
  BarChart3,
  Info,
  HelpCircle,
  Sparkles,
  Brain,
  RefreshCw,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { RevenueChart } from './revenue-chart'
import { CategoryChart } from './category-chart'
import { RiskScoreCards } from './risk-score-cards'
import {
  RevenueMetrics,
  TopSellingItem,
  LowPerformingItem,
  StockoutRiskItem,
  DeadInventoryItem,
  DashboardCounts,
  DailyRevenueData,
  CategoryPerformance,
} from '@/app/actions/dashboard'
import type {
  StockoutRiskScore,
  DeadInventoryRiskScore,
} from '@/types/risk-scoring'

interface DashboardContentProps {
  revenueMetrics: RevenueMetrics
  topSellingItems: TopSellingItem[]
  lowPerformingItems: LowPerformingItem[]
  stockoutRiskItems: StockoutRiskItem[]
  deadInventoryItems: DeadInventoryItem[]
  dashboardCounts: DashboardCounts
  dailyRevenueData: DailyRevenueData[]
  categoryPerformance: CategoryPerformance[]
  stockoutRiskScores: StockoutRiskScore[]
  deadInventoryRiskScores: DeadInventoryRiskScore[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
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
      ease: [0.25, 0.1, 0.25, 1] as const,
    },
  },
}

// Info Button Component
function InfoButton({ title, description, details }: { title: string; description: string; details: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 group cursor-help"
            onClick={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
          >
            <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </span>
        }
      />
      <TooltipContent side="top" className="max-w-sm p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="w-4 h-4" />
            {title}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-1 pt-2 border-t border-border/50">
            {details.map((detail, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Sparkles className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Tooltip Info Component
function TooltipInfo({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-help"
            role="button"
            tabIndex={0}
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        }
      />
      <TooltipContent side="right" className="max-w-xs">
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Interactive Stat Card
function StatCard({
  title,
  value,
  change,
  changePercent,
  icon: Icon,
  trend,
  href,
  info,
  color,
}: {
  title: string
  value: string
  change?: string
  changePercent?: number
  icon: any
  trend: 'up' | 'down' | 'neutral'
  href: string
  info: { title: string; description: string; details: string[] }
  color: string
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isPositive = trend === 'up'
  const isNegative = trend === 'down'

  return (
    <motion.div variants={itemVariants}>
      <Link href={href} className="block">
        <Card
          className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2 ${
            isHovered ? 'border-primary/50' : 'border-transparent'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated Background */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered ? 0.1 : 0 }}
            className={`absolute inset-0 bg-gradient-to-br ${color}`}
          />

          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <InfoButton {...info} />
            </div>
            <motion.div
              animate={{ rotate: isHovered ? 5 : 0, scale: isHovered ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
              className={`h-9 w-9 rounded-full flex items-center justify-center ${
                trend === 'up'
                  ? 'bg-green-500/10 text-green-500'
                  : trend === 'down'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          </CardHeader>
          <CardContent className="relative z-10">
            <motion.div
              initial={false}
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
              className="text-3xl font-bold"
            >
              {value}
            </motion.div>
            {(change || changePercent !== undefined) && (
              <div className="flex items-center gap-1 mt-1">
                {isPositive && <TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                {isNegative && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                {changePercent !== undefined && (
                  <span
                    className={`text-xs font-medium ${
                      isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                    }`}
                  >
                    {isPositive && '+'}
                    {changePercent.toFixed(1)}%
                  </span>
                )}
                {change && <span className="text-xs text-muted-foreground">{change}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function DashboardContent({
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
}: DashboardContentProps) {
  const isRevenuePositive = revenueMetrics.changePercent >= 0
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
    window.location.reload()
  }

  return (
    <TooltipProvider delay={100}>
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Powered
              </Badge>
            </div>
            <p className="text-muted-foreground">Overview of your store performance and key metrics.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <InfoButton
              title="Dashboard Overview"
              description="Your command center for store management"
              details={[
                "View real-time revenue metrics and compare with previous periods",
                "Track refunds and voids to identify operational issues",
                "Monitor alerts and inventory status at a glance",
                "Click any card to dive deeper into detailed analytics",
              ]}
            />
          </div>
        </motion.div>

        {/* Revenue Cards */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={formatCurrency(revenueMetrics.today)}
            change="vs yesterday"
            changePercent={revenueMetrics.changePercent}
            icon={DollarSign}
            trend={isRevenuePositive ? 'up' : 'down'}
            href="/dashboard/analytics?tab=revenue"
            color="from-green-500 to-emerald-600"
            info={{
              title: "Today's Revenue",
              description: 'Real-time sales data for the current day',
              details: [
                'Updates automatically as new transactions are processed',
                'Includes all completed sales minus voids and refunds',
                'Compares against yesterday to show daily trend',
                'Click to view detailed revenue analytics',
              ],
            }}
          />

          <StatCard
            title="Yesterday's Revenue"
            value={formatCurrency(revenueMetrics.yesterday)}
            change="Previous day total"
            icon={TrendingUp}
            trend="neutral"
            href="/dashboard/analytics?tab=revenue"
            color="from-blue-500 to-cyan-600"
            info={{
              title: "Yesterday's Revenue",
              description: 'Total sales completed yesterday',
              details: [
                'Complete daily sales figure from yesterday',
                'Useful for comparing with current day performance',
                'Includes all transaction types from that day',
                'Archived daily at midnight automatically',
              ],
            }}
          />

          <StatCard
            title="Refunds"
            value={formatNumber(dashboardCounts.refundCount)}
            change="Today"
            icon={RotateCcw}
            trend={dashboardCounts.refundCount > 5 ? 'down' : 'neutral'}
            href="/dashboard/analytics?tab=revenue"
            color="from-orange-500 to-amber-600"
            info={{
              title: 'Refunds',
              description: 'Number of refund transactions today',
              details: [
                'Tracks customer returns and refund events',
                'High numbers may indicate product quality issues',
                'Each refund includes original transaction details',
                'Click to see refund reasons and patterns',
              ],
            }}
          />

          <StatCard
            title="Voids"
            value={formatNumber(dashboardCounts.voidCount)}
            change="Today"
            icon={Ban}
            trend={dashboardCounts.voidCount > 3 ? 'down' : 'neutral'}
            href="/dashboard/analytics?tab=revenue"
            color="from-red-500 to-rose-600"
            info={{
              title: 'Voids',
              description: 'Cancelled transactions today',
              details: [
                'Transactions that were cancelled before completion',
                'May indicate operational errors or customer changes',
                'Excludes refunds (those are tracked separately)',
                'Review regularly to identify training needs',
              ],
            }}
          />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Revenue Chart */}
          <motion.div variants={itemVariants} className="col-span-4">
            <Link href="/dashboard/analytics?tab=revenue" className="block">
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Daily revenue over the last 30 days</CardDescription>
                      </div>
                      <InfoButton
                        title="Revenue Trend Chart"
                        description="Visualize your sales performance over time"
                        details={[
                          'Shows daily revenue totals for the past 30 days',
                          'Identify patterns like weekly cycles or seasonal trends',
                          'Hover over points to see exact values',
                          'Compare with previous months in Analytics',
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      {dashboardCounts.unreadAlertCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0">
                          {dashboardCounts.unreadAlertCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={dailyRevenueData} />
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Category Chart */}
          <motion.div variants={itemVariants} className="col-span-3">
            <Link href="/dashboard/analytics?tab=products" className="block">
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div>
                      <CardTitle>Category Performance</CardTitle>
                      <CardDescription>Revenue by category (last 30 days)</CardDescription>
                    </div>
                    <InfoButton
                      title="Category Performance"
                      description="See which product categories drive your revenue"
                      details={[
                        'Breakdown of sales by product category',
                        'Helps identify your best-performing categories',
                        'Use for inventory planning and marketing focus',
                        'Colors match your category settings',
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <CategoryChart data={categoryPerformance} />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Items Tables Row */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2">
          {/* Top Selling Items */}
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/analytics?tab=products" className="block">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-500" />
                      <div>
                        <CardTitle>Top Selling Items</CardTitle>
                        <CardDescription>Best performers this month</CardDescription>
                      </div>
                    </div>
                    <InfoButton
                      title="Top Selling Items"
                      description="Your highest revenue-generating products"
                      details={[
                        'Ranked by total revenue generated',
                        'Shows quantity sold and total revenue',
                        'Updated in real-time as sales occur',
                        'Use to identify your star products',
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {topSellingItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No sales data available yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Import sales data or add transactions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topSellingItems.map((item, index) => (
                        <motion.div
                          key={item.id || `top-selling-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-sm font-medium text-green-600">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatCurrency(item.revenue)}</p>
                            <p className="text-xs text-muted-foreground">{formatNumber(item.quantity)} sold</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Low Performing Items */}
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/analytics?tab=products" className="block">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <div>
                        <CardTitle>Low Performing Items</CardTitle>
                        <CardDescription>Items needing attention</CardDescription>
                      </div>
                    </div>
                    <InfoButton
                      title="Low Performing Items"
                      description="Products with poor sales performance"
                      details={[
                        'Items with low or no recent sales activity',
                        'Shows days since last sale',
                        'Consider promotions or discontinuing',
                        'Helps optimize inventory investment',
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {lowPerformingItems.length === 0 ? (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No low performing items</p>
                      <p className="text-xs text-muted-foreground mt-1">All products are selling well!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lowPerformingItems.map((item, index) => (
                        <motion.div
                          key={item.id || `low-performing-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-red-500">{formatCurrency(item.revenue)}</p>
                            <p className="text-xs text-muted-foreground">{item.daysSinceLastSale} days since sale</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {/* Risk Score Analysis Row */}
        <RiskScoreCards
          stockoutRisks={stockoutRiskScores}
          deadInventoryRisks={deadInventoryRiskScores}
        />

        {/* Inventory Risk Row */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Stockout Risk */}
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/analytics?tab=inventory" className="block">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageX className="h-5 w-5 text-orange-500" />
                      <div>
                        <CardTitle>Stockout Risk</CardTitle>
                        <CardDescription>Items running low on stock</CardDescription>
                      </div>
                    </div>
                    <InfoButton
                      title="Stockout Risk"
                      description="Products at risk of running out of stock"
                      details={[
                        'Items at or below reorder point',
                        'Shows estimated days until stockout',
                        'Based on recent sales velocity',
                        'Reorder soon to avoid lost sales',
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {stockoutRiskItems.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No stockout risks detected</p>
                      <p className="text-xs text-muted-foreground mt-1">Inventory levels are healthy!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stockoutRiskItems.map((item, index) => {
                        const stockPercent = Math.min(100, (item.currentStock / item.reorderPoint) * 100)
                        const isCritical = stockPercent < 30
                        return (
                          <motion.div
                            key={item.id || `stockout-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.sku}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {item.currentStock} / {item.reorderPoint}
                                </p>
                                {item.daysUntilStockout !== null && (
                                  <p className={`text-xs ${isCritical ? 'text-red-500 font-medium' : 'text-orange-500'}`}>
                                    ~{item.daysUntilStockout} days left
                                  </p>
                                )}
                              </div>
                            </div>
                            <Progress
                              value={stockPercent}
                              className={`h-2 ${isCritical ? 'bg-red-100' : ''}`}
                            />
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Dead Inventory */}
          <motion.div variants={itemVariants}>
            <Link href="/dashboard/analytics?tab=inventory" className="block">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive className="h-5 w-5 text-gray-500" />
                      <div>
                        <CardTitle>Dead Inventory</CardTitle>
                        <CardDescription>Items with no recent sales</CardDescription>
                      </div>
                    </div>
                    <InfoButton
                      title="Dead Inventory"
                      description="Products not selling that tie up capital"
                      details={[
                        'Items with no sales in 90+ days',
                        'Shows value of tied-up capital',
                        'Consider clearance or discontinuing',
                        'Free up cash for better-performing stock',
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {deadInventoryItems.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No dead inventory items</p>
                      <p className="text-xs text-muted-foreground mt-1">All inventory is turning over!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deadInventoryItems.map((item, index) => (
                        <motion.div
                          key={item.id || `dead-inventory-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{item.currentStock} units</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.stockValue)} value</p>
                            <p className="text-xs text-red-500">{item.daysWithoutMovement} days idle</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          {/* Alerts Summary */}
          <motion.div variants={itemVariants}>
            <Card className="transition-all hover:shadow-lg hover:border-primary/50 h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <CardTitle>Alerts</CardTitle>
                      <CardDescription>Items requiring attention</CardDescription>
                    </div>
                  </div>
                  <InfoButton
                    title="Alerts Summary"
                    description="Overview of all system alerts"
                    details={[
                      'Stock alerts for low inventory items',
                      'Dead inventory notifications',
                      'System recommendations and warnings',
                      'Click View All for complete details',
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">Total Alerts</p>
                        <p className="text-sm text-muted-foreground">{dashboardCounts.unreadAlertCount} unread</p>
                      </div>
                    </div>
                    <span className="text-3xl font-bold">{dashboardCounts.alertCount}</span>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-lg bg-muted/50 text-center cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Package className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="font-medium text-lg">{stockoutRiskItems.length}</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-lg bg-muted/50 text-center cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Archive className="h-4 w-4 mx-auto mb-1 text-gray-500" />
                      <p className="text-xs text-muted-foreground">Dead</p>
                      <p className="font-medium text-lg">{deadInventoryItems.length}</p>
                    </motion.div>
                  </div>

                  <Button variant="outline" className="w-full group" asChild>
                    <Link href="/dashboard/analytics?tab=alerts">
                      View All Alerts
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
