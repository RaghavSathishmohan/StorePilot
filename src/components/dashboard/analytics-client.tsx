'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingDown,
  Archive,
  Calendar,
  PieChart,
  ArrowUpRight,
  RotateCcw,
  Ban,
  Bell,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
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

interface AnalyticsClientProps {
  revenueMetrics: RevenueMetrics
  topSellingItems: TopSellingItem[]
  lowPerformingItems: LowPerformingItem[]
  stockoutRiskItems: StockoutRiskItem[]
  deadInventoryItems: DeadInventoryItem[]
  dashboardCounts: DashboardCounts
  dailyRevenueData: DailyRevenueData[]
  categoryPerformance: CategoryPerformance[]
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

export function AnalyticsClient({
  revenueMetrics,
  topSellingItems,
  lowPerformingItems,
  stockoutRiskItems,
  deadInventoryItems,
  dashboardCounts,
  dailyRevenueData,
  categoryPerformance,
}: AnalyticsClientProps) {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'revenue'
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Calculate derived metrics
  const weekTotal = dailyRevenueData.slice(-7).reduce((sum, d) => sum + d.revenue, 0)
  const monthTotal = dailyRevenueData.reduce((sum, d) => sum + d.revenue, 0)
  const avgTransaction = dailyRevenueData.reduce((sum, d) => sum + d.transactions, 0) > 0
    ? monthTotal / dailyRevenueData.reduce((sum, d) => sum + d.transactions, 0)
    : 0

  const tabs = [
    { value: 'revenue', label: 'Revenue', icon: DollarSign },
    { value: 'products', label: 'Products', icon: ShoppingCart },
    { value: 'inventory', label: 'Inventory', icon: Package },
    { value: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Deep dive into your store performance and insights.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="revenue" className="space-y-6">
            <RevenueTab
              revenueMetrics={revenueMetrics}
              dailyRevenueData={dailyRevenueData}
              categoryPerformance={categoryPerformance}
              weekTotal={weekTotal}
              monthTotal={monthTotal}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductsTab
              topSellingItems={topSellingItems}
              lowPerformingItems={lowPerformingItems}
              categoryPerformance={categoryPerformance}
              avgTransaction={avgTransaction}
            />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryTab
              stockoutRiskItems={stockoutRiskItems}
              deadInventoryItems={deadInventoryItems}
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <AlertsTab
              dashboardCounts={dashboardCounts}
              stockoutRiskItems={stockoutRiskItems}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}

function RevenueTab({
  revenueMetrics,
  dailyRevenueData,
  categoryPerformance,
  weekTotal,
  monthTotal,
}: {
  revenueMetrics: RevenueMetrics
  dailyRevenueData: DailyRevenueData[]
  categoryPerformance: CategoryPerformance[]
  weekTotal: number
  monthTotal: number
}) {
  const changePercent = revenueMetrics.changePercent
  const trend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral'

  // Prepare chart data - last 7 days
  const chartData = dailyRevenueData.slice(-7).map((d) => ({
    day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: d.revenue,
    transactions: d.transactions,
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RevenueCard
          title="Today's Revenue"
          value={formatCurrency(revenueMetrics.today)}
          change={`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
          icon={DollarSign}
          trend={trend}
        />
        <RevenueCard
          title="Yesterday's Revenue"
          value={formatCurrency(revenueMetrics.yesterday)}
          change="Actual"
          icon={Calendar}
          trend="neutral"
        />
        <RevenueCard
          title="This Week"
          value={formatCurrency(weekTotal)}
          change="Last 7 days"
          icon={TrendingUp}
          trend={weekTotal > revenueMetrics.yesterday * 7 ? 'up' : 'down'}
        />
        <RevenueCard
          title="This Month"
          value={formatCurrency(monthTotal)}
          change="Last 30 days"
          icon={BarChart3}
          trend={monthTotal > 0 ? 'up' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData.length > 0 && chartData.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : String(v)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No revenue data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Revenue by product category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={categoryPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="name"
                  >
                    {categoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : String(v)} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No category data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Daily transaction counts</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px]">
          {chartData.length > 0 && chartData.some((d) => d.transactions > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => `${v} transactions`} />
                <Bar dataKey="transactions" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No transaction data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProductsTab({
  topSellingItems,
  lowPerformingItems,
  categoryPerformance,
  avgTransaction,
}: {
  topSellingItems: TopSellingItem[]
  lowPerformingItems: LowPerformingItem[]
  categoryPerformance: CategoryPerformance[]
  avgTransaction: number
}) {
  const totalProducts = categoryPerformance.reduce((sum, c) => sum + c.itemsSold, 0)
  const categories = categoryPerformance.length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RevenueCard
          title="Top Selling"
          value={topSellingItems.length.toString()}
          change="This month"
          icon={TrendingUp}
          trend="up"
        />
        <RevenueCard
          title="Total Products Sold"
          value={totalProducts.toString()}
          change="Active"
          icon={Package}
          trend="neutral"
        />
        <RevenueCard
          title="Categories"
          value={categories.toString()}
          change="Active"
          icon={PieChart}
          trend="neutral"
        />
        <RevenueCard
          title="Avg Transaction"
          value={formatCurrency(avgTransaction)}
          change="Per customer"
          icon={DollarSign}
          trend="up"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <CardDescription>Best performers this month</CardDescription>
          </CardHeader>
          <CardContent>
            {topSellingItems.length > 0 ? (
              <div className="space-y-4">
                {topSellingItems.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sales data available yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Performing Items</CardTitle>
            <CardDescription>Items needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {lowPerformingItems.length > 0 ? (
              <div className="space-y-4">
                {lowPerformingItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-500">{formatCurrency(item.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{item.daysSinceLastSale} days since sale</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No low performing items detected
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Revenue breakdown by category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categoryPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformance.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${v / 1000}k`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? formatCurrency(v) : String(v)} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No category data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InventoryTab({
  stockoutRiskItems,
  deadInventoryItems,
}: {
  stockoutRiskItems: StockoutRiskItem[]
  deadInventoryItems: DeadInventoryItem[]
}) {
  const lowStockCount = stockoutRiskItems.filter((i) => i.currentStock > 0).length
  const outOfStockCount = stockoutRiskItems.filter((i) => i.currentStock === 0).length
  const inventoryValue = deadInventoryItems.reduce((sum, i) => sum + i.stockValue, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RevenueCard
          title="Stockout Risk"
          value={lowStockCount.toString()}
          change="Items low on stock"
          icon={AlertTriangle}
          trend="down"
        />
        <RevenueCard
          title="Out of Stock"
          value={outOfStockCount.toString()}
          change="Need reordering"
          icon={Package}
          trend="down"
        />
        <RevenueCard
          title="Inventory Value"
          value={formatCurrency(inventoryValue)}
          change="Current value"
          icon={DollarSign}
          trend="neutral"
        />
        <RevenueCard
          title="Dead Inventory"
          value={deadInventoryItems.length.toString()}
          change="Items not selling"
          icon={Archive}
          trend="down"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stockout Risk Items</CardTitle>
            <CardDescription>Items running low on stock</CardDescription>
          </CardHeader>
          <CardContent>
            {stockoutRiskItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No stockout risks detected
              </p>
            ) : (
              <div className="space-y-4">
                {stockoutRiskItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {item.currentStock} / {item.reorderPoint}
                        </p>
                        <p className="text-xs text-orange-500">
                          {item.daysUntilStockout !== null
                            ? `${item.daysUntilStockout} days until stockout`
                            : 'No sales velocity'}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(100, (item.currentStock / item.reorderPoint) * 100)}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dead Inventory</CardTitle>
            <CardDescription>Items not selling (90+ days)</CardDescription>
          </CardHeader>
          <CardContent>
            {deadInventoryItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No dead inventory detected
              </p>
            ) : (
              <div className="space-y-4">
                {deadInventoryItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-500">{item.currentStock} units</p>
                      <p className="text-xs text-muted-foreground">
                        {item.daysWithoutMovement} days without movement
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AlertsTab({
  dashboardCounts,
  stockoutRiskItems,
}: {
  dashboardCounts: DashboardCounts
  stockoutRiskItems: StockoutRiskItem[]
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <RevenueCard
          title="Total Alerts"
          value={dashboardCounts.alertCount.toString()}
          change="All types"
          icon={AlertTriangle}
          trend="down"
        />
        <RevenueCard
          title="Stock Alerts"
          value={stockoutRiskItems.length.toString()}
          change="Low stock items"
          icon={Package}
          trend="down"
        />
        <RevenueCard
          title="Unread"
          value={dashboardCounts.unreadAlertCount.toString()}
          change="Needs attention"
          icon={Bell}
          trend="down"
        />
        <RevenueCard
          title="Refunds Today"
          value={dashboardCounts.refundCount.toString()}
          change={dashboardCounts.refundCount > 0 ? 'Needs review' : 'No refunds'}
          icon={RotateCcw}
          trend="neutral"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts</CardTitle>
            <CardDescription>Items below minimum threshold</CardDescription>
          </CardHeader>
          <CardContent>
            {stockoutRiskItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No stock alerts at this time
              </p>
            ) : (
              <div className="space-y-4">
                {stockoutRiskItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-500">
                        {item.currentStock} / {item.reorderPoint}
                      </p>
                      <p className="text-xs text-muted-foreground">Below threshold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Summary</CardTitle>
            <CardDescription>Key metrics overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Void Transactions</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <span className="text-2xl font-bold">{dashboardCounts.voidCount}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Low Stock Items</p>
                <p className="text-sm text-muted-foreground">Require attention</p>
              </div>
              <span className="text-2xl font-bold">{stockoutRiskItems.length}</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Total Alerts</p>
                <p className="text-sm text-muted-foreground">All stores</p>
              </div>
              <span className="text-2xl font-bold">{dashboardCounts.alertCount}</span>
            </div>

            <Link href="/dashboard/inventory">
              <Button variant="outline" className="w-full mt-4">
                View Inventory
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RevenueCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  change: string
  icon: React.ElementType
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p
          className={`text-xs ${
            trend === 'up'
              ? 'text-green-600'
              : trend === 'down'
              ? 'text-red-600'
              : 'text-muted-foreground'
          }`}
        >
          {trend === 'up' && '↑ '}
          {trend === 'down' && '↓ '}
          {change}
        </p>
      </CardContent>
    </Card>
  )
}
