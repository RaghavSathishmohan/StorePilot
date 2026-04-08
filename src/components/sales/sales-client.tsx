'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Product,
  getProducts,
  InventoryItem,
  getInventory,
} from '@/app/actions/products'
import { SaleReceipt, createSale, getSales, voidSale } from '@/app/actions/sales'
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
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Receipt,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

interface Store {
  id: string
  name: string
}

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
}

interface SalesClientProps {
  stores: Store[]
  initialProducts: Product[]
  initialSales: SaleReceipt[]
  initialStoreId: string
}

export function SalesClient({
  stores,
  initialProducts,
  initialSales,
  initialStoreId,
}: SalesClientProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [sales, setSales] = useState<SaleReceipt[]>(initialSales)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('pos')

  // POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<'debit' | 'credit' | 'cash' | 'mobile' | 'other'>('debit')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [isProcessingSale, setIsProcessingSale] = useState(false)

  // Void dialog state
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleReceipt | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const loadStoreData = useCallback(async (storeId: string) => {
    setIsLoading(true)
    try {
      const [productsData, salesData, inventoryData] = await Promise.all([
        getProducts(storeId).catch(() => []),
        getSales(storeId).catch(() => []),
        getInventory(storeId).catch(() => []),
      ])
      setProducts(productsData || [])
      setSales(salesData || [])
      setInventory(inventoryData || [])
    } catch (error) {
      toast.error('Failed to load store data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    loadStoreData(storeId)
    setCart([])
  }

  const getProductInventory = (productId: string) => {
    return (inventory || []).find((inv) => inv.product_id === productId)
  }

  const addToCart = (product: Product) => {
    const inv = getProductInventory(product.id)
    if (!inv || inv.available_quantity <= 0) {
      toast.error('Product is out of stock')
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= inv.available_quantity) {
          toast.error('Not enough stock available')
          return prev
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, unitPrice: product.selling_price }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => (prev || []).filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    const inv = getProductInventory(productId)
    if (quantity > (inv?.available_quantity || 0)) {
      toast.error('Not enough stock available')
      return
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const calculateTotals = () => {
    const subtotal = (cart || []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.08 // 8% tax rate (can be made configurable)
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    setIsProcessingSale(true)
    try {
      const { subtotal, tax, total } = calculateTotals()

      // Map payment method to the correct type
      const mappedPaymentMethod: 'card' | 'cash' | 'mobile' | 'other' =
        paymentMethod === 'debit' || paymentMethod === 'credit' ? 'card' : paymentMethod

      const saleData = {
        store_id: selectedStoreId,
        location_id: null,
        transaction_date: new Date().toISOString(),
        subtotal,
        tax_amount: tax,
        discount_amount: 0,
        total_amount: total,
        payment_method: mappedPaymentMethod,
        payment_status: 'completed' as const,
        customer_name: customerName || null,
        customer_email: customerEmail || null,
        customer_phone: null,
        loyalty_points_used: null,
        loyalty_points_earned: null,
        is_voided: false,
        void_reason: null,
      }

      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: 0,
        total: item.unitPrice * item.quantity,
      }))

      const result = await createSale(saleData, items)

      if (result.success) {
        toast.success('Sale completed successfully')
        setCart([])
        setCustomerName('')
        setCustomerEmail('')
        loadStoreData(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to complete sale')
      }
    } catch (error) {
      toast.error('An error occurred while processing the sale')
    } finally {
      setIsProcessingSale(false)
    }
  }

  const handleVoidSale = async () => {
    if (!selectedSale || !voidReason) return

    try {
      const result = await voidSale(selectedSale.id, voidReason)
      if (result.success) {
        toast.success('Sale voided successfully')
        setIsVoidDialogOpen(false)
        setSelectedSale(null)
        setVoidReason('')
        loadStoreData(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to void sale')
      }
    } catch (error) {
      toast.error('An error occurred while voiding the sale')
    }
  }

  const openVoidDialog = (sale: SaleReceipt) => {
    setSelectedSale(sale)
    setIsVoidDialogOpen(true)
  }

  // Filter products for POS
  const filteredProducts = (products || []).filter((product) => {
    const inv = getProductInventory(product.id)
    const isAvailable = inv && inv.available_quantity > 0
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    return isAvailable && matchesSearch
  })

  const { subtotal, tax, total } = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Store Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select Store</CardTitle>
          <CardDescription>Choose which store to record sales for</CardDescription>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          <TabsTrigger value="history">Sales History</TabsTrigger>
        </TabsList>

        {/* POS Tab */}
        <TabsContent value="pos" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Products Grid */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : (filteredProducts || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(filteredProducts || []).map((product) => {
                      const inv = getProductInventory(product.id)
                      return (
                        <Button
                          key={product.id}
                          variant="outline"
                          className="h-auto py-3 px-2 flex flex-col items-start justify-between text-left"
                          onClick={() => addToCart(product)}
                        >
                          <span className="font-medium line-clamp-2 text-sm">{product.name}</span>
                          <div className="flex items-center justify-between w-full mt-2">
                            <span className="text-sm font-bold">
                              ${product.selling_price.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Stock: {inv?.available_quantity || 0}
                            </span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({(cart || []).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(cart || []).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cart is empty
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(cart || []).map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${item.unitPrice.toFixed(2)} × {item.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                            >
                              -
                            </Button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (8%)</span>
                        <span>${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(v: any) => setPaymentMethod(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debit">Debit Card</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="mobile">Mobile Payment</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Customer Name (Optional)</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleCompleteSale}
                      disabled={isProcessingSale}
                    >
                      {isProcessingSale ? 'Processing...' : 'Complete Sale'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales History</CardTitle>
              <CardDescription>View past transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (sales || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sales recorded yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sales || []).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">
                            {sale.receipt_number}
                          </TableCell>
                          <TableCell>
                            {new Date(sale.transaction_date).toLocaleString()}
                          </TableCell>
                          <TableCell>{sale.customer_name || '-'}</TableCell>
                          <TableCell className="capitalize">
                            {sale.payment_method}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sale.is_voided
                                  ? 'destructive'
                                  : sale.payment_status === 'completed'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {sale.is_voided ? 'Voided' : sale.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${sale.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {!sale.is_voided && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openVoidDialog(sale)}
                                className="text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Void Dialog */}
      <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Sale</DialogTitle>
            <DialogDescription>
              Are you sure you want to void receipt {selectedSale?.receipt_number}?
              This will refund ${selectedSale?.total_amount.toFixed(2)} and restore
              inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select value={voidReason} onValueChange={(v) => setVoidReason(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer request">Customer request</SelectItem>
                  <SelectItem value="Wrong item">Wrong item</SelectItem>
                  <SelectItem value="Duplicate charge">Duplicate charge</SelectItem>
                  <SelectItem value="Pricing error">Pricing error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoidSale}
              disabled={!voidReason}
            >
              Void Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
