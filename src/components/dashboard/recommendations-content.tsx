'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingCart,
  Package,
  Gift,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import {
  ReorderRecommendation,
  ReduceOrderRecommendation,
  BundleRecommendation,
  updateRecommendationStatus,
} from '@/app/actions/recommendations'

interface RecommendationsContentProps {
  reorderRecommendations: ReorderRecommendation[]
  reduceRecommendations: ReduceOrderRecommendation[]
  bundleRecommendations: BundleRecommendation[]
  storedRecommendations: any[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-black'
    default:
      return 'bg-blue-500 text-white'
  }
}

export function RecommendationsContent({
  reorderRecommendations,
  reduceRecommendations,
  bundleRecommendations,
  storedRecommendations,
}: RecommendationsContentProps) {
  const [recommendations, setRecommendations] = useState(storedRecommendations)
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleAccept(id: string) {
    setUpdating(id)
    await updateRecommendationStatus(id, 'accepted')
    setRecommendations(prev => prev.filter(r => r.id !== id))
    setUpdating(null)
  }

  async function handleReject(id: string) {
    setUpdating(id)
    await updateRecommendationStatus(id, 'rejected', 'Not applicable')
    setRecommendations(prev => prev.filter(r => r.id !== id))
    setUpdating(null)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Recommendations</h2>
            <p className="text-muted-foreground">
              AI-powered suggestions to optimize your store
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Reorder Suggestions</p>
                  <p className="text-2xl font-bold">{reorderRecommendations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Reduce Orders</p>
                  <p className="text-2xl font-bold">{reduceRecommendations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Bundle Ideas</p>
                  <p className="text-2xl font-bold">{bundleRecommendations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{recommendations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recommendations Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="reorder" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="reorder">
              Reorder
              {reorderRecommendations.length > 0 && (
                <Badge variant="secondary" className="ml-2">{reorderRecommendations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reduce">Reduce</TabsTrigger>
            <TabsTrigger value="bundle">Bundles</TabsTrigger>
            <TabsTrigger value="pending">History</TabsTrigger>
          </TabsList>

          <TabsContent value="reorder" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Reorder Suggestions</CardTitle>
                <CardDescription>
                  Items at risk of stockout based on current inventory and sales velocity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reorderRecommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No reorder suggestions at this time
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reorderRecommendations.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.productName}</h4>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            SKU: {item.sku} • Current: {item.currentStock} units
                          </p>
                          <p className="text-sm">{item.reason}</p>
                          {item.estimatedDaysUntilStockout && (
                            <p className="text-sm text-orange-600 mt-1">
                              ~{item.estimatedDaysUntilStockout} days until stockout
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Order {item.suggestedQuantity} units</p>
                          <p className="text-xs text-muted-foreground">
                            Daily sales: {item.avgDailySales.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reduce" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Reduce Order Suggestions</CardTitle>
                <CardDescription>
                  Slow-moving items with excess inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reduceRecommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No reduce-order suggestions at this time
                  </p>
                ) : (
                  <div className="space-y-4">
                    {reduceRecommendations.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.productName}</h4>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            SKU: {item.sku} • Current: {item.currentStock} units
                          </p>
                          <p className="text-sm">{item.reason}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Stock value: ${item.stockValue.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Reduce by {item.suggestedReduction}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.daysWithoutSales} days no sales
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bundle" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Bundle Opportunities</CardTitle>
                <CardDescription>
                  Products frequently bought together with healthy margins
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bundleRecommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No bundle opportunities found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {bundleRecommendations.map((bundle) => (
                      <div
                        key={bundle.primaryProductId}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">Bundle: {bundle.primaryProductName}</h4>
                            <Badge className={getPriorityColor(bundle.priority)} variant="secondary">
                              {bundle.priority} priority
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{bundle.bundleFrequency}× bought together</p>
                            <p className="text-xs text-green-600">
                              Combined margin: ${bundle.combinedMargin.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>With:</span>
                          {bundle.bundledProducts.map((p) => (
                            <span key={p.productId} className="font-medium">{p.productName}</span>
                          ))}
                        </div>

                        <p className="text-sm mt-2">{bundle.reason}</p>

                        <p className="text-sm text-blue-600 mt-1">
                          Suggested bundle discount: {bundle.suggestedDiscount.toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommendation History</CardTitle>
                <CardDescription>
                  Previously saved recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending recommendations</p>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rec.title}</h4>
                            <Badge variant={rec.priority <= 2 ? 'destructive' : 'secondary'}>
                              Priority {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(rec.id)}
                            disabled={updating === rec.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(rec.id)}
                            disabled={updating === rec.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
