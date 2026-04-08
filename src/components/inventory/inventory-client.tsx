'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  InventoryItem,
  getInventory,
  adjustInventory,
} from '@/app/actions/products'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, AlertTriangle, Package, Edit3, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { toast } from 'sonner'

interface Store {
  id: string
  name: string
}

interface ProductCategory {
  id: string
  name: string
}

interface InventoryClientProps {
  stores: Store[]
  initialInventory: InventoryItem[]
  initialCategories: ProductCategory[]
  initialStoreId: string
}

export function InventoryClient({
  stores,
  initialInventory,
  initialCategories,
  initialStoreId,
}: InventoryClientProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Dialog states
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    newQuantity: '',
    reason: '',
  })

  const loadInventory = useCallback(async (storeId: string) => {
    setIsLoading(true)
    try {
      const data = await getInventory(storeId).catch(() => [])
      setInventory(data || [])
    } catch (error) {
      toast.error('Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    loadInventory(storeId)
  }

  const handleAdjustStock = async () => {
    if (!selectedItem || !formData.newQuantity) return

    try {
      const result = await adjustInventory(
        selectedStoreId,
        selectedItem.product_id,
        parseInt(formData.newQuantity),
        selectedItem.location_id,
        formData.reason || 'Manual adjustment'
      )

      if (result.success) {
        toast.success('Stock adjusted successfully')
        setIsAdjustDialogOpen(false)
        setFormData({ newQuantity: '', reason: '' })
        setSelectedItem(null)
        loadInventory(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to adjust stock')
      }
    } catch (error) {
      toast.error('An error occurred while adjusting stock')
    }
  }

  const openAdjustDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormData({
      newQuantity: item.quantity.toString(),
      reason: '',
    })
    setIsAdjustDialogOpen(true)
  }

  // Filter inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_sku.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === 'all') return matchesSearch
    if (activeTab === 'low') {
      return matchesSearch && item.quantity > 0 && item.quantity <= item.reorder_point
    }
    if (activeTab === 'out') {
      return matchesSearch && item.quantity <= 0
    }
    if (activeTab === 'excess') {
      return matchesSearch && item.quantity > item.min_stock_level * 3
    }
    return matchesSearch
  })

  // Calculate stats
  const lowStockCount = (inventory || []).filter(
    (i) => i.quantity > 0 && i.quantity <= i.reorder_point
  ).length
  const outOfStockCount = (inventory || []).filter((i) => i.quantity <= 0).length
  const totalItems = (inventory || []).length
  const totalValue = (inventory || []).reduce(
    (sum, i) => sum + (i.unit_cost || 0) * i.quantity,
    0
  )

  // Get stock status
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const, className: '' }
    }
    if (item.quantity <= item.reorder_point) {
      return { label: 'Low Stock', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    }
    if (item.quantity > item.min_stock_level * 3) {
      return { label: 'Excess', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 border-blue-200' }
    }
    return { label: 'In Stock', variant: 'default' as const, className: '' }
  }

  return (
    <div className="space-y-6">
      {/* Store Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select Store</CardTitle>
          <CardDescription>Choose which store to manage inventory for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(stores || []).map((store) => (
              <Button
                key={store.id}
                variant={selectedStoreId === store.id ? 'default' : 'outline'}
                onClick={() => handleStoreChange(store.id)}
                className="min-w-[140px]"
              >
                {store.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>View and adjust stock levels</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="low">Low Stock</TabsTrigger>
                  <TabsTrigger value="out">Out</TabsTrigger>
                  <TabsTrigger value="excess">Excess</TabsTrigger>
                </TabsList>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
              </div>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (filteredInventory || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? 'No inventory items match your search'
                : 'No inventory items found for this store.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filteredInventory || []).map((item) => {
                    const status = getStockStatus(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.product_sku}</TableCell>
                        <TableCell>{item.location_name || 'Default'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.reserved_quantity}</TableCell>
                        <TableCell>{item.available_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAdjustDialog(item)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Update inventory quantity for {selectedItem?.product_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Quantity</Label>
              <div className="text-2xl font-bold">{selectedItem?.quantity}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newQty">New Quantity *</Label>
              <Input
                id="newQty"
                type="number"
                value={formData.newQuantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, newQuantity: e.target.value }))
                }
                placeholder="Enter new quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, reason: v || '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stock count adjustment">Stock count adjustment</SelectItem>
                  <SelectItem value="Damaged goods">Damaged goods</SelectItem>
                  <SelectItem value="Expired products">Expired products</SelectItem>
                  <SelectItem value="Theft/shrinkage">Theft/shrinkage</SelectItem>
                  <SelectItem value="Return to supplier">Return to supplier</SelectItem>
                  <SelectItem value="Received shipment">Received shipment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.reason === 'Other' && (
              <div className="space-y-2">
                <Label htmlFor="customReason">Custom Reason</Label>
                <Input
                  id="customReason"
                  value={formData.reason === 'Other' ? '' : formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Enter custom reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
