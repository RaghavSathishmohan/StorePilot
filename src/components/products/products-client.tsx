'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Product,
  ProductCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getCategories,
  InventoryItem,
  getInventory,
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Search, Plus, MoreVertical, Package, AlertTriangle, Edit2, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Store {
  id: string
  name: string
}

interface ProductsClientProps {
  stores: Store[]
  initialProducts: Product[]
  initialInventory: InventoryItem[]
  initialCategories: ProductCategory[]
  initialStoreId: string
}

export function ProductsClient({ stores, initialProducts, initialInventory, initialCategories, initialStoreId }: ProductsClientProps) {
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category_id: '',
    selling_price: '',
    cost_price: '',
    tax_rate: '0',
    min_stock_level: '10',
    max_stock_level: '',
    reorder_point: '10',
    reorder_quantity: '',
    supplier_name: '',
    supplier_contact: '',
    unit_of_measure: 'each',
    is_featured: false,
  })

  const loadStoreData = useCallback(async (storeId: string) => {
    setIsLoading(true)
    try {
      const [productsData, categoriesData, inventoryData] = await Promise.all([
        getProducts(storeId).catch(() => []),
        getCategories(storeId).catch(() => []),
        getInventory(storeId).catch(() => []),
      ])
      setProducts(productsData || [])
      setCategories(categoriesData || [])
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
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      description: '',
      category_id: '',
      selling_price: '',
      cost_price: '',
      tax_rate: '0',
      min_stock_level: '10',
      max_stock_level: '',
      reorder_point: '10',
      reorder_quantity: '',
      supplier_name: '',
      supplier_contact: '',
      unit_of_measure: 'each',
      is_featured: false,
    })
  }

  const handleAddProduct = async () => {
    try {
      const productData = {
        store_id: selectedStoreId,
        name: formData.name,
        sku: formData.sku || `SKU-${Date.now()}`,
        barcode: formData.barcode || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        selling_price: parseFloat(formData.selling_price) || 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : null,
        reorder_point: parseInt(formData.reorder_point) || 0,
        reorder_quantity: formData.reorder_quantity ? parseInt(formData.reorder_quantity) : null,
        supplier_name: formData.supplier_name || null,
        supplier_contact: formData.supplier_contact || null,
        unit_of_measure: formData.unit_of_measure,
        is_active: true,
        is_featured: formData.is_featured,
        image_url: null,
        weight_kg: null,
      }

      const result = await createProduct(productData)
      if (result.success) {
        toast.success('Product created successfully')
        setIsAddDialogOpen(false)
        resetForm()
        loadStoreData(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to create product')
      }
    } catch (error) {
      toast.error('An error occurred while creating the product')
    }
  }

  const handleEditProduct = async () => {
    if (!selectedProduct) return

    try {
      const updates = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || null,
        description: formData.description || null,
        category_id: formData.category_id || null,
        selling_price: parseFloat(formData.selling_price) || 0,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : null,
        reorder_point: parseInt(formData.reorder_point) || 0,
        reorder_quantity: formData.reorder_quantity ? parseInt(formData.reorder_quantity) : null,
        supplier_name: formData.supplier_name || null,
        supplier_contact: formData.supplier_contact || null,
        unit_of_measure: formData.unit_of_measure,
        is_featured: formData.is_featured,
      }

      const result = await updateProduct(selectedProduct.id, updates)
      if (result.success) {
        toast.success('Product updated successfully')
        setIsEditDialogOpen(false)
        setSelectedProduct(null)
        resetForm()
        loadStoreData(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to update product')
      }
    } catch (error) {
      toast.error('An error occurred while updating the product')
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const result = await deleteProduct(selectedProduct.id)
      if (result.success) {
        toast.success('Product deleted successfully')
        setIsDeleteDialogOpen(false)
        setSelectedProduct(null)
        loadStoreData(selectedStoreId)
      } else {
        toast.error(result.error || 'Failed to delete product')
      }
    } catch (error) {
      toast.error('An error occurred while deleting the product')
    }
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      description: product.description || '',
      category_id: product.category_id || '',
      selling_price: product.selling_price.toString(),
      cost_price: product.cost_price?.toString() || '',
      tax_rate: product.tax_rate.toString(),
      min_stock_level: product.min_stock_level.toString(),
      max_stock_level: product.max_stock_level?.toString() || '',
      reorder_point: product.reorder_point.toString(),
      reorder_quantity: product.reorder_quantity?.toString() || '',
      supplier_name: product.supplier_name || '',
      supplier_contact: product.supplier_contact || '',
      unit_of_measure: product.unit_of_measure,
      is_featured: product.is_featured,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  // Filter products
  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true
    return matchesSearch && matchesCategory
  })

  // Get total inventory across all locations for a product
  const getProductInventory = (productId: string) => {
    const items = (inventory || []).filter((inv) => inv.product_id === productId)
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalReserved = items.reduce((sum, item) => sum + item.reserved_quantity, 0)
    const totalAvailable = items.reduce((sum, item) => sum + item.available_quantity, 0)

    return {
      quantity: totalQuantity,
      reserved_quantity: totalReserved,
      available_quantity: totalAvailable,
      location_count: items.length,
    }
  }

  // Calculate stock status based on available inventory
  const getStockStatus = (product: Product, invData?: { available_quantity: number }) => {
    const availableQty = invData?.available_quantity || 0
    if (availableQty <= 0) return { label: 'Out of Stock', variant: 'destructive' as const, className: '' }
    if (availableQty <= product.reorder_point) return { label: 'Low Stock', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { label: 'In Stock', variant: 'default' as const, className: '' }
  }

  return (
    <div className="space-y-6">
      {/* Store Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select Store</CardTitle>
          <CardDescription>Choose which store to manage products for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stores.map((store) => (
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
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(products || []).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products || []).filter((p) => {
                const inv = getProductInventory(p.id)
                const qty = inv.available_quantity
                return qty > 0 && qty <= p.reorder_point
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(products || []).filter((p) => {
                const inv = getProductInventory(p.id)
                return inv.available_quantity <= 0
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Manage your product catalog</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select
                value={selectedCategory || 'all'}
                onValueChange={(value) => setSelectedCategory(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {(categories || []).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Create a new product in your catalog
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct}>Create Product</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (filteredProducts || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || selectedCategory
                ? 'No products match your filters'
                : 'No products yet. Click "Add Product" to create one.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const invData = getProductInventory(product.id)
                    const stockStatus = getStockStatus(product, invData)
                    const locationLabel = invData.location_count > 1 ? `(${invData.location_count} locations)` : ''
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge
                              style={{
                                backgroundColor: product.category.color_code || undefined,
                              }}
                            >
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>${product.selling_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{invData.available_quantity}</span>
                            {locationLabel && (
                              <span className="text-xs text-muted-foreground">{locationLabel}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant} className={stockStatus.className}>{stockStatus.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(product)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(product)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          <ProductForm formData={formData} setFormData={setFormData} categories={categories} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Product Form Component
interface ProductFormProps {
  formData: {
    name: string
    sku: string
    barcode: string
    description: string
    category_id: string
    selling_price: string
    cost_price: string
    tax_rate: string
    min_stock_level: string
    max_stock_level: string
    reorder_point: string
    reorder_quantity: string
    supplier_name: string
    supplier_contact: string
    unit_of_measure: string
    is_featured: boolean
  }
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string
      sku: string
      barcode: string
      description: string
      category_id: string
      selling_price: string
      cost_price: string
      tax_rate: string
      min_stock_level: string
      max_stock_level: string
      reorder_point: string
      reorder_quantity: string
      supplier_name: string
      supplier_contact: string
      unit_of_measure: string
      is_featured: boolean
    }>
  >
  categories: ProductCategory[]
}

function ProductForm({ formData, setFormData, categories }: ProductFormProps) {
  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Product name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => updateField('sku', e.target.value)}
            placeholder="Stock keeping unit"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input
            id="barcode"
            value={formData.barcode}
            onChange={(e) => updateField('barcode', e.target.value)}
            placeholder="UPC/EAN barcode"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category_id} onValueChange={(v) => updateField('category_id', v || '')}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Product description"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="selling_price">Selling Price *</Label>
          <Input
            id="selling_price"
            type="number"
            step="0.01"
            value={formData.selling_price}
            onChange={(e) => updateField('selling_price', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost_price">Cost Price</Label>
          <Input
            id="cost_price"
            type="number"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) => updateField('cost_price', e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
          <Input
            id="tax_rate"
            type="number"
            step="0.01"
            value={formData.tax_rate}
            onChange={(e) => updateField('tax_rate', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_stock">Min Stock Level</Label>
          <Input
            id="min_stock"
            type="number"
            value={formData.min_stock_level}
            onChange={(e) => updateField('min_stock_level', e.target.value)}
            placeholder="10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorder_point">Reorder Point</Label>
          <Input
            id="reorder_point"
            type="number"
            value={formData.reorder_point}
            onChange={(e) => updateField('reorder_point', e.target.value)}
            placeholder="10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorder_qty">Reorder Qty</Label>
          <Input
            id="reorder_qty"
            type="number"
            value={formData.reorder_quantity}
            onChange={(e) => updateField('reorder_quantity', e.target.value)}
            placeholder="50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier Name</Label>
          <Input
            id="supplier"
            value={formData.supplier_name}
            onChange={(e) => updateField('supplier_name', e.target.value)}
            placeholder="Supplier name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier_contact">Supplier Contact</Label>
          <Input
            id="supplier_contact"
            value={formData.supplier_contact}
            onChange={(e) => updateField('supplier_contact', e.target.value)}
            placeholder="Phone or email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Unit of Measure</Label>
        <Select
          value={formData.unit_of_measure}
          onValueChange={(v) => updateField('unit_of_measure', v || '')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="each">Each</SelectItem>
            <SelectItem value="kg">Kilogram (kg)</SelectItem>
            <SelectItem value="g">Gram (g)</SelectItem>
            <SelectItem value="lb">Pound (lb)</SelectItem>
            <SelectItem value="oz">Ounce (oz)</SelectItem>
            <SelectItem value="liter">Liter (L)</SelectItem>
            <SelectItem value="ml">Milliliter (ml)</SelectItem>
            <SelectItem value="pack">Pack</SelectItem>
            <SelectItem value="case">Case</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
